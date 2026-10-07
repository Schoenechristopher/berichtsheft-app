import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createPersons, resetDatabase, testDb } from "./helpers";

const prisma = testDb();

afterAll(async () => {
  await resetDatabase(prisma);
  await prisma.$disconnect();
});

/** Annas Bericht KW 40/2026: eingereicht von Anna, freigegeben von Clara (Vertretung). */
async function reportWithHistory() {
  const persons = await createPersons(prisma);
  const report = await prisma.weeklyReport.create({
    data: { traineeId: persons.anna.id, isoYear: 2026, isoWeek: 40, status: "APPROVED", version: 2 },
  });
  const submitted = await prisma.statusChange.create({
    data: { reportId: report.id, fromStatus: "DRAFT", toStatus: "SUBMITTED", actorId: persons.anna.id },
  });
  const approved = await prisma.statusChange.create({
    data: { reportId: report.id, fromStatus: "SUBMITTED", toStatus: "APPROVED", actorId: persons.clara.id },
  });
  return { ...persons, report, submitted, approved };
}

describe("Historie der Statuswechsel ist unveränderlich (Vorbereitung AK-803)", () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it("AK-803 Statuswechsel-Eintrag kann nicht geändert werden", async () => {
    const { approved, bernd } = await reportWithHistory();

    await expect(
      prisma.statusChange.update({ where: { id: approved.id }, data: { reason: "nachträglich geändert" } }),
    ).rejects.toThrow(/unveränderlich/);
    await expect(prisma.statusChange.updateMany({ data: { actorId: bernd.id } })).rejects.toThrow(/unveränderlich/);
    await expect(prisma.$executeRaw`UPDATE status_change SET to_status = 'REJECTED'`).rejects.toThrow(/unveränderlich/);

    const unchanged = await prisma.statusChange.findUniqueOrThrow({ where: { id: approved.id } });
    expect(unchanged).toEqual(approved);
  });

  it("AK-803 Statuswechsel-Eintrag kann nicht gelöscht werden", async () => {
    const { report, approved } = await reportWithHistory();

    await expect(prisma.statusChange.delete({ where: { id: approved.id } })).rejects.toThrow(/unveränderlich/);
    await expect(prisma.statusChange.deleteMany({ where: { reportId: report.id } })).rejects.toThrow(/unveränderlich/);
    await expect(prisma.$executeRaw`DELETE FROM status_change`).rejects.toThrow(/unveränderlich/);

    expect(await prisma.statusChange.count({ where: { reportId: report.id } })).toBe(2);
  });

  it("AK-803 Wochenbericht mit Historie lässt sich nicht einzeln löschen", async () => {
    const { report } = await reportWithHistory();

    await expect(prisma.weeklyReport.delete({ where: { id: report.id } })).rejects.toThrow(
      /nur zusammen mit der Person/,
    );
    expect(await prisma.statusChange.count({ where: { reportId: report.id } })).toBe(2);
  });

  it("AK-803 endgültiges Löschen der Person entfernt Berichte und Historie per Kaskade", async () => {
    const { anna, report } = await reportWithHistory();

    await prisma.person.delete({ where: { id: anna.id } });

    expect(await prisma.weeklyReport.count({ where: { id: report.id } })).toBe(0);
    expect(await prisma.statusChange.count({ where: { reportId: report.id } })).toBe(0);
  });

  it("AK-803 Löschen einer Person mit Einträgen in fremder Historie scheitert", async () => {
    const { clara, report } = await reportWithHistory();

    await expect(prisma.person.delete({ where: { id: clara.id } })).rejects.toThrow();

    expect(await prisma.person.count({ where: { id: clara.id } })).toBe(1);
    expect(await prisma.statusChange.count({ where: { reportId: report.id } })).toBe(2);
  });
});

describe("Datenbank-Regeln des Datenmodells", () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it("Azubi ohne Ausbilder oder ohne Ausbildungsbeginn wird von der Datenbank abgewiesen", async () => {
    const { bernd } = await createPersons(prisma);

    await expect(
      prisma.person.create({
        data: {
          accountId: "x1",
          email: "x1@test.invalid",
          name: "X",
          role: "TRAINEE",
          trainingStart: new Date("2026-09-01T00:00:00Z"),
        },
      }),
    ).rejects.toThrow(/person_trainee_requires_trainer_and_start/);
    await expect(
      prisma.person.create({
        data: { accountId: "x2", email: "x2@test.invalid", name: "X", role: "TRAINEE", trainerId: bernd.id },
      }),
    ).rejects.toThrow(/person_trainee_requires_trainer_and_start/);
  });

  it("pro Azubi und Woche gibt es höchstens einen Wochenbericht", async () => {
    const { anna } = await createPersons(prisma);
    await prisma.weeklyReport.create({ data: { traineeId: anna.id, isoYear: 2026, isoWeek: 41 } });

    await expect(
      prisma.weeklyReport.create({ data: { traineeId: anna.id, isoYear: 2026, isoWeek: 41 } }),
    ).rejects.toThrow();
  });

  it("neue Personen haben die Kanäle E-Mail und App voreingestellt", async () => {
    const { clara } = await createPersons(prisma);
    expect(clara.channels).toEqual(["EMAIL", "APP"]);
  });

  it("Benachrichtigung ist pro Ereignis, Empfänger und Kanal eindeutig", async () => {
    const { anna } = await createPersons(prisma);
    const data = { eventKey: "test:1", recipientId: anna.id, channel: "EMAIL" as const, subject: "s", body: "b" };
    await prisma.notification.create({ data });

    await expect(prisma.notification.create({ data })).rejects.toThrow();
    // Kanal „App“: kein Versand, die Zeile gilt beim Anlegen als zugestellt (Etappe 6).
    await expect(prisma.notification.create({ data: { ...data, channel: "APP" } })).rejects.toThrow();
    await prisma.notification.create({ data: { ...data, channel: "APP", sentAt: new Date() } });
    expect(await prisma.notification.count()).toBe(2);
  });
});
