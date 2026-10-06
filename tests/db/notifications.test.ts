/**
 * Benachrichtigungen mit Datenbank (AK-1001 – AK-1004, AK-1011 – AK-1015): Outbox in derselben
 * Transaktion wie der Statuswechsel, Kanäle zum Zeitpunkt des Ereignisses, Glocke, Versand genau
 * einmal – auch mit zwei parallelen Worker-Durchläufen – und E-Mail über echtes SMTP (Mock-Server).
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { now, resetClock, setFixedNow } from "@/domain/clock";
import { createPerson } from "@/lib/people/service";
import {
  createDevMailboxAdapter,
  createEmailAdapter,
  messageIdFor,
  type ChannelAdapter,
  type DeliveryAdapters,
  type OutgoingMessage,
} from "@/lib/notifications/adapters";
import { RECIPIENT_INACTIVE, deliverPendingNotifications } from "@/lib/notifications/outbox";
import { countUnread, openNotifications, updateOwnChannels } from "@/lib/notifications/service";
import { transitionReport, type TransitionInput } from "@/lib/report-transitions";
import { ensureReportsForTrainee, listTraineeWeeks, loadReportHistory } from "@/lib/reports";
import { startSmtpMock, type SmtpMock } from "../smtp-mock";
import { createPersons, resetDatabase, testDb } from "./helpers";

const prisma = testDb();

afterAll(async () => {
  await resetDatabase(prisma);
  await prisma.$disconnect();
});

afterEach(() => {
  resetClock();
});

type Persons = Awaited<ReturnType<typeof createPersons>>;
let persons: Persons;

beforeEach(async () => {
  await resetDatabase(prisma);
  await prisma.setting.create({ data: { id: 1, federalState: "NW" } });
  setFixedNow("2026-10-06T10:00:00+02:00");
  persons = await createPersons(prisma);
  await ensureReportsForTrainee(prisma, persons.anna.id, now());
});

/** Annas Bericht einer Woche 2026, alle Tage „Betrieb“ mit Text. */
async function filledReport(isoWeek: number) {
  const report = await prisma.weeklyReport.findUniqueOrThrow({
    where: { traineeId_isoYear_isoWeek: { traineeId: persons.anna.id, isoYear: 2026, isoWeek } },
  });
  await prisma.reportDay.updateMany({
    where: { reportId: report.id, outsideTraining: false },
    data: { dayType: "WORK", activities: "Netzwerk geplant" },
  });
  return report;
}

async function act(
  person: { id: string; role: "TRAINEE" | "TRAINER"; active: boolean },
  reportId: string,
  input: TransitionInput,
) {
  const result = await transitionReport(prisma, person, reportId, input);
  expect(result.ok).toBe(true);
  return result;
}

/** Outbox als lesbare Liste „Name:Kanal“. */
async function outbox(where: { eventKey?: { startsWith: string } } = {}) {
  const rows = await prisma.notification.findMany({
    where,
    include: { recipient: { select: { name: true } } },
    orderBy: [{ createdAt: "asc" }, { recipient: { name: "asc" } }, { channel: "asc" }],
  });
  return rows.map((row) => ({ ...row, who: `${row.recipient.name}:${row.channel}` }));
}

describe("Outbox bei Statuswechseln (AK-1001 – AK-1003)", () => {
  it("AK-1001 Einreichen benachrichtigt den zugeordneten Ausbilder (E-Mail + App), die Vertretung nicht", async () => {
    const report = await filledReport(40);
    await act(persons.anna, report.id, { action: "SUBMIT" });

    const rows = await outbox();
    expect(rows.map((row) => row.who)).toEqual(["Bernd:EMAIL", "Bernd:APP"]);
    const change = await prisma.statusChange.findFirstOrThrow({ where: { reportId: report.id } });
    expect(rows.every((row) => row.eventKey === `status-change:${change.id}` && row.reportId === report.id)).toBe(true);
    // App: die Zeile ist die Benachrichtigung (gleich zugestellt); E-Mail wartet auf den Worker.
    expect(rows.find((row) => row.channel === "APP")?.sentAt).toEqual(now());
    expect(rows.find((row) => row.channel === "EMAIL")?.sentAt).toBeNull();
  });

  it("AK-1002 Freigabe (Vertretung), Ablehnung und Rücknahme benachrichtigen den Azubi", async () => {
    const approved = await filledReport(39);
    await act(persons.anna, approved.id, { action: "SUBMIT" });
    await act(persons.clara, approved.id, { action: "APPROVE" });
    const rejected = await filledReport(40);
    await act(persons.anna, rejected.id, { action: "SUBMIT" });
    await act(persons.bernd, rejected.id, { action: "REJECT", text: "Bitte genauer." });

    const toAnna = (await outbox()).filter((row) => row.recipient.name === "Anna" && row.channel === "EMAIL");
    expect(toAnna.map((row) => row.subject).sort()).toEqual([
      "Bericht abgelehnt: Anna, KW 40/2026",
      "Bericht freigegeben: Anna, KW 39/2026",
    ]);
    const [rejectedMail, approvedMail] = [...toAnna].sort((a, b) => a.subject.localeCompare(b.subject));
    expect(approvedMail.body).toContain(
      "Clara hat Ihren Wochenbericht KW 39/2026 (21.09.2026 – 25.09.2026) freigegeben.",
    );
    // Kommentare stehen im Bericht, nicht in der Nachricht (Vorschlag).
    expect(rejectedMail.body).not.toContain("Bitte genauer.");
  });

  it("AK-1003 Inhalt: Azubi, Woche, Anlass und Link auf den Bericht (Basis-URL aus APP_URL)", async () => {
    const report = await filledReport(40);
    await act(persons.anna, report.id, { action: "SUBMIT" });
    const [email] = await outbox();
    expect(email.subject).toBe("Bericht eingereicht: Anna, KW 40/2026");
    expect(email.body).toContain("Azubi: Anna");
    expect(email.body).toContain("Woche: KW 40/2026 (28.09.2026 – 02.10.2026)");
    expect(email.body).toContain("Anlass: Bericht eingereicht");
    expect(email.body).toMatch(new RegExp(`Zum Bericht: https?://[^/\\s]+/berichte/${report.id}`));
    expect(email.link).toBe(`/berichte/${report.id}`);
  });

  it("AK-1004 gescheiterter Statuswechsel erzeugt keine Benachrichtigung; Zurückziehen keine (Vorschlag)", async () => {
    const report = await filledReport(40);
    await act(persons.anna, report.id, { action: "SUBMIT" });
    const failed = await transitionReport(prisma, persons.bernd, report.id, { action: "REJECT", text: " " });
    expect(failed.ok).toBe(false);
    await act(persons.anna, report.id, { action: "WITHDRAW" });
    expect((await outbox()).map((row) => row.who)).toEqual(["Bernd:EMAIL", "Bernd:APP"]);
  });

  it("Beispielszenario: Vertretung nimmt Freigabe zurück – Anna wird über ihre gewählten Kanäle benachrichtigt", async () => {
    // Anna hat E-Mail und Teams gewählt, App nicht.
    expect(await updateOwnChannels(prisma, persons.anna, ["EMAIL", "TEAMS"])).toEqual({ ok: true });
    const report = await filledReport(40);
    await act(persons.anna, report.id, { action: "SUBMIT" });
    await act(persons.bernd, report.id, { action: "APPROVE" });
    // Wenn Clara (nicht zugeordnet) die Freigabe mit Begründung zurücknimmt …
    await act(persons.clara, report.id, { action: "REVOKE_APPROVAL", text: "Mittwoch falsches Datum" });

    // … dann hat der Bericht den Status „Abgelehnt“ …
    expect((await prisma.weeklyReport.findUniqueOrThrow({ where: { id: report.id } })).status).toBe("REJECTED");
    // … und Anna erhält eine Benachrichtigung über ihre gewählten Kanäle.
    const revoked = (await outbox()).filter((row) => row.subject.startsWith("Freigabe zurückgenommen"));
    expect(revoked.map((row) => row.who)).toEqual(["Anna:EMAIL", "Anna:TEAMS"]);
    expect(revoked[0].body).toContain("Clara hat die Freigabe Ihres Wochenberichts KW 40/2026");
    // Und die Historie zeigt Bernds Freigabe und Claras Rücknahme mit Begründung.
    const { changes } = await loadReportHistory(prisma, report.id);
    expect(changes.map((change) => [change.toStatus, change.actorName, change.reason])).toEqual([
      ["SUBMITTED", "Anna", null],
      ["APPROVED", "Bernd", null],
      ["REJECTED", "Clara", "Mittwoch falsches Datum"],
    ]);
    // Bernd wurde nur über die Einreichung benachrichtigt, Clara gar nicht.
    expect((await outbox()).filter((row) => row.recipient.name !== "Anna").map((row) => row.who)).toEqual([
      "Bernd:EMAIL",
      "Bernd:APP",
    ]);
  });
});

describe("Kanäle (AK-1011 – AK-1014)", () => {
  it("AK-1011 jede Person kann E-Mail, Teams und App beliebig kombinieren, auch alle abwählen", async () => {
    for (const channels of [["TEAMS"], ["EMAIL", "TEAMS", "APP"], ["APP", "EMAIL"], []]) {
      expect(await updateOwnChannels(prisma, persons.anna, channels)).toEqual({ ok: true });
      const stored = await prisma.person.findUniqueOrThrow({ where: { id: persons.anna.id } });
      expect([...stored.channels].sort()).toEqual([...channels].sort());
    }
    expect(await updateOwnChannels(prisma, persons.anna, ["SMS"])).toEqual({
      ok: false,
      formError: "Unbekannter Kanal.",
    });
    expect(await updateOwnChannels(prisma, { ...persons.anna, active: false }, ["APP"])).toMatchObject({ ok: false });
    // Nur die eigenen Kanäle: Bernd bleibt unverändert.
    expect((await prisma.person.findUniqueOrThrow({ where: { id: persons.bernd.id } })).channels).toEqual([
      "EMAIL",
      "APP",
    ]);
  });

  it("AK-1012 neue Personen haben die Voreinstellung E-Mail + App", async () => {
    const result = await createPerson(prisma, persons.bernd, {
      name: "Fritz",
      email: "fritz@test.invalid",
      role: "TRAINER",
    });
    expect(result).toMatchObject({ ok: true });
    expect((await prisma.person.findUniqueOrThrow({ where: { email: "fritz@test.invalid" } })).channels).toEqual([
      "EMAIL",
      "APP",
    ]);
  });

  it("AK-1013 ohne Kanal geht keine Nachricht raus; der Status bleibt in der App sichtbar", async () => {
    await updateOwnChannels(prisma, persons.anna, []);
    const report = await filledReport(40);
    await act(persons.anna, report.id, { action: "SUBMIT" });
    await act(persons.bernd, report.id, { action: "APPROVE" });

    expect((await outbox()).filter((row) => row.recipient.name === "Anna")).toEqual([]);
    const overview = await listTraineeWeeks(prisma, persons.anna, persons.anna.id, now());
    expect(overview?.reports.find((week) => week.id === report.id)?.status).toBe("APPROVED");
  });

  it("AK-1014 geänderte Kanäle gelten ab dem nächsten Ereignis; schon angelegte Nachrichten bleiben", async () => {
    const report = await filledReport(40);
    await act(persons.anna, report.id, { action: "SUBMIT" });
    await updateOwnChannels(prisma, persons.bernd, ["TEAMS"]);
    await act(persons.anna, report.id, { action: "WITHDRAW" });
    await act(persons.anna, report.id, { action: "SUBMIT" });

    const rows = await outbox();
    const events = [...new Set(rows.map((row) => row.eventKey))];
    expect(events).toHaveLength(2);
    expect(rows.filter((row) => row.eventKey === events[0]).map((row) => row.who)).toEqual([
      "Bernd:EMAIL",
      "Bernd:APP",
    ]);
    expect(rows.filter((row) => row.eventKey === events[1]).map((row) => row.who)).toEqual(["Bernd:TEAMS"]);
  });
});

describe("Glocke (AK-1015)", () => {
  it("AK-1015 ungelesene App-Benachrichtigungen mit Zähler; nach dem Öffnen gelten sie als gelesen", async () => {
    await act(persons.anna, (await filledReport(39)).id, { action: "SUBMIT" });
    setFixedNow("2026-10-06T11:00:00+02:00");
    await act(persons.anna, (await filledReport(40)).id, { action: "SUBMIT" });
    expect(await countUnread(prisma, persons.bernd.id)).toBe(2);
    expect(await countUnread(prisma, persons.clara.id)).toBe(0);

    setFixedNow("2026-10-06T12:00:00+02:00");
    const opened = await openNotifications(prisma, persons.bernd.id, now());
    expect(opened.map((item) => [item.subject, item.unread])).toEqual([
      ["Bericht eingereicht: Anna, KW 40/2026", true],
      ["Bericht eingereicht: Anna, KW 39/2026", true],
    ]);
    expect(opened[0].link).toMatch(/^\/berichte\//);
    expect(await countUnread(prisma, persons.bernd.id)).toBe(0);
    const stored = await prisma.notification.findMany({ where: { recipientId: persons.bernd.id, channel: "APP" } });
    expect(stored.every((row) => row.readAt?.getTime() === now().getTime())).toBe(true);
    // E-Mail-Zeilen zählen nicht für die Glocke und werden nicht als gelesen markiert.
    expect(await prisma.notification.count({ where: { channel: "EMAIL", readAt: { not: null } } })).toBe(0);

    expect((await openNotifications(prisma, persons.bernd.id, now())).map((item) => item.unread)).toEqual([
      false,
      false,
    ]);
  });
});

// ---------------------------------------------------------------------------
// Versand im Worker (AK-1004)
// ---------------------------------------------------------------------------

/** Adapter, der jede Zustellung mitschreibt; optional mit Verzögerung oder Fehlern. */
function recordingAdapter(options: { delayMs?: number; failTimes?: number } = {}) {
  const sent: OutgoingMessage[] = [];
  let failures = options.failTimes ?? 0;
  const adapter: ChannelAdapter = {
    async send(message) {
      if (options.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }
      if (failures > 0) {
        failures--;
        throw new Error("Server nicht erreichbar");
      }
      sent.push(message);
    },
  };
  return { adapter, sent };
}

function adapters(email: ChannelAdapter, teams: ChannelAdapter = email): DeliveryAdapters {
  return { EMAIL: email, TEAMS: teams };
}

const deliveryOptions = { now, maxAttempts: 3 };

/** Mehrere Ereignisse mit E-Mail und Teams für Bernd. */
async function createPendingMessages() {
  await updateOwnChannels(prisma, persons.bernd, ["EMAIL", "TEAMS", "APP"]);
  for (const isoWeek of [37, 38, 39, 40]) {
    await act(persons.anna, (await filledReport(isoWeek)).id, { action: "SUBMIT" });
  }
  return prisma.notification.findMany({ where: { channel: { not: "APP" } } });
}

describe("Versand genau einmal (AK-1004)", () => {
  it("AK-1004 zwei parallele Worker-Durchläufe versenden jede Nachricht genau einmal", async () => {
    const pending = await createPendingMessages();
    expect(pending).toHaveLength(8);
    const secondWorker = testDb();
    try {
      const { adapter, sent } = recordingAdapter({ delayMs: 20 });
      const results = await Promise.all([
        deliverPendingNotifications(prisma, adapters(adapter), deliveryOptions),
        deliverPendingNotifications(secondWorker, adapters(adapter), deliveryOptions),
      ]);

      expect(sent.map((message) => message.notificationId).sort()).toEqual(pending.map((row) => row.id).sort());
      expect(results[0].sent + results[1].sent).toBe(8);
      // Beide Worker haben gearbeitet – parallel, ohne sich gegenseitig zu blockieren.
      expect(results[0].sent).toBeGreaterThan(0);
      expect(results[1].sent).toBeGreaterThan(0);
      const rows = await prisma.notification.findMany({ where: { channel: { not: "APP" } } });
      expect(rows.every((row) => row.sentAt !== null && row.attempts === 1)).toBe(true);

      // Ein weiterer Durchlauf findet nichts mehr.
      expect(await deliverPendingNotifications(prisma, adapters(adapter), deliveryOptions)).toEqual({
        sent: 0,
        retried: 0,
        failed: 0,
      });
      expect(sent).toHaveLength(8);
    } finally {
      await secondWorker.$disconnect();
    }
  });

  it("AK-1004 das Ereignis lässt sich nicht doppelt in die Outbox schreiben", async () => {
    await act(persons.anna, (await filledReport(40)).id, { action: "SUBMIT" });
    const [row] = await prisma.notification.findMany({ where: { channel: "EMAIL" } });
    await expect(
      prisma.notification.create({
        data: { eventKey: row.eventKey, recipientId: row.recipientId, channel: "EMAIL", subject: "x", body: "x" },
      }),
    ).rejects.toThrow();
  });

  it("AK-1004 Fehlversuch wird nach Wartezeit wiederholt, ohne Duplikat; nach zu vielen Fehlern aufgegeben", async () => {
    await act(persons.anna, (await filledReport(40)).id, { action: "SUBMIT" });
    const { adapter, sent } = recordingAdapter({ failTimes: 1 });

    expect(await deliverPendingNotifications(prisma, adapters(adapter), deliveryOptions)).toEqual({
      sent: 0,
      retried: 1,
      failed: 0,
    });
    const afterFailure = await prisma.notification.findFirstOrThrow({ where: { channel: "EMAIL" } });
    expect(afterFailure).toMatchObject({ attempts: 1, sentAt: null, lastError: "Server nicht erreichbar" });
    expect(afterFailure.nextAttemptAt.getTime() - now().getTime()).toBe(30_000);

    // Vor Ablauf der Wartezeit passiert nichts.
    expect((await deliverPendingNotifications(prisma, adapters(adapter), deliveryOptions)).retried).toBe(0);
    setFixedNow("2026-10-06T10:00:30+02:00");
    expect((await deliverPendingNotifications(prisma, adapters(adapter), deliveryOptions)).sent).toBe(1);
    expect(sent).toHaveLength(1);
    expect(await prisma.notification.findFirstOrThrow({ where: { channel: "EMAIL" } })).toMatchObject({
      attempts: 2,
      lastError: null,
    });

    // Dauerhafter Fehler: nach maxAttempts aufgegeben, nicht endlos wiederholt.
    await act(persons.anna, (await filledReport(39)).id, { action: "SUBMIT" });
    const broken = recordingAdapter({ failTimes: 99 }).adapter;
    for (const at of ["10:01:00", "10:02:00", "10:05:00"]) {
      setFixedNow(`2026-10-06T${at}+02:00`);
      await deliverPendingNotifications(prisma, adapters(broken), deliveryOptions);
    }
    const givenUp = await prisma.notification.findFirstOrThrow({ where: { channel: "EMAIL", sentAt: null } });
    expect(givenUp.attempts).toBe(3);
    expect(givenUp.failedAt).not.toBeNull();
    setFixedNow("2026-10-07T10:00:00+02:00");
    expect(await deliverPendingNotifications(prisma, adapters(broken), deliveryOptions)).toEqual({
      sent: 0,
      retried: 0,
      failed: 0,
    });
  });

  it("AK-1004 Absturz zwischen Senden und Markieren: Wiederholung legt im Teams-Postfach keine zweite Nachricht an", async () => {
    await updateOwnChannels(prisma, persons.bernd, ["TEAMS"]);
    await act(persons.anna, (await filledReport(40)).id, { action: "SUBMIT" });
    const mailbox = createDevMailboxAdapter(prisma);
    // Erster Versuch: Nachricht ist zugestellt, dann bricht der Lauf vor dem Markieren ab.
    const crashing: ChannelAdapter = {
      async send(message) {
        await mailbox.send(message);
        throw new Error("Absturz vor dem Markieren");
      },
    };
    await deliverPendingNotifications(prisma, adapters(crashing), deliveryOptions);
    setFixedNow("2026-10-06T10:05:00+02:00");
    expect((await deliverPendingNotifications(prisma, adapters(mailbox), deliveryOptions)).sent).toBe(1);

    const messages = await prisma.teamsDevMessage.findMany();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      recipientId: persons.bernd.id,
      subject: "Bericht eingereicht: Anna, KW 40/2026",
    });
  });

  it("AK-1004 Empfänger inzwischen deaktiviert: Nachricht wird nicht versendet (Vorschlag)", async () => {
    await act(persons.anna, (await filledReport(40)).id, { action: "SUBMIT" });
    await prisma.person.update({ where: { id: persons.bernd.id }, data: { active: false } });
    const { adapter, sent } = recordingAdapter();

    expect((await deliverPendingNotifications(prisma, adapters(adapter), deliveryOptions)).failed).toBe(1);
    expect(sent).toEqual([]);
    expect(await prisma.notification.findFirstOrThrow({ where: { channel: "EMAIL" } })).toMatchObject({
      sentAt: null,
      lastError: RECIPIENT_INACTIVE,
    });
  });
});

describe("E-Mail über SMTP (AK-1003, AK-1004)", () => {
  let smtp: SmtpMock;

  beforeEach(async () => {
    smtp = await startSmtpMock();
  });

  afterEach(async () => {
    await smtp.close();
  });

  const from = "Berichtsheft <berichtsheft@example.test>";
  const emailAdapter = () => createEmailAdapter({ host: "127.0.0.1", port: smtp.port, secure: false, from });

  it("AK-1003 E-Mail an den Empfänger: deutscher Text, Betreff mit Anlass und Woche, Link zum Bericht", async () => {
    const report = await filledReport(40);
    await act(persons.anna, report.id, { action: "SUBMIT" });
    const teams = recordingAdapter();

    const result = await deliverPendingNotifications(prisma, adapters(emailAdapter(), teams.adapter), deliveryOptions);

    expect(result.sent).toBe(1);
    expect(smtp.received).toHaveLength(1);
    const [mail] = smtp.received;
    expect(mail.to).toEqual(["bernd@test.invalid"]);
    expect(mail.from).toBe("berichtsheft@example.test");
    expect(mail.headers.subject).toBe("Bericht eingereicht: Anna, KW 40/2026");
    expect(mail.text).toContain("Hallo Bernd,");
    expect(mail.text).toContain("Anna hat den Wochenbericht KW 40/2026 (28.09.2026 – 02.10.2026) eingereicht.");
    expect(mail.text).toMatch(new RegExp(`Zum Bericht: https?://\\S+/berichte/${report.id}`));
    const notification = await prisma.notification.findFirstOrThrow({ where: { channel: "EMAIL" } });
    expect(mail.headers["message-id"]).toBe(messageIdFor(notification.id, from));
    expect(mail.headers["message-id"]).toBe(`<notification-${notification.id}@example.test>`);
  });

  it("AK-1004 SMTP lehnt vorübergehend ab (451): später genau eine E-Mail mit derselben Message-ID", async () => {
    await act(persons.anna, (await filledReport(40)).id, { action: "SUBMIT" });
    smtp.failNext(1);
    expect((await deliverPendingNotifications(prisma, adapters(emailAdapter()), deliveryOptions)).retried).toBe(1);
    expect(smtp.received).toHaveLength(0);

    setFixedNow("2026-10-06T10:01:00+02:00");
    expect((await deliverPendingNotifications(prisma, adapters(emailAdapter()), deliveryOptions)).sent).toBe(1);
    expect(smtp.received).toHaveLength(1);
    expect(smtp.received[0].headers["message-id"]).toMatch(/^<notification-[0-9a-f-]+@example\.test>$/);
  });
});
