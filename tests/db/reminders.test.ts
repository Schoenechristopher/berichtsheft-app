/**
 * Montags-Job mit Datenbank (AK-1021 – AK-1025, AK-205): das Beispielszenario „Erinnerung und
 * Information an den Ausbilder“ mit fest gestellter Uhr, doppelte Läufe, deaktivierte Azubis und
 * der Versand der Erinnerung per E-Mail (SMTP-Mock).
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { now, resetClock, setFixedNow } from "@/domain/clock";
import { createEmailAdapter } from "@/lib/notifications/adapters";
import { deliverPendingNotifications } from "@/lib/notifications/outbox";
import { runDueReminders, runWeeklyReminders } from "@/lib/notifications/service";
import { deactivatePerson } from "@/lib/people/service";
import { ensureReportsForTrainee } from "@/lib/reports";
import { startSmtpMock } from "../smtp-mock";
import { createPersons, resetDatabase, testDb } from "./helpers";

const prisma = testDb();
const BASE = "http://localhost:3000";

afterAll(async () => {
  await resetDatabase(prisma);
  await prisma.$disconnect();
});

afterEach(() => {
  resetClock();
});

type Persons = Awaited<ReturnType<typeof createPersons>>;
let persons: Persons;

/**
 * Annas Wochen bis KW 41: Beginn 01.09.2026, KW 36–40 freigegeben, KW 41 (05.–09.10.2026) im
 * Status „Entwurf“. Der Status wird direkt gesetzt – hier geht es nur um die Erinnerung.
 */
beforeEach(async () => {
  await resetDatabase(prisma);
  await prisma.setting.create({ data: { id: 1, federalState: "NW" } });
  setFixedNow("2026-10-09T12:00:00+02:00");
  persons = await createPersons(prisma);
  await ensureReportsForTrainee(prisma, persons.anna.id, now());
  await setStatus([36, 37, 38, 39, 40], "APPROVED");
});

async function setStatus(weeks: number[], status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED") {
  await prisma.weeklyReport.updateMany({
    where: { traineeId: persons.anna.id, isoYear: 2026, isoWeek: { in: weeks } },
    data: { status },
  });
}

/** Montags-Job zum angegebenen Zeitpunkt. */
async function mondayJob(at: string) {
  setFixedNow(at);
  return runWeeklyReminders(prisma, { now: now(), baseUrl: BASE });
}

async function messages(eventKeyPrefix?: string) {
  const rows = await prisma.notification.findMany({
    where: eventKeyPrefix ? { eventKey: { startsWith: eventKeyPrefix } } : {},
    include: { recipient: { select: { name: true } } },
    orderBy: [{ createdAt: "asc" }, { recipient: { name: "asc" } }, { channel: "asc" }],
  });
  return rows.map((row) => ({ ...row, who: `${row.recipient.name}:${row.channel}` }));
}

describe("Erinnerung montags 9:00 Uhr", () => {
  it("Beispielszenario: Erinnerung und Information an den Ausbilder (AK-1021 AK-1022 AK-1024)", async () => {
    // Angenommen Anna ist Bernd zugeordnet und ihr Bericht KW 41 hat den Status „Entwurf“.
    // Wenn es Montag, 12.10.2026, 9:00 Uhr ist …
    await mondayJob("2026-10-12T09:00:00+02:00");
    const first = await messages();
    // … dann erhält Anna eine Erinnerung für KW 41 (über E-Mail und App) …
    expect(first.map((row) => row.who)).toEqual(["Anna:EMAIL", "Anna:APP"]);
    expect(first[0].subject).toBe("Erinnerung: Wochenbericht noch offen – KW 41/2026");
    const kw41 = await prisma.weeklyReport.findFirstOrThrow({ where: { traineeId: persons.anna.id, isoWeek: 41 } });
    expect(first[0].body).toContain(`- KW 41/2026 (05.10.2026 – 09.10.2026): ${BASE}/berichte/${kw41.id}`);
    // … und Bernd erhält keine Nachricht.
    expect(first.some((row) => row.recipient.name === "Bernd")).toBe(false);

    // KW 42 reicht Anna rechtzeitig ein; KW 41 bleibt offen.
    await setStatus([42], "SUBMITTED");
    // Wenn der Bericht am Montag, 19.10.2026, 9:00 Uhr immer noch offen ist …
    await mondayJob("2026-10-19T09:00:00+02:00");
    const second = await messages("reminder:2026-W43");
    const info = await messages("trainer-info:2026-W43");
    // … dann erhält Anna erneut eine Erinnerung …
    expect(second.map((row) => row.who)).toEqual(["Anna:EMAIL", "Anna:APP"]);
    expect(second[0].subject).toBe("Erinnerung: Wochenbericht noch offen – KW 41/2026");
    // … und Bernd wird über die offene KW 41 informiert.
    expect(info.map((row) => row.who)).toEqual(["Bernd:EMAIL", "Bernd:APP"]);
    expect(info[0].subject).toBe("Information: Anna – Wochenbericht überfällig – KW 41/2026");
    expect(info[0].body).toContain(`${BASE}/berichte/${kw41.id}`);
    expect(info[0].link).toBe(`/berichte/${kw41.id}`);
    // Clara (Vertretung) bekommt nichts.
    expect((await messages()).some((row) => row.recipient.name === "Clara")).toBe(false);
  });

  it("AK-1024 jeden Montag erneut bis zur Einreichung, danach nicht mehr", async () => {
    await mondayJob("2026-10-19T09:00:00+02:00");
    await mondayJob("2026-10-26T09:00:00+02:00");
    expect((await messages("trainer-info")).map((row) => row.eventKey)).toEqual([
      `trainer-info:2026-W43:${persons.anna.id}`,
      `trainer-info:2026-W43:${persons.anna.id}`,
      `trainer-info:2026-W44:${persons.anna.id}`,
      `trainer-info:2026-W44:${persons.anna.id}`,
    ]);

    await setStatus([41, 42, 43, 44], "SUBMITTED");
    expect(await mondayJob("2026-11-02T09:00:00+01:00")).toEqual({ created: 0 });
  });

  it("AK-1024 doppelter Job-Lauf am selben Montag erzeugt keine zweite Nachricht", async () => {
    const first = await mondayJob("2026-10-19T09:00:00+02:00");
    expect(first.created).toBe(4);
    const [again, parallel] = await Promise.all([
      mondayJob("2026-10-19T09:00:05+02:00"),
      runWeeklyReminders(prisma, { now: now(), baseUrl: BASE }),
    ]);
    expect(again.created + parallel.created).toBe(0);
    expect(await prisma.notification.count()).toBe(4);
  });

  it("AK-1025 mehrere offene Wochen: eine Erinnerung nennt alle; die neue Woche entsteht vor der Prüfung", async () => {
    await setStatus([38], "REJECTED");
    // Montag 19.10.2026: KW 42 gibt es noch nicht (die Uhr stand bisher in KW 41) – der Job ergänzt sie.
    await mondayJob("2026-10-19T09:00:00+02:00");
    const reminder = (await messages("reminder")).filter((row) => row.channel === "EMAIL");
    expect(reminder).toHaveLength(1);
    expect(reminder[0].subject).toBe("Erinnerung: Wochenberichte noch offen – KW 38/2026, KW 41/2026, KW 42/2026");
    expect(reminder[0].link).toBe("/azubi");
    const info = (await messages("trainer-info")).filter((row) => row.channel === "EMAIL");
    expect(info[0].subject).toBe("Information: Anna – Wochenberichte überfällig – KW 38/2026, KW 41/2026");
    expect(info[0].link).toBe(`/ausbilder/azubis/${persons.anna.id}`);
  });

  it("AK-1023 keine Erinnerung für eingereichte und freigegebene Wochen und die laufende Woche", async () => {
    await setStatus([41], "SUBMITTED");
    // Montag 12.10.: KW 42 ist die laufende Woche (Entwurf) – keine Erinnerung.
    expect(await mondayJob("2026-10-12T09:00:00+02:00")).toEqual({ created: 0 });
  });

  it("AK-205 deaktivierte Azubis erhalten keine Erinnerung, ihr Ausbilder keine Information", async () => {
    expect(await deactivatePerson(prisma, persons.bernd, persons.anna.id)).toMatchObject({ ok: true });
    expect(await mondayJob("2026-10-19T09:00:00+02:00")).toEqual({ created: 0 });
    // AK-205 (Etappe 3): und für sie entstehen keine neuen Wochen.
    expect(await prisma.weeklyReport.count({ where: { traineeId: persons.anna.id, isoWeek: 43 } })).toBe(0);
  });

  it("AK-1013 Anna ohne Kanal: keine Erinnerung; Bernd wird trotzdem informiert", async () => {
    await prisma.person.update({ where: { id: persons.anna.id }, data: { channels: [] } });
    await mondayJob("2026-10-19T09:00:00+02:00");
    expect((await messages()).map((row) => row.who)).toEqual(["Bernd:EMAIL", "Bernd:APP"]);
  });

  it("AK-1021 Erinnerung geht per E-Mail an Anna (SMTP)", async () => {
    await mondayJob("2026-10-12T09:00:00+02:00");
    const smtp = await startSmtpMock();
    try {
      const email = createEmailAdapter({
        host: "127.0.0.1",
        port: smtp.port,
        secure: false,
        from: "berichtsheft@example.test",
      });
      const result = await deliverPendingNotifications(prisma, { EMAIL: email, TEAMS: email }, { now, maxAttempts: 3 });
      expect(result.sent).toBe(1);
      expect(smtp.received.map((mail) => [mail.to, mail.headers.subject])).toEqual([
        [["anna@test.invalid"], "Erinnerung: Wochenbericht noch offen – KW 41/2026"],
      ]);
      expect(smtp.received[0].text).toContain("folgender Wochenbericht ist noch nicht eingereicht:");
    } finally {
      await smtp.close();
    }
  });
});

describe("Verpasste Erinnerung nachholen (bestätigte Auslegung 11)", () => {
  /** Start des Workers bzw. regelmäßige Prüfung zum angegebenen Zeitpunkt. */
  async function workerCheck(at: string) {
    setFixedNow(at);
    return runDueReminders(prisma, { now: now(), baseUrl: BASE });
  }

  it("AK-1021 Start Montag 10:00 Uhr: der verpasste Lauf von 9:00 Uhr wird nachgeholt, Stichtag bleibt Montag", async () => {
    expect(await workerCheck("2026-10-12T10:00:00+02:00")).toEqual({ ran: true, created: 2 });
    const reminder = await messages("reminder:2026-W42");
    expect(reminder.map((row) => row.who)).toEqual(["Anna:EMAIL", "Anna:APP"]);
    expect(reminder[0].subject).toBe("Erinnerung: Wochenbericht noch offen – KW 41/2026");
    expect(await prisma.reminderRun.findMany()).toMatchObject([{ isoYear: 2026, isoWeek: 42, created: 2 }]);
  });

  it("AK-1022 Start Dienstag 23:59 Uhr: Information an den Ausbilder wird mit Stichtag Montag nachgeholt", async () => {
    await setStatus([42], "SUBMITTED");
    expect(await workerCheck("2026-10-20T23:59:00+02:00")).toEqual({ ran: true, created: 4 });
    const info = await messages("trainer-info:2026-W43");
    expect(info[0].body).toContain("Stichtag: 19.10.2026");
  });

  it("AK-1021 Start Mittwoch: nicht mehr nachholen", async () => {
    expect(await workerCheck("2026-10-14T00:00:00+02:00")).toEqual({ ran: false, reason: "nicht-faellig" });
    expect(await workerCheck("2026-10-14T10:00:00+02:00")).toEqual({ ran: false, reason: "nicht-faellig" });
    expect(await prisma.notification.count()).toBe(0);
  });

  it("AK-1021 vor Montag 9:00 Uhr läuft noch nichts", async () => {
    expect(await workerCheck("2026-10-12T08:59:00+02:00")).toEqual({ ran: false, reason: "nicht-faellig" });
  });

  it("AK-1024 zweimal Start am Montag (auch gleichzeitig): nur ein Lauf, keine zweite Nachricht", async () => {
    const [first, parallel] = await Promise.all([
      workerCheck("2026-10-12T10:00:00+02:00"),
      runDueReminders(prisma, { now: now(), baseUrl: BASE }),
    ]);
    expect([first, parallel]).toContainEqual({ ran: true, created: 2 });
    expect([first, parallel]).toContainEqual({ ran: false, reason: "schon-erledigt" });
    expect(await workerCheck("2026-10-12T15:00:00+02:00")).toEqual({ ran: false, reason: "schon-erledigt" });
    expect(await prisma.notification.count()).toBe(2);
  });

  it("AK-1024 pünktlicher Lauf um 9:00 Uhr, danach findet die Prüfung nichts mehr nachzuholen – auch wenn inzwischen eine Woche offen ist", async () => {
    await setStatus([41], "SUBMITTED");
    expect(await workerCheck("2026-10-12T09:00:00+02:00")).toEqual({ ran: true, created: 0 });
    await setStatus([41], "REJECTED");
    expect(await workerCheck("2026-10-12T09:10:00+02:00")).toEqual({ ran: false, reason: "schon-erledigt" });
    expect(await prisma.notification.count()).toBe(0);
    // Am nächsten Montag gilt der neue Stand wieder.
    expect((await workerCheck("2026-10-19T09:00:00+02:00")).ran).toBe(true);
  });
});

describe("Wochennummer eines Erinnerungslaufs", () => {
  const insertRun = (isoWeek: number) =>
    prisma.reminderRun.create({ data: { isoYear: 2026, isoWeek, ranAt: new Date() } });

  it("AK-1024 Woche 0 und 54 werden von der Datenhaltung abgewiesen", async () => {
    await expect(insertRun(0)).rejects.toThrow();
    await expect(insertRun(54)).rejects.toThrow();
    expect(await prisma.reminderRun.count()).toBe(0);
  });

  it("AK-1024 Woche 1 und 53 sind zulässig", async () => {
    await insertRun(1);
    await insertRun(53);
    expect(await prisma.reminderRun.count()).toBe(2);
  });
});
