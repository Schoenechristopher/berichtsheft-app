import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { now, resetClock, setFixedNow } from "@/domain/clock";
import { MAX_ACTIVITIES_LENGTH, type DayInput } from "@/domain/report-days";
import { toDateInput } from "@/domain/weeks";
import { deactivatePerson, updateFederalState, updatePerson } from "@/lib/people/service";
import {
  dayInputsFromForm,
  ensureReportsForAllTrainees,
  ensureReportsForTrainee,
  listTraineeWeeks,
  saveReportDays,
} from "@/lib/reports";
import { createPersons, resetDatabase, testDb, type TestDb } from "./helpers";

const prisma = testDb();

afterAll(async () => {
  await resetDatabase(prisma);
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
  await prisma.setting.create({ data: { id: 1, federalState: "NW" } });
  setFixedNow("2026-10-06T10:00:00+02:00");
});

afterEach(() => {
  resetClock();
});

async function weeksOf(db: TestDb, traineeId: string) {
  const reports = await db.weeklyReport.findMany({
    where: { traineeId },
    include: { days: { orderBy: { date: "asc" } } },
    orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }],
  });
  return reports;
}

async function report(db: TestDb, traineeId: string, isoYear: number, isoWeek: number) {
  return db.weeklyReport.findUniqueOrThrow({
    where: { traineeId_isoYear_isoWeek: { traineeId, isoYear, isoWeek } },
    include: { days: { orderBy: { date: "asc" } } },
  });
}

const input = (dayType: string | null, activities: string | null): DayInput => ({ dayType, activities });

describe("Wochenberichte erzeugen", () => {
  it("AK-301 Beginn 01.09.2026, Uhr auf 06.10.2026 → Berichte KW 36–41 im Status „Entwurf“, keiner mehr", async () => {
    const { anna } = await createPersons(prisma);

    const result = await ensureReportsForTrainee(prisma, anna.id, now());

    expect(result).toEqual({ createdReports: 6, correctedDays: 0 });
    const reports = await weeksOf(prisma, anna.id);
    expect(reports.map((r) => r.isoWeek)).toEqual([36, 37, 38, 39, 40, 41]);
    expect(reports.every((r) => r.isoYear === 2026 && r.status === "DRAFT")).toBe(true);
    expect(reports.every((r) => r.days.length === 5)).toBe(true);
    expect(reports[5].days.map((day) => toDateInput(day.date))).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
    ]);
  });

  it("AK-302 Uhr auf Montag der nächsten Woche → neuer Bericht erscheint", async () => {
    const { anna } = await createPersons(prisma);
    await ensureReportsForTrainee(prisma, anna.id, now());
    expect(await prisma.weeklyReport.count({ where: { traineeId: anna.id } })).toBe(6);

    setFixedNow("2026-10-12T00:05:00+02:00");
    const result = await ensureReportsForTrainee(prisma, anna.id, now());

    expect(result.createdReports).toBe(1);
    const reports = await weeksOf(prisma, anna.id);
    expect(reports.map((r) => r.isoWeek)).toEqual([36, 37, 38, 39, 40, 41, 42]);
  });

  it("AK-303 nach dem Ausbildungsende entstehen keine Berichte mehr", async () => {
    const { anna } = await createPersons(prisma);
    await prisma.person.update({
      where: { id: anna.id },
      data: { trainingEnd: new Date("2026-09-16T00:00:00Z") },
    });
    setFixedNow("2026-12-01T09:00:00+01:00");

    await ensureReportsForTrainee(prisma, anna.id, now());

    expect((await weeksOf(prisma, anna.id)).map((r) => r.isoWeek)).toEqual([36, 37, 38]);
  });

  it("AK-304 zweite Ausführung erzeugt nichts Neues; gleichzeitige Aufrufe erzeugen keine Doppelten", async () => {
    const { anna } = await createPersons(prisma);

    const results = await Promise.all(Array.from({ length: 5 }, () => ensureReportsForTrainee(prisma, anna.id, now())));
    expect(results.reduce((sum, r) => sum + r.createdReports, 0)).toBe(6);
    expect(await ensureReportsForTrainee(prisma, anna.id, now())).toEqual({ createdReports: 0, correctedDays: 0 });

    expect(await prisma.weeklyReport.count({ where: { traineeId: anna.id } })).toBe(6);
    expect(await prisma.reportDay.count({ where: { report: { traineeId: anna.id } } })).toBe(30);
  });

  it("AK-304 doppeltes Anlegen weist die Datenbank ab", async () => {
    const { anna } = await createPersons(prisma);
    await ensureReportsForTrainee(prisma, anna.id, now());
    await expect(
      prisma.weeklyReport.create({ data: { traineeId: anna.id, isoYear: 2026, isoWeek: 40 } }),
    ).rejects.toThrow();
  });

  it("AK-304 bestehender Bericht (Seed) bleibt erhalten, fehlende Tage werden ergänzt", async () => {
    const { anna } = await createPersons(prisma);
    const existing = await prisma.weeklyReport.create({
      data: {
        traineeId: anna.id,
        isoYear: 2026,
        isoWeek: 40,
        days: { create: [{ date: new Date("2026-09-28T00:00:00Z"), dayType: "WORK", activities: "Seed-Inhalt" }] },
      },
    });

    await ensureReportsForTrainee(prisma, anna.id, now());

    const kw40 = await report(prisma, anna.id, 2026, 40);
    expect(kw40.id).toBe(existing.id);
    expect(kw40.days).toHaveLength(5);
    expect(kw40.days[0]).toMatchObject({ dayType: "WORK", activities: "Seed-Inhalt" });
  });

  it("AK-305 Beginn mitten in der Woche: Tage davor sind „außerhalb der Ausbildung“", async () => {
    const { anna } = await createPersons(prisma);
    await ensureReportsForTrainee(prisma, anna.id, now());
    const kw36 = await report(prisma, anna.id, 2026, 36);
    expect(kw36.days.map((day) => day.outsideTraining)).toEqual([true, false, false, false, false]);
  });

  it("AK-404 Fr 25.12.2026 wird beim Anlegen als „Feiertag“ vorbelegt", async () => {
    const { anna } = await createPersons(prisma);
    setFixedNow("2026-12-21T08:00:00+01:00");
    await ensureReportsForTrainee(prisma, anna.id, now());
    const kw52 = await report(prisma, anna.id, 2026, 52);
    expect(kw52.days.map((day) => day.dayType)).toEqual([null, null, null, null, "HOLIDAY"]);
    // Tag der Deutschen Einheit 2026 ist ein Samstag; KW 40 hat keinen Feiertag.
    expect((await report(prisma, anna.id, 2026, 40)).days.every((day) => day.dayType === null)).toBe(true);
  });

  it("AK-404 Do 27.05.2027 (Fronleichnam) bei NW vorbelegt, bei NI nicht; spätere Änderung des Bundeslands ändert bestehende Berichte nicht", async () => {
    const { bernd, anna } = await createPersons(prisma);
    setFixedNow("2027-05-24T08:00:00+02:00");
    await ensureReportsForTrainee(prisma, anna.id, now());
    expect((await report(prisma, anna.id, 2027, 21)).days[3]).toMatchObject({ dayType: "HOLIDAY" });

    // Bundesland wechselt auf Niedersachsen: KW 21 bleibt, wie sie ist.
    await updateFederalState(prisma, bernd, "NI");
    await ensureReportsForTrainee(prisma, anna.id, now());
    expect((await report(prisma, anna.id, 2027, 21)).days[3]).toMatchObject({ dayType: "HOLIDAY" });

    // Ein neuer Azubi in Niedersachsen bekommt Fronleichnam nicht vorbelegt.
    const nils = await prisma.person.create({
      data: {
        email: "nils@test.invalid",
        name: "Nils",
        role: "TRAINEE",
        trainerId: bernd.id,
        trainingStart: new Date("2027-05-24T00:00:00Z"),
      },
    });
    await ensureReportsForTrainee(prisma, nils.id, now());
    expect((await report(prisma, nils.id, 2027, 21)).days[3]).toMatchObject({ dayType: null });
  });

  it("AK-404 Hinweis „vorbelegt“ folgt dem beim Anlegen gültigen Bundesland, nicht dem aktuellen", async () => {
    const { bernd, anna } = await createPersons(prisma);
    setFixedNow("2027-05-24T08:00:00+02:00");
    await ensureReportsForTrainee(prisma, anna.id, now());
    const preset = (days: { holidayPreset: boolean }[]) => days.map((day) => day.holidayPreset);
    // Fronleichnam (Do 27.05.2027) in NW vorbelegt.
    expect(preset((await report(prisma, anna.id, 2027, 21)).days)).toEqual([false, false, false, true, false]);

    // Wechsel auf Niedersachsen: Der Merker bleibt, auch wenn die Tagesart geändert wird.
    await updateFederalState(prisma, bernd, "NI");
    const kw21 = await report(prisma, anna.id, 2027, 21);
    await saveReportDays(
      prisma,
      { id: anna.id, role: "TRAINEE", active: true },
      kw21.id,
      new Map([[kw21.days[3].id, input("SCHOOL", "Blockunterricht")]]),
    );
    await ensureReportsForTrainee(prisma, anna.id, now());
    expect((await report(prisma, anna.id, 2027, 21)).days[3]).toMatchObject({ dayType: "SCHOOL", holidayPreset: true });

    // Wechsel auf Bayern: Mo 06.01.2027 (Heilige Drei Könige) war in NW kein Feiertag und bleibt unmarkiert.
    await updateFederalState(prisma, bernd, "BY");
    expect((await report(prisma, anna.id, 2027, 1)).days[2]).toMatchObject({ dayType: null, holidayPreset: false });
  });

  it("AK-404 Tag, der nach geändertem Ausbildungsbeginn neu in die Ausbildung fällt, wird vorbelegt und so gemerkt", async () => {
    const { bernd, anna } = await createPersons(prisma);
    await prisma.person.update({ where: { id: anna.id }, data: { trainingStart: new Date("2027-05-28T00:00:00Z") } });
    setFixedNow("2027-05-28T08:00:00+02:00");
    await ensureReportsForTrainee(prisma, anna.id, now());
    expect((await report(prisma, anna.id, 2027, 21)).days[3]).toMatchObject({
      outsideTraining: true,
      dayType: null,
      holidayPreset: false,
    });

    const moved = await updatePerson(prisma, bernd, anna.id, {
      name: "Anna",
      email: "anna@test.invalid",
      role: "TRAINEE",
      trainerId: bernd.id,
      trainingStart: "2027-05-24",
      trainingEnd: "",
    });
    expect(moved).toMatchObject({ ok: true });
    await ensureReportsForTrainee(prisma, anna.id, now());
    expect((await report(prisma, anna.id, 2027, 21)).days[3]).toMatchObject({
      outsideTraining: false,
      dayType: "HOLIDAY",
      holidayPreset: true,
    });
  });

  it("AK-1204 Datenbank weist KW 53 in Jahren mit 52 Wochen ab; KW 53 in Jahren mit 53 Wochen bleibt erlaubt", async () => {
    const { anna } = await createPersons(prisma);
    for (const isoYear of [2027, 2025]) {
      await expect(prisma.weeklyReport.create({ data: { traineeId: anna.id, isoYear, isoWeek: 53 } })).rejects.toThrow(
        /weekly_report_iso_week_range/,
      );
    }
    for (const isoWeek of [0, 54]) {
      await expect(
        prisma.weeklyReport.create({ data: { traineeId: anna.id, isoYear: 2026, isoWeek } }),
      ).rejects.toThrow(/weekly_report_iso_week_range/);
    }
    for (const isoYear of [2026, 2020, 2032]) {
      await expect(
        prisma.weeklyReport.create({ data: { traineeId: anna.id, isoYear, isoWeek: 53 } }),
      ).resolves.toMatchObject({ isoYear, isoWeek: 53 });
    }
    await expect(
      prisma.weeklyReport.create({ data: { traineeId: anna.id, isoYear: 2027, isoWeek: 52 } }),
    ).resolves.toMatchObject({ isoWeek: 52 });
  });

  it("AK-205 deaktivierte Azubis bekommen keine neuen Wochen", async () => {
    const { bernd, anna } = await createPersons(prisma);
    await ensureReportsForTrainee(prisma, anna.id, now());
    await deactivatePerson(prisma, bernd, anna.id);

    setFixedNow("2026-10-19T09:00:00+02:00");
    expect(await ensureReportsForTrainee(prisma, anna.id, now())).toEqual({ createdReports: 0, correctedDays: 0 });
    expect(await ensureReportsForAllTrainees(prisma, now())).toEqual({ createdReports: 0, correctedDays: 0 });
    expect(await prisma.weeklyReport.count({ where: { traineeId: anna.id } })).toBe(6);
  });

  it("AK-301 täglicher Job erzeugt für alle aktiven Azubis", async () => {
    const { bernd, anna } = await createPersons(prisma);
    const ben = await prisma.person.create({
      data: {
        email: "ben@test.invalid",
        name: "Ben",
        role: "TRAINEE",
        trainerId: bernd.id,
        trainingStart: new Date("2026-10-01T00:00:00Z"),
      },
    });
    expect(await ensureReportsForAllTrainees(prisma, now())).toEqual({ createdReports: 6 + 2, correctedDays: 0 });
    expect(await prisma.weeklyReport.count({ where: { traineeId: anna.id } })).toBe(6);
    expect(await prisma.weeklyReport.count({ where: { traineeId: ben.id } })).toBe(2);
  });

  it("AK-203 geänderter Ausbildungszeitraum: fehlende Wochen ergänzt, Markierung neu berechnet, nichts gelöscht", async () => {
    const { bernd, anna } = await createPersons(prisma);
    await ensureReportsForTrainee(prisma, anna.id, now());
    // KW 36 ist eingereicht – bleibt unverändert.
    await prisma.weeklyReport.update({
      where: { traineeId_isoYear_isoWeek: { traineeId: anna.id, isoYear: 2026, isoWeek: 36 } },
      data: { status: "SUBMITTED" },
    });
    const kw37 = await report(prisma, anna.id, 2026, 37);
    await saveReportDays(prisma, anna, kw37.id, new Map([[kw37.days[0].id, input("WORK", "Montag erfasst")]]));

    // Beginn auf Mittwoch 26.08.2026 vorverlegt.
    const earlier = await updatePerson(prisma, bernd, anna.id, {
      name: "Anna",
      email: "anna@test.invalid",
      role: "TRAINEE",
      trainerId: bernd.id,
      trainingStart: "2026-08-26",
      trainingEnd: "",
    });
    expect(earlier).toMatchObject({ ok: true });
    const result = await ensureReportsForTrainee(prisma, anna.id, now());
    expect(result.createdReports).toBe(1);
    expect((await report(prisma, anna.id, 2026, 35)).days.map((day) => day.outsideTraining)).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
    // Eingereichte KW 36 bleibt unverändert (Montag weiter „außerhalb“).
    expect((await report(prisma, anna.id, 2026, 36)).days[0].outsideTraining).toBe(true);

    // Beginn auf Dienstag 08.09.2026 verschoben: frühere Wochen bleiben, ihre Tage gelten als außerhalb.
    await updatePerson(prisma, bernd, anna.id, {
      name: "Anna",
      email: "anna@test.invalid",
      role: "TRAINEE",
      trainerId: bernd.id,
      trainingStart: "2026-09-08",
      trainingEnd: "",
    });
    await ensureReportsForTrainee(prisma, anna.id, now());
    const reports = await weeksOf(prisma, anna.id);
    expect(reports.map((r) => r.isoWeek)).toEqual([35, 36, 37, 38, 39, 40, 41]);
    expect(reports[0].days.every((day) => day.outsideTraining)).toBe(true);
    const kw37After = await report(prisma, anna.id, 2026, 37);
    expect(kw37After.days.map((day) => day.outsideTraining)).toEqual([true, false, false, false, false]);
    // Inhalte bleiben erhalten, auch wenn der Tag jetzt außerhalb liegt.
    expect(kw37After.days[0]).toMatchObject({ dayType: "WORK", activities: "Montag erfasst" });
  });
});

describe("Übersicht", () => {
  it("AK-306 Azubi sieht alle eigenen Wochen, neueste zuerst; Ausbilder sehen sie lesend; fremde nicht", async () => {
    const { bernd, clara, anna } = await createPersons(prisma);
    const otto = await prisma.person.create({
      data: {
        email: "otto@test.invalid",
        name: "Otto",
        role: "TRAINEE",
        trainerId: bernd.id,
        trainingStart: new Date("2026-09-01T00:00:00Z"),
      },
    });
    await ensureReportsForAllTrainees(prisma, now());

    const own = await listTraineeWeeks(prisma, anna, anna.id, now());
    expect(own?.reports.map((r) => r.isoWeek)).toEqual([41, 40, 39, 38, 37, 36]);
    expect(await listTraineeWeeks(prisma, anna, otto.id, now())).toBeNull();
    for (const trainer of [bernd, clara]) {
      expect((await listTraineeWeeks(prisma, trainer, anna.id, now()))?.reports).toHaveLength(6);
    }
  });

  it("AK-306 vergangene offene Wochen sind markiert, die aktuelle nicht", async () => {
    const { anna } = await createPersons(prisma);
    await ensureReportsForTrainee(prisma, anna.id, now());
    const weeks = (await listTraineeWeeks(prisma, anna, anna.id, now()))?.reports ?? [];
    expect(weeks.map((r) => r.pastOpen)).toEqual([false, true, true, true, true, true]);
  });

  it("AK-203 AK-306 Beginn verschoben: unberührte Wochen ganz außerhalb ausgeblendet, solche mit Inhalt oder Historie markiert, nichts gelöscht; zurückverschoben erscheinen sie wieder", async () => {
    const { bernd, anna } = await createPersons(prisma);
    const annaInput = (trainingStart: string) => ({
      name: "Anna",
      email: "anna@test.invalid",
      role: "TRAINEE",
      trainerId: bernd.id,
      trainingStart,
      trainingEnd: "",
    });
    // Beginn zunächst 03.08.2026 (KW 32): Wochen KW 32–41 entstehen.
    await updatePerson(prisma, bernd, anna.id, annaInput("2026-08-03"));
    await ensureReportsForTrainee(prisma, anna.id, now());
    // KW 33 bekommt Inhalt, KW 34 Historie (eingereicht und zurückgezogen).
    const kw33 = await report(prisma, anna.id, 2026, 33);
    await saveReportDays(prisma, anna, kw33.id, new Map([[kw33.days[0].id, input("WORK", "erfasst")]]));
    const kw34 = await report(prisma, anna.id, 2026, 34);
    await prisma.statusChange.create({
      data: { reportId: kw34.id, fromStatus: "DRAFT", toStatus: "SUBMITTED", actorId: anna.id },
    });
    await prisma.statusChange.create({
      data: { reportId: kw34.id, fromStatus: "SUBMITTED", toStatus: "DRAFT", actorId: anna.id },
    });

    // Beginn auf 01.09.2026 korrigiert.
    await updatePerson(prisma, bernd, anna.id, annaInput("2026-09-01"));
    await ensureReportsForTrainee(prisma, anna.id, now());

    const weeks = (await listTraineeWeeks(prisma, anna, anna.id, now()))?.reports ?? [];
    expect(weeks.map((r) => r.isoWeek)).toEqual([41, 40, 39, 38, 37, 36, 34, 33]);
    const byWeek = new Map(weeks.map((r) => [r.isoWeek, r]));
    for (const isoWeek of [33, 34]) {
      expect(byWeek.get(isoWeek)).toMatchObject({ outsideTraining: true, pastOpen: false, hidden: false });
    }
    expect(byWeek.get(36)).toMatchObject({ outsideTraining: false, pastOpen: true });
    // Nichts gelöscht.
    expect(await prisma.weeklyReport.count({ where: { traineeId: anna.id } })).toBe(10);

    // Beginn wieder auf 03.08.2026: ausgeblendete Wochen erscheinen wieder, alle offen.
    await updatePerson(prisma, bernd, anna.id, annaInput("2026-08-03"));
    await ensureReportsForTrainee(prisma, anna.id, now());
    const again = (await listTraineeWeeks(prisma, anna, anna.id, now()))?.reports ?? [];
    expect(again.map((r) => r.isoWeek)).toEqual([41, 40, 39, 38, 37, 36, 35, 34, 33, 32]);
    expect(again.filter((r) => r.pastOpen)).toHaveLength(9);
  });
});

describe("Entwurf speichern", () => {
  async function annasWeek41() {
    const persons = await createPersons(prisma);
    await ensureReportsForTrainee(prisma, persons.anna.id, now());
    return { ...persons, kw41: await report(prisma, persons.anna.id, 2026, 41) };
  }

  it("AK-406 Entwurf speichern und später unverändert weiterbearbeiten", async () => {
    const { anna, kw41 } = await annasWeek41();
    const [mo, di] = kw41.days;

    const first = await saveReportDays(
      prisma,
      anna,
      kw41.id,
      new Map([
        [mo.id, input("WORK", "Server eingerichtet")],
        [di.id, input("SCHOOL", "")],
      ]),
    );
    expect(first).toMatchObject({ ok: true });

    const stored = await report(prisma, anna.id, 2026, 41);
    expect(stored.status).toBe("DRAFT");
    expect(stored.days[0]).toMatchObject({ dayType: "WORK", activities: "Server eingerichtet" });
    expect(stored.days[1]).toMatchObject({ dayType: "SCHOOL", activities: "" });
    expect(stored.days[2]).toMatchObject({ dayType: null, activities: "" });

    // Weiterbearbeiten: nur Dienstag ändern.
    await saveReportDays(prisma, anna, kw41.id, new Map([[di.id, input("SCHOOL", "Lernfeld 4")]]));
    expect((await report(prisma, anna.id, 2026, 41)).days.slice(0, 2)).toMatchObject([
      { dayType: "WORK", activities: "Server eingerichtet" },
      { dayType: "SCHOOL", activities: "Lernfeld 4" },
    ]);
  });

  it("AK-407 Umlaute, Zeilenumbrüche und 5.000 Zeichen werden unverändert gespeichert; mehr wird abgewiesen", async () => {
    const { anna, kw41 } = await annasWeek41();
    const [mo, di] = kw41.days;
    const text = "Größe prüfen, Übergabe an Jörg – „ß“\n\n  eingerückte Zeile\nEnde ";
    const long = "Ä".repeat(MAX_ACTIVITIES_LENGTH);

    const saved = await saveReportDays(
      prisma,
      anna,
      kw41.id,
      new Map([
        [mo.id, input("WORK", text.replace(/\n/g, "\r\n"))],
        [di.id, input("WORK", long)],
      ]),
    );
    expect(saved).toMatchObject({ ok: true });
    const stored = await report(prisma, anna.id, 2026, 41);
    expect(stored.days[0].activities).toBe(text);
    expect(stored.days[1].activities).toBe(long);

    const tooLong = await saveReportDays(prisma, anna, kw41.id, new Map([[di.id, input("WORK", `${long}x`)]]));
    expect(tooLong).toEqual({
      ok: false,
      reason: "day-input-invalid",
      dayErrors: { [di.id]: { activities: "Höchstens 5.000 Zeichen – bitte um 1 kürzen." } },
    });
    expect((await report(prisma, anna.id, 2026, 41)).days[1].activities).toBe(long);
  });

  it("AK-405 vorbelegten Feiertag ändern (Feiertag → Berufsschule)", async () => {
    const { anna } = await createPersons(prisma);
    setFixedNow("2026-12-21T08:00:00+01:00");
    await ensureReportsForTrainee(prisma, anna.id, now());
    const kw52 = await report(prisma, anna.id, 2026, 52);
    const friday = kw52.days[4];
    expect(friday.dayType).toBe("HOLIDAY");

    await saveReportDays(prisma, anna, kw52.id, new Map([[friday.id, input("SCHOOL", "")]]));
    expect((await report(prisma, anna.id, 2026, 52)).days[4].dayType).toBe("SCHOOL");
  });

  it("AK-305 Tage außerhalb der Ausbildung werden beim Speichern nicht geändert", async () => {
    const { anna } = await createPersons(prisma);
    await ensureReportsForTrainee(prisma, anna.id, now());
    const kw36 = await report(prisma, anna.id, 2026, 36);
    await saveReportDays(prisma, anna, kw36.id, new Map([[kw36.days[0].id, input("WORK", "vor Beginn")]]));
    expect((await report(prisma, anna.id, 2026, 36)).days[0]).toMatchObject({ dayType: null, activities: "" });
  });

  it("AK-103 nur der eigene Azubi speichert; Ausbilder und fremde Azubis werden abgewiesen", async () => {
    const { bernd, clara, kw41 } = await annasWeek41();
    const otto = await prisma.person.create({
      data: {
        email: "otto@test.invalid",
        name: "Otto",
        role: "TRAINEE",
        trainerId: bernd.id,
        trainingStart: new Date("2026-09-01T00:00:00Z"),
      },
    });
    const change = new Map([[kw41.days[0].id, input("WORK", "fremd")]]);

    expect(await saveReportDays(prisma, otto, kw41.id, change)).toEqual({
      ok: false,
      reason: "forbidden",
      formError: "Zugriff verweigert",
    });
    for (const trainer of [bernd, clara]) {
      expect(await saveReportDays(prisma, trainer, kw41.id, change)).toEqual({
        ok: false,
        reason: "not-editable",
        formError: "Dieser Bericht kann nicht mehr bearbeitet werden.",
      });
    }
    expect(await saveReportDays(prisma, otto, "kein-bericht", change)).toMatchObject({ ok: false });
    expect((await report(prisma, kw41.traineeId, 2026, 41)).days[0].activities).toBe("");
  });

  it("AK-204 deaktivierter Azubi und nicht offene Berichte sind nicht änderbar", async () => {
    const { bernd, anna, kw41 } = await annasWeek41();
    const change = new Map([[kw41.days[0].id, input("WORK", "geändert")]]);

    for (const status of ["SUBMITTED", "APPROVED"] as const) {
      await prisma.weeklyReport.update({ where: { id: kw41.id }, data: { status } });
      expect(await saveReportDays(prisma, anna, kw41.id, change)).toMatchObject({ ok: false });
    }
    await prisma.weeklyReport.update({ where: { id: kw41.id }, data: { status: "REJECTED" } });
    expect(await saveReportDays(prisma, anna, kw41.id, change)).toMatchObject({ ok: true });

    await deactivatePerson(prisma, bernd, anna.id);
    const inactive = await prisma.person.findUniqueOrThrow({ where: { id: anna.id } });
    const again = new Map([[kw41.days[0].id, input("WORK", "nach Deaktivierung")]]);
    expect(await saveReportDays(prisma, inactive, kw41.id, again)).toMatchObject({ ok: false });
    expect((await report(prisma, anna.id, 2026, 41)).days[0].activities).toBe("geändert");
  });

  it("AK-406 Formularfelder dayType-<id> und activities-<id> werden gelesen", () => {
    const form = new FormData();
    form.set("dayType-a", "WORK");
    form.set("activities-a", "Text");
    expect(dayInputsFromForm(form, ["a", "b"])).toEqual(
      new Map([
        ["a", { dayType: "WORK", activities: "Text" }],
        ["b", { dayType: null, activities: null }],
      ]),
    );
  });
});
