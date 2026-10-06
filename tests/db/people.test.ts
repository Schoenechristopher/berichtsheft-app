import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { resolveLoginPerson } from "@/lib/auth/login";
import {
  createPerson,
  deactivatePerson,
  deletePerson,
  getFederalState,
  hasForeignHistory,
  listActiveTrainees,
  reactivatePerson,
  updateFederalState,
  updatePerson,
} from "@/lib/people/service";
import { listVisibleReports } from "@/lib/reports";
import { createPersons, resetDatabase, testDb } from "./helpers";

const prisma = testDb();

afterAll(async () => {
  await resetDatabase(prisma);
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
});

const emil = {
  name: "Emil Neu",
  email: "EMIL@Firma.test",
  role: "TRAINEE",
  trainingStart: "2026-09-01",
  trainingEnd: "",
};

/** Bericht mit Historie: eingereicht vom Azubi, freigegeben von `approverId`. */
async function reportWithHistory(traineeId: string, approverId: string, isoWeek = 40) {
  const report = await prisma.weeklyReport.create({
    data: { traineeId, isoYear: 2026, isoWeek, status: "APPROVED", version: 2 },
  });
  await prisma.statusChange.create({
    data: { reportId: report.id, fromStatus: "DRAFT", toStatus: "SUBMITTED", actorId: traineeId },
  });
  await prisma.statusChange.create({
    data: { reportId: report.id, fromStatus: "SUBMITTED", toStatus: "APPROVED", actorId: approverId },
  });
  return report;
}

describe("Nutzerverwaltung auf dem Server", () => {
  it("AK-201 Admin legt Person über die Firmen-E-Mail an, noch ohne Konto-ID", async () => {
    const { bernd } = await createPersons(prisma);

    const result = await createPerson(prisma, bernd, { ...emil, trainerId: bernd.id });

    expect(result).toMatchObject({ ok: true });
    const person = await prisma.person.findUniqueOrThrow({ where: { email: "emil@firma.test" } });
    expect(person).toMatchObject({ name: "Emil Neu", role: "TRAINEE", accountId: null, active: true });
    expect(person.trainerId).toBe(bernd.id);
    expect(person.channels).toEqual(["EMAIL", "APP"]);

    const trainer = await createPerson(prisma, bernd, { name: "Fritz", email: "fritz@firma.test", role: "TRAINER" });
    expect(trainer).toMatchObject({ ok: true });
  });

  it("AK-201 dieselbe Firmen-E-Mail (andere Schreibweise) gibt es nur einmal", async () => {
    const { bernd } = await createPersons(prisma);
    const result = await createPerson(prisma, bernd, {
      name: "Anna Doppelt",
      email: "ANNA@test.invalid",
      role: "TRAINER",
    });
    expect(result).toEqual({
      ok: false,
      fieldErrors: { email: "Diese Firmen-E-Mail gehört bereits zu einer anderen Person." },
    });
  });

  it("AK-202 Azubi ohne Ausbilder und Beginn wird nicht gespeichert, Meldung nennt die Felder", async () => {
    const { bernd } = await createPersons(prisma);

    const result = await createPerson(prisma, bernd, { ...emil, trainingStart: "" });

    expect(result).toEqual({
      ok: false,
      fieldErrors: { trainerId: "Zugeordneter Ausbilder fehlt.", trainingStart: "Ausbildungsbeginn fehlt." },
    });
    expect(await prisma.person.count({ where: { email: "emil@firma.test" } })).toBe(0);
  });

  it("AK-203 Admin ändert Rolle, Zuordnung sowie Beginn und Ende", async () => {
    const { bernd, clara, anna } = await createPersons(prisma);

    const result = await updatePerson(prisma, bernd, anna.id, {
      name: "Anna Azubi",
      email: anna.email,
      role: "TRAINEE",
      trainerId: clara.id,
      trainingStart: "2026-08-01",
      trainingEnd: "2029-07-31",
    });

    expect(result).toEqual({ ok: true, personId: anna.id });
    const updated = await prisma.person.findUniqueOrThrow({ where: { id: anna.id } });
    expect(updated.trainerId).toBe(clara.id);
    expect(updated.trainingStart?.toISOString().slice(0, 10)).toBe("2026-08-01");
    expect(updated.trainingEnd?.toISOString().slice(0, 10)).toBe("2029-07-31");
    expect(updated.accountId).toBe("test-anna");

    // Azubi → Ausbilder: Zuordnung und Zeitraum entfallen.
    expect(
      await updatePerson(prisma, bernd, anna.id, { name: "Anna Azubi", email: anna.email, role: "TRAINER" }),
    ).toMatchObject({ ok: true });
    expect(await prisma.person.findUniqueOrThrow({ where: { id: anna.id } })).toMatchObject({
      role: "TRAINER",
      trainerId: null,
      trainingStart: null,
    });
  });

  it("AK-203 Ausbilder mit Azubis wird nicht zum Azubi (Meldung am Feld Rolle)", async () => {
    const { bernd, clara } = await createPersons(prisma);
    const result = await updatePerson(prisma, clara, bernd.id, {
      name: bernd.name,
      email: bernd.email,
      role: "TRAINEE",
      trainerId: clara.id,
      trainingStart: "2026-09-01",
    });
    expect(result).toMatchObject({ ok: false, fieldErrors: { role: expect.stringContaining("Anna") } });
    expect((await prisma.person.findUniqueOrThrow({ where: { id: bernd.id } })).role).toBe("TRAINER");
  });

  it("AK-204 Deaktivieren: Login abgewiesen, Berichte für Ausbilder weiter lesbar", async () => {
    const { bernd, clara, anna } = await createPersons(prisma);
    const report = await prisma.weeklyReport.create({ data: { traineeId: anna.id, isoYear: 2026, isoWeek: 40 } });

    expect(await deactivatePerson(prisma, bernd, anna.id)).toEqual({ ok: true, personId: anna.id });

    const login = await resolveLoginPerson(prisma, { accountId: "test-anna", email: null, emailVerified: false });
    expect(login?.active).toBe(false);
    const visible = await listVisibleReports(prisma, clara);
    expect(visible.map((r) => r.id)).toEqual([report.id]);
    expect(visible[0].trainee.active).toBe(false);

    expect(await reactivatePerson(prisma, bernd, anna.id)).toEqual({ ok: true, personId: anna.id });
  });

  it("AK-205 deaktivierte Azubis fehlen in der Abfrage aktiver Azubis", async () => {
    const { bernd, anna } = await createPersons(prisma);
    const otto = await prisma.person.create({
      data: {
        email: "otto@test.invalid",
        name: "Otto",
        role: "TRAINEE",
        trainerId: bernd.id,
        trainingStart: new Date("2026-09-01T00:00:00Z"),
      },
    });
    expect((await listActiveTrainees(prisma)).map((p) => p.name)).toEqual(["Anna", "Otto"]);

    await deactivatePerson(prisma, bernd, otto.id);

    expect((await listActiveTrainees(prisma)).map((p) => p.id)).toEqual([anna.id]);
  });

  it("AK-206 endgültiges Löschen nur mit Namensbestätigung; danach kein Bericht mehr auffindbar", async () => {
    const { bernd, anna } = await createPersons(prisma);
    const report = await reportWithHistory(anna.id, bernd.id);
    await prisma.reportDay.create({ data: { reportId: report.id, date: new Date("2026-09-28T00:00:00Z") } });
    await prisma.comment.create({ data: { reportId: report.id, reviewRound: 1, authorId: bernd.id, text: "gut" } });

    expect(await deletePerson(prisma, bernd, anna.id, "anna")).toEqual({
      ok: false,
      fieldErrors: { confirmName: "Zur Bestätigung bitte genau „Anna“ eintippen." },
    });
    expect(await prisma.person.count({ where: { id: anna.id } })).toBe(1);

    expect(await deletePerson(prisma, bernd, anna.id, " Anna ")).toEqual({ ok: true, personId: anna.id });

    expect(await prisma.person.count({ where: { id: anna.id } })).toBe(0);
    expect(await prisma.weeklyReport.count({ where: { traineeId: anna.id } })).toBe(0);
    expect(await prisma.reportDay.count({ where: { reportId: report.id } })).toBe(0);
    expect(await prisma.statusChange.count({ where: { reportId: report.id } })).toBe(0);
    expect(await prisma.comment.count({ where: { reportId: report.id } })).toBe(0);
  });

  it("AK-206 Person in fremder Historie: verständliche Meldung statt Datenbankfehler, Deaktivieren angeboten", async () => {
    const { bernd, clara, anna } = await createPersons(prisma);
    await reportWithHistory(anna.id, clara.id);
    expect(await hasForeignHistory(prisma, clara.id)).toBe(true);
    expect(await hasForeignHistory(prisma, anna.id)).toBe(false);

    const result = await deletePerson(prisma, bernd, clara.id, "Clara");

    expect(result).toEqual({
      ok: false,
      offerDeactivate: true,
      formError: expect.stringContaining("lässt sich die Person nicht endgültig löschen, sondern nur deaktivieren"),
    });
    expect(await prisma.person.count({ where: { id: clara.id } })).toBe(1);
    expect(await deactivatePerson(prisma, bernd, clara.id)).toMatchObject({ ok: true });
  });

  it("AK-206 auch ein Kommentar an fremdem Bericht zählt als fremde Historie", async () => {
    const { bernd, clara, anna } = await createPersons(prisma);
    const report = await prisma.weeklyReport.create({ data: { traineeId: anna.id, isoYear: 2026, isoWeek: 41 } });
    await prisma.comment.create({ data: { reportId: report.id, reviewRound: 1, authorId: clara.id, text: "Hinweis" } });

    expect(await deletePerson(prisma, bernd, clara.id, "Clara")).toMatchObject({ ok: false, offerDeactivate: true });
  });

  it("AK-207 letzter aktiver Ausbilder: weder deaktivierbar noch löschbar noch herabstufbar", async () => {
    const { bernd, clara, anna } = await createPersons(prisma);
    await updatePerson(prisma, bernd, anna.id, {
      name: anna.name,
      email: anna.email,
      role: "TRAINEE",
      trainerId: clara.id,
      trainingStart: "2026-09-01",
    });
    expect(await deactivatePerson(prisma, clara, bernd.id)).toMatchObject({ ok: true });
    await updatePerson(prisma, clara, anna.id, {
      name: anna.name,
      email: anna.email,
      role: "TRAINEE",
      trainerId: clara.id,
      trainingStart: "2026-09-01",
    });

    // Clara ist jetzt die letzte aktive Ausbilderin.
    expect(await deactivatePerson(prisma, clara, clara.id)).toEqual({
      ok: false,
      formError: "Clara ist der letzte aktive Ausbilder und kann nicht deaktiviert werden.",
    });
    expect(await deletePerson(prisma, clara, clara.id, "Clara")).toMatchObject({
      ok: false,
      formError: "Clara ist der letzte aktive Ausbilder und kann nicht gelöscht werden.",
    });
    expect(
      await updatePerson(prisma, clara, clara.id, {
        name: "Clara",
        email: clara.email,
        role: "TRAINEE",
        trainerId: bernd.id,
        trainingStart: "2026-09-01",
      }),
    ).toMatchObject({ ok: false, fieldErrors: { role: expect.stringContaining("letzte aktive Ausbilder") } });
    expect(await prisma.person.findUniqueOrThrow({ where: { id: clara.id } })).toMatchObject({
      role: "TRAINER",
      active: true,
    });
  });

  it("AK-207 gleichzeitiges Deaktivieren zweier Ausbilder lässt mindestens einen aktiv", async () => {
    const { bernd, clara, anna } = await createPersons(prisma);
    await prisma.person.delete({ where: { id: anna.id } });
    const fritz = await prisma.person.create({
      data: { accountId: "test-fritz", email: "fritz@test.invalid", name: "Fritz", role: "TRAINER" },
    });

    const results = await Promise.all([
      deactivatePerson(prisma, fritz, bernd.id),
      deactivatePerson(prisma, bernd, clara.id),
      deactivatePerson(prisma, clara, fritz.id),
    ]);

    expect(results.some((result) => result.ok)).toBe(true);
    expect(await prisma.person.count({ where: { role: "TRAINER", active: true } })).toBeGreaterThanOrEqual(1);
  });

  it("AK-208 Ausbilder mit zugeordneten Azubis erst nach Neuzuordnung deaktivierbar", async () => {
    const { bernd, clara, anna } = await createPersons(prisma);

    expect(await deactivatePerson(prisma, clara, bernd.id)).toEqual({
      ok: false,
      formError: "Bernd sind noch Azubis zugeordnet (Anna). Bitte diese zuerst einem anderen Ausbilder zuordnen.",
    });

    await updatePerson(prisma, clara, anna.id, {
      name: anna.name,
      email: anna.email,
      role: "TRAINEE",
      trainerId: clara.id,
      trainingStart: "2026-09-01",
    });
    expect(await deactivatePerson(prisma, clara, bernd.id)).toMatchObject({ ok: true });
  });

  it("AK-209 Admin stellt das Bundesland der Firma ein", async () => {
    const { bernd } = await createPersons(prisma);
    expect(await getFederalState(prisma)).toBe("NW");

    expect(await updateFederalState(prisma, bernd, "NI")).toEqual({ ok: true });
    expect(await getFederalState(prisma)).toBe("NI");

    expect(await updateFederalState(prisma, bernd, "XX")).toMatchObject({ ok: false });
    expect(await getFederalState(prisma)).toBe("NI");
  });

  it("AK-104 Azubi kann keine Aktion der Nutzerverwaltung ausführen, auch nicht direkt", async () => {
    const { bernd, clara, anna } = await createPersons(prisma);
    const forbidden = { ok: false, formError: "Zugriff verweigert" };

    expect(await createPerson(prisma, anna, { name: "X", email: "x@test.invalid", role: "TRAINER" })).toEqual(
      forbidden,
    );
    expect(await updatePerson(prisma, anna, anna.id, { name: "Anna", email: anna.email, role: "TRAINER" })).toEqual(
      forbidden,
    );
    expect(await deactivatePerson(prisma, anna, clara.id)).toEqual(forbidden);
    expect(await reactivatePerson(prisma, anna, clara.id)).toEqual(forbidden);
    expect(await deletePerson(prisma, anna, clara.id, "Clara")).toEqual(forbidden);
    expect(await updateFederalState(prisma, anna, "BY")).toEqual(forbidden);
    // Auch ein deaktivierter Ausbilder nicht.
    expect(await deactivatePerson(prisma, { ...bernd, active: false }, clara.id)).toEqual(forbidden);

    expect(await prisma.person.count()).toBe(3);
    expect(await prisma.person.findUniqueOrThrow({ where: { id: anna.id } })).toMatchObject({ role: "TRAINEE" });
    expect(await prisma.person.findUniqueOrThrow({ where: { id: clara.id } })).toMatchObject({ active: true });
  });
});

describe("Zugriff auf Berichte (Server)", () => {
  it("AK-103 Azubi erhält nur eigene Berichte, AK-105 Ausbilder alle", async () => {
    const { bernd, clara, anna } = await createPersons(prisma);
    const otto = await prisma.person.create({
      data: {
        email: "otto@test.invalid",
        name: "Otto",
        role: "TRAINEE",
        trainerId: clara.id,
        trainingStart: new Date("2026-09-01T00:00:00Z"),
      },
    });
    const annas = await prisma.weeklyReport.create({ data: { traineeId: anna.id, isoYear: 2026, isoWeek: 40 } });
    const ottos = await prisma.weeklyReport.create({ data: { traineeId: otto.id, isoYear: 2026, isoWeek: 40 } });

    expect((await listVisibleReports(prisma, anna)).map((r) => r.id)).toEqual([annas.id]);
    expect((await listVisibleReports(prisma, otto)).map((r) => r.id)).toEqual([ottos.id]);
    expect((await listVisibleReports(prisma, bernd)).map((r) => r.id).sort()).toEqual([annas.id, ottos.id].sort());
    expect((await listVisibleReports(prisma, clara)).length).toBe(2);
  });
});

describe("Zuordnung beim ersten Login (Entscheidung Anlegen über die Firmen-E-Mail)", () => {
  it("AK-201 erster Login bindet die Konto-ID über die bestätigte E-Mail, ohne Groß-/Kleinschreibung", async () => {
    const { bernd } = await createPersons(prisma);
    await createPerson(prisma, bernd, { ...emil, trainerId: bernd.id });

    const person = await resolveLoginPerson(prisma, {
      accountId: "kc-emil",
      email: "emil@firma.test",
      emailVerified: true,
    });

    expect(person).toMatchObject({ name: "Emil Neu", accountId: "kc-emil" });
  });

  it("AK-201 unbestätigte E-Mail bindet nicht", async () => {
    const { bernd } = await createPersons(prisma);
    await createPerson(prisma, bernd, { ...emil, trainerId: bernd.id });

    expect(
      await resolveLoginPerson(prisma, { accountId: "kc-emil", email: "emil@firma.test", emailVerified: false }),
    ).toBeNull();
    expect((await prisma.person.findUniqueOrThrow({ where: { email: "emil@firma.test" } })).accountId).toBeNull();
  });

  it("AK-201 nach der Bindung zählt nur die Konto-ID; spätere E-Mail-Änderung bricht die Zuordnung nicht", async () => {
    const { bernd } = await createPersons(prisma);
    await createPerson(prisma, bernd, { ...emil, trainerId: bernd.id });
    await resolveLoginPerson(prisma, { accountId: "kc-emil", email: "emil@firma.test", emailVerified: true });

    // E-Mail im Firmenkonto geändert: weiterhin dieselbe Person.
    const later = await resolveLoginPerson(prisma, {
      accountId: "kc-emil",
      email: "emil.neu@firma.test",
      emailVerified: true,
    });
    expect(later).toMatchObject({ name: "Emil Neu" });

    // Ein anderes Konto mit Emils alter E-Mail wird nicht zugeordnet.
    expect(
      await resolveLoginPerson(prisma, { accountId: "kc-fremd", email: "emil@firma.test", emailVerified: true }),
    ).toBeNull();
    expect((await prisma.person.findUniqueOrThrow({ where: { email: "emil@firma.test" } })).accountId).toBe("kc-emil");
  });

  it("AK-102 deaktivierte, noch nie angemeldete Person wird nicht gebunden", async () => {
    const { bernd } = await createPersons(prisma);
    const created = await createPerson(prisma, bernd, { ...emil, trainerId: bernd.id });
    await deactivatePerson(prisma, bernd, created.ok ? created.personId! : "");

    expect(
      await resolveLoginPerson(prisma, { accountId: "kc-emil", email: "emil@firma.test", emailVerified: true }),
    ).toBeNull();
  });

  it("AK-201 Datenbank: Konto-ID optional, aber eindeutig; E-Mail nur klein geschrieben", async () => {
    await createPersons(prisma);
    await prisma.person.create({ data: { email: "a@test.invalid", name: "A", role: "TRAINER" } });
    await prisma.person.create({ data: { email: "b@test.invalid", name: "B", role: "TRAINER" } });

    await expect(
      prisma.person.create({ data: { accountId: "test-anna", email: "c@test.invalid", name: "C", role: "TRAINER" } }),
    ).rejects.toThrow();
    await expect(
      prisma.person.create({ data: { email: "Gross@test.invalid", name: "D", role: "TRAINER" } }),
    ).rejects.toThrow(/person_email_normalized/);
  });
});
