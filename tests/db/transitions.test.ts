import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { now, resetClock, setFixedNow } from "@/domain/clock";
import type { DayInput } from "@/domain/report-days";
import { TRANSITION_MESSAGES, type ReportAction } from "@/domain/report-status";
import { deactivatePerson } from "@/lib/people/service";
import { transitionReport, type TransitionInput } from "@/lib/report-transitions";
import {
  ensureReportsForTrainee,
  listReviewQueue,
  listTraineeWeeks,
  loadReportHistory,
  saveReportDays,
} from "@/lib/reports";
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

/** Annas Bericht einer Woche 2026 mit Tagen. */
async function annasReport(isoWeek: number) {
  return prisma.weeklyReport.findUniqueOrThrow({
    where: { traineeId_isoYear_isoWeek: { traineeId: persons.anna.id, isoYear: 2026, isoWeek } },
    include: { days: { orderBy: { date: "asc" } } },
  });
}

/** Füllt alle Tage als „Betrieb“ mit Text. */
async function fillWeek(isoWeek: number, dayType: "WORK" | "VACATION" | "HOLIDAY" = "WORK") {
  const report = await annasReport(isoWeek);
  await prisma.reportDay.updateMany({
    where: { reportId: report.id, outsideTraining: false },
    data: { dayType, activities: dayType === "WORK" ? "Netzwerk geplant" : "" },
  });
  return report;
}

async function act(
  person: { id: string; role: "TRAINEE" | "TRAINER"; active: boolean },
  reportId: string,
  input: TransitionInput,
) {
  return transitionReport(prisma, person, reportId, input);
}

async function status(reportId: string) {
  return (await prisma.weeklyReport.findUniqueOrThrow({ where: { id: reportId } })).status;
}

const submit = { action: "SUBMIT" as const };

describe("Einreichen (AK-501 – AK-505)", () => {
  it("AK-501 vollständiger Bericht wird eingereicht", async () => {
    const report = await fillWeek(40);
    expect(await act(persons.anna, report.id, submit)).toEqual({ ok: true, status: "SUBMITTED", version: 1 });
    expect(await status(report.id)).toBe("SUBMITTED");
  });

  it("AK-501 AK-502 Text nur aus Leerzeichen gilt als leer: nicht eingereicht, Tag benannt", async () => {
    const report = await fillWeek(40);
    await prisma.reportDay.update({ where: { id: report.days[2].id }, data: { activities: "   \n\t " } });

    const result = await act(persons.anna, report.id, submit);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.submissionIssues).toEqual([
      { dayId: report.days[2].id, dayLabel: "Mittwoch, 30.09.2026", dayShort: "Mi", problem: "ACTIVITIES_MISSING" },
    ]);
    expect(result.formError).toContain("Mittwoch, 30.09.2026: Tätigkeiten fehlen");
    expect(await status(report.id)).toBe("DRAFT");
    expect(await prisma.statusChange.count()).toBe(0);
  });

  it("AK-502 fehlende Tagesart wird benannt; Tageseingaben aus dem Formular werden trotzdem als Entwurf gespeichert", async () => {
    const report = await fillWeek(40);
    const inputs = new Map<string, DayInput>([
      [report.days[0].id, { dayType: "", activities: "ohne Tagesart" }],
      [report.days[4].id, { dayType: "SCHOOL", activities: "" }],
    ]);

    const result = await act(persons.anna, report.id, {
      ...submit,
      seen: { status: "DRAFT", version: 0 },
      dayInputs: inputs,
    });

    expect(result).toMatchObject({
      ok: false,
      savedDraft: true,
      submissionIssues: [
        { dayLabel: "Montag, 28.09.2026", problem: "DAY_TYPE_MISSING" },
        { dayLabel: "Freitag, 02.10.2026", problem: "ACTIVITIES_MISSING" },
      ],
    });
    const stored = await annasReport(40);
    expect(stored.status).toBe("DRAFT");
    expect(stored.days[0]).toMatchObject({ dayType: null, activities: "ohne Tagesart" });
    expect(stored.days[4]).toMatchObject({ dayType: "SCHOOL", activities: "" });
  });

  it("AK-503 Urlaub, Krank, Feiertag ohne Text genügen; eingetragener Text bleibt erhalten", async () => {
    const report = await fillWeek(40);
    await prisma.reportDay.update({ where: { id: report.days[0].id }, data: { dayType: "VACATION", activities: "" } });
    await prisma.reportDay.update({ where: { id: report.days[1].id }, data: { dayType: "SICK", activities: "" } });
    await prisma.reportDay.update({
      where: { id: report.days[2].id },
      data: { dayType: "HOLIDAY", activities: "Tag der Deutschen Einheit vorgezogen" },
    });

    expect((await act(persons.anna, report.id, submit)).ok).toBe(true);
    expect((await annasReport(40)).days[2].activities).toBe("Tag der Deutschen Einheit vorgezogen");
  });

  it("AK-504 Woche nur aus Urlaub und Feiertagen muss eingereicht werden und zählt bis dahin als offen", async () => {
    const report = await fillWeek(39, "VACATION");
    await prisma.reportDay.update({ where: { id: report.days[4].id }, data: { dayType: "HOLIDAY" } });

    const before = await listTraineeWeeks(prisma, persons.anna, persons.anna.id, now());
    expect(before?.reports.find((week) => week.isoWeek === 39)).toMatchObject({ open: true, pastOpen: true });

    expect((await act(persons.anna, report.id, submit)).ok).toBe(true);
    const after = await listTraineeWeeks(prisma, persons.anna, persons.anna.id, now());
    expect(after?.reports.find((week) => week.isoWeek === 39)).toMatchObject({ open: false, pastOpen: false });
  });

  it("AK-505 nach dem Einreichen ist der Bericht für den Azubi schreibgeschützt (Server und Datenbank)", async () => {
    const report = await fillWeek(40);
    await act(persons.anna, report.id, submit);

    const save = await saveReportDays(
      prisma,
      persons.anna,
      report.id,
      new Map([[report.days[0].id, { dayType: "WORK", activities: "geändert" }]]),
    );
    expect(save).toEqual({ ok: false, formError: "Dieser Bericht kann nicht mehr bearbeitet werden." });
    // Zweite Schranke: Die Datenbank weist das Ändern der Tage ab.
    await expect(
      prisma.reportDay.update({ where: { id: report.days[0].id }, data: { activities: "direkt" } }),
    ).rejects.toThrow(/schreibgeschützt/);
    expect((await annasReport(40)).days[0].activities).toBe("Netzwerk geplant");
  });

  it("AK-501 nur der eigene Azubi reicht ein; Ausbilder und fremde Azubis nicht", async () => {
    const report = await fillWeek(40);
    const otto = await prisma.person.create({
      data: {
        email: "otto@test.invalid",
        name: "Otto",
        role: "TRAINEE",
        trainerId: persons.bernd.id,
        trainingStart: new Date("2026-09-01T00:00:00Z"),
      },
    });
    expect(await act(otto, report.id, submit)).toEqual({ ok: false, formError: "Zugriff verweigert" });
    expect(await act(persons.bernd, report.id, submit)).toEqual({
      ok: false,
      formError: TRANSITION_MESSAGES.traineeOnly,
    });
    expect(await status(report.id)).toBe("DRAFT");
  });
});

describe("Zurückziehen (AK-506, AK-507)", () => {
  it("AK-506 Azubi zieht zurück: Entwurf, bearbeitbar, nicht mehr in der Prüfliste", async () => {
    const report = await fillWeek(40);
    await act(persons.anna, report.id, submit);
    expect((await listReviewQueue(prisma, persons.bernd, "mine")).map((r) => r.id)).toEqual([report.id]);

    expect(
      await act(persons.anna, report.id, { action: "WITHDRAW", seen: { status: "SUBMITTED", version: 1 } }),
    ).toEqual({ ok: true, status: "DRAFT", version: 2 });
    expect(await listReviewQueue(prisma, persons.bernd, "mine")).toEqual([]);
    const save = await saveReportDays(
      prisma,
      persons.anna,
      report.id,
      new Map([[report.days[0].id, { dayType: "WORK", activities: "nachgebessert" }]]),
    );
    expect(save.ok).toBe(true);
  });

  it("AK-507 freigegebener oder abgelehnter Bericht kann nicht zurückgezogen werden", async () => {
    const approved = await fillWeek(39);
    await act(persons.anna, approved.id, submit);
    await act(persons.bernd, approved.id, { action: "APPROVE" });
    const rejected = await fillWeek(40);
    await act(persons.anna, rejected.id, submit);
    await act(persons.bernd, rejected.id, { action: "REJECT", text: "Bitte genauer" });

    for (const report of [approved, rejected]) {
      expect(await act(persons.anna, report.id, { action: "WITHDRAW" })).toEqual({
        ok: false,
        formError: TRANSITION_MESSAGES.notWithdrawable,
      });
    }
    expect(await status(approved.id)).toBe("APPROVED");
    expect(await status(rejected.id)).toBe("REJECTED");
  });
});

describe("Gleichzeitigkeit (AK-508)", () => {
  it("AK-508 Zurückziehen und Freigeben gleichzeitig: genau einer gewinnt, der andere scheitert mit Meldung", async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const isoWeek = 36 + attempt;
      const report = await fillWeek(isoWeek);
      await act(persons.anna, report.id, submit);
      const seen = { status: "SUBMITTED" as const, version: 1 };

      const [withdraw, approve] = await Promise.all([
        act(persons.anna, report.id, { action: "WITHDRAW", seen }),
        act(persons.bernd, report.id, { action: "APPROVE", seen }),
      ]);

      expect([withdraw.ok, approve.ok].filter(Boolean)).toHaveLength(1);
      const final = await status(report.id);
      if (withdraw.ok) {
        expect(final).toBe("DRAFT");
        expect(approve).toEqual({ ok: false, formError: "Bericht wurde zurückgezogen" });
      } else {
        expect(final).toBe("APPROVED");
        expect(withdraw).toEqual({ ok: false, formError: TRANSITION_MESSAGES.reviewedMeanwhile });
      }
      // Genau ein Historieneintrag pro Wechsel, keiner vom Verlierer.
      expect(await prisma.statusChange.count({ where: { reportId: report.id } })).toBe(2);
    }
  });

  it("AK-508 Azubi hat zurückgezogen, während der Ausbilder den Bericht offen hatte: Freigabe und Ablehnung scheitern", async () => {
    const report = await fillWeek(40);
    await act(persons.anna, report.id, submit);
    const seenByBernd = { status: "SUBMITTED" as const, version: 1 };
    await act(persons.anna, report.id, { action: "WITHDRAW", seen: seenByBernd });

    for (const input of [
      { action: "APPROVE" as const, seen: seenByBernd },
      { action: "REJECT" as const, seen: seenByBernd, text: "Kommentar" },
    ]) {
      expect(await act(persons.bernd, report.id, input)).toEqual({
        ok: false,
        formError: "Bericht wurde zurückgezogen",
      });
    }
    expect(await status(report.id)).toBe("DRAFT");
    expect(await prisma.comment.count()).toBe(0);
  });

  it("AK-508 umgekehrt: Zurückziehen scheitert mit Meldung, wenn schon geprüft wurde", async () => {
    const report = await fillWeek(40);
    await act(persons.anna, report.id, submit);
    const seenByAnna = { status: "SUBMITTED" as const, version: 1 };
    await act(persons.clara, report.id, { action: "REJECT", seen: seenByAnna, text: "Bitte ergänzen" });

    expect(await act(persons.anna, report.id, { action: "WITHDRAW", seen: seenByAnna })).toEqual({
      ok: false,
      formError: "Bericht wurde bereits geprüft und kann nicht mehr zurückgezogen werden.",
    });
    expect(await status(report.id)).toBe("REJECTED");
  });

  it("AK-508 zurückgezogen und erneut eingereicht: die alte Ansicht des Ausbilders ist veraltet", async () => {
    const report = await fillWeek(40);
    await act(persons.anna, report.id, submit);
    const seenByBernd = { status: "SUBMITTED" as const, version: 1 };
    await act(persons.anna, report.id, { action: "WITHDRAW" });
    await act(persons.anna, report.id, submit);

    expect(await act(persons.bernd, report.id, { action: "APPROVE", seen: seenByBernd })).toEqual({
      ok: false,
      formError: TRANSITION_MESSAGES.changedMeanwhile,
    });
    expect(
      await act(persons.bernd, report.id, { action: "APPROVE", seen: { status: "SUBMITTED", version: 3 } }),
    ).toMatchObject({
      ok: true,
    });
  });
});

describe("Prüfen (AK-601 – AK-607)", () => {
  it("AK-601 Prüfliste: eigene Azubis standardmäßig, per Filter alle; mit Azubi, Woche, Einreichungsdatum", async () => {
    const otto = await prisma.person.create({
      data: {
        email: "otto@test.invalid",
        name: "Otto",
        role: "TRAINEE",
        trainerId: persons.clara.id,
        trainingStart: new Date("2026-09-01T00:00:00Z"),
      },
    });
    await ensureReportsForTrainee(prisma, otto.id, now());
    const annas = await fillWeek(40);
    setFixedNow("2026-10-06T11:30:00+02:00");
    await act(persons.anna, annas.id, submit);
    const ottos = await prisma.weeklyReport.findFirstOrThrow({ where: { traineeId: otto.id, isoWeek: 39 } });
    await prisma.reportDay.updateMany({ where: { reportId: ottos.id }, data: { dayType: "SICK" } });
    setFixedNow("2026-10-06T08:00:00+02:00");
    await act(otto, ottos.id, submit);

    const mine = await listReviewQueue(prisma, persons.bernd, "mine");
    expect(mine.map((r) => [r.trainee.name, r.isoWeek, r.submittedAt.toISOString()])).toEqual([
      ["Anna", 40, "2026-10-06T09:30:00.000Z"],
    ]);
    const all = await listReviewQueue(prisma, persons.bernd, "all");
    expect(all.map((r) => [r.trainee.name, r.isoWeek, r.assignedToViewer])).toEqual([
      ["Otto", 39, false],
      ["Anna", 40, true],
    ]);
    // Azubis haben keine Prüfliste.
    expect(await listReviewQueue(prisma, persons.anna, "all")).toEqual([]);
  });

  it("AK-602 Vertretung (nicht zugeordnet) darf freigeben und ablehnen", async () => {
    const one = await fillWeek(39);
    const two = await fillWeek(40);
    await act(persons.anna, one.id, submit);
    await act(persons.anna, two.id, submit);

    expect((await act(persons.clara, one.id, { action: "APPROVE" })).ok).toBe(true);
    expect((await act(persons.clara, two.id, { action: "REJECT", text: "Bitte Mittwoch ergänzen" })).ok).toBe(true);
  });

  it("AK-603 Freigabe speichert Status, Person sowie Datum und Uhrzeit", async () => {
    const report = await fillWeek(40);
    await act(persons.anna, report.id, submit);
    setFixedNow("2026-10-07T14:05:00+02:00");

    expect(
      await act(persons.bernd, report.id, { action: "APPROVE", seen: { status: "SUBMITTED", version: 1 } }),
    ).toEqual({
      ok: true,
      status: "APPROVED",
      version: 2,
    });
    const { changes } = await loadReportHistory(prisma, report.id);
    expect(changes.at(-1)).toMatchObject({
      fromStatus: "SUBMITTED",
      toStatus: "APPROVED",
      actorName: "Bernd",
      createdAt: new Date("2026-10-07T12:05:00Z"),
      reviewRound: 1,
    });
  });

  it("AK-604 Ablehnen nur mit nicht leerem Gesamtkommentar", async () => {
    const report = await fillWeek(40);
    await act(persons.anna, report.id, submit);

    for (const text of [undefined, "", "   \n "]) {
      expect(await act(persons.bernd, report.id, { action: "REJECT", text })).toEqual({
        ok: false,
        fieldErrors: { comment: TRANSITION_MESSAGES.commentRequired },
      });
    }
    // Tageskommentare allein genügen nicht.
    expect(
      await act(persons.bernd, report.id, {
        action: "REJECT",
        text: " ",
        dayComments: new Map([[report.days[0].id, "Montag fehlt etwas"]]),
      }),
    ).toMatchObject({ ok: false });
    expect(await status(report.id)).toBe("SUBMITTED");
    expect(await prisma.comment.count()).toBe(0);
  });

  it("AK-605 AK-606 Ablehnung mit Gesamt- und optionalen Tageskommentaren, der aktuellen Runde zugeordnet", async () => {
    const report = await fillWeek(40);
    await act(persons.anna, report.id, submit);

    const result = await act(persons.bernd, report.id, {
      action: "REJECT",
      text: "Bitte die Tätigkeiten genauer beschreiben.",
      dayComments: new Map([
        [report.days[1].id, "Welche Geräte genau?"],
        [report.days[3].id, "  "],
      ]),
    });

    expect(result).toEqual({ ok: true, status: "REJECTED", version: 2 });
    const { comments } = await loadReportHistory(prisma, report.id);
    expect(comments.map((c) => [c.reviewRound, c.dayId, c.text, c.authorName])).toEqual([
      [1, null, "Bitte die Tätigkeiten genauer beschreiben.", "Bernd"],
      [1, report.days[1].id, "Welche Geräte genau?", "Bernd"],
    ]);
  });

  it("AK-607 Entwürfe kann der Ausbilder weder freigeben noch ablehnen", async () => {
    const report = await fillWeek(40);
    for (const input of [{ action: "APPROVE" as const }, { action: "REJECT" as const, text: "x" }]) {
      expect(await act(persons.bernd, report.id, input)).toEqual({
        ok: false,
        formError: TRANSITION_MESSAGES.draftNotReviewable,
      });
    }
    expect(await status(report.id)).toBe("DRAFT");
  });
});

describe("Überarbeiten und Rücknahme (AK-701 – AK-704)", () => {
  it("AK-701 abgelehnter Bericht ist bearbeitbar und erneut einreichbar, danach wieder in der Prüfliste", async () => {
    const report = await fillWeek(40);
    await act(persons.anna, report.id, submit);
    await act(persons.bernd, report.id, { action: "REJECT", text: "Bitte ergänzen" });

    const save = await saveReportDays(
      prisma,
      persons.anna,
      report.id,
      new Map([[report.days[0].id, { dayType: "WORK", activities: "ausführlicher" }]]),
    );
    expect(save.ok).toBe(true);
    // Einreichen statt erneut einreichen passt nicht zum Status.
    expect((await act(persons.anna, report.id, submit)).ok).toBe(false);
    expect(await act(persons.anna, report.id, { action: "RESUBMIT" })).toEqual({
      ok: true,
      status: "SUBMITTED",
      version: 3,
    });
    expect((await listReviewQueue(prisma, persons.bernd, "mine")).map((r) => r.id)).toEqual([report.id]);
  });

  it("AK-702 dreimal ablehnen, dann freigeben: vier Prüfrunden mit ihren Kommentaren", async () => {
    const report = await fillWeek(40);
    await act(persons.anna, report.id, submit);
    for (const round of [1, 2, 3]) {
      expect(
        (await act(persons.bernd, report.id, { action: "REJECT", text: `Runde ${round}: bitte ergänzen` })).ok,
      ).toBe(true);
      expect((await act(persons.anna, report.id, { action: "RESUBMIT" })).ok).toBe(true);
    }
    expect(await act(persons.bernd, report.id, { action: "APPROVE" })).toEqual({
      ok: true,
      status: "APPROVED",
      version: 8,
    });

    const { changes, comments } = await loadReportHistory(prisma, report.id);
    expect(changes.map((c) => [c.reviewRound, c.toStatus])).toEqual([
      [1, "SUBMITTED"],
      [1, "REJECTED"],
      [2, "SUBMITTED"],
      [2, "REJECTED"],
      [3, "SUBMITTED"],
      [3, "REJECTED"],
      [4, "SUBMITTED"],
      [4, "APPROVED"],
    ]);
    expect(comments.map((c) => [c.reviewRound, c.text])).toEqual([
      [1, "Runde 1: bitte ergänzen"],
      [2, "Runde 2: bitte ergänzen"],
      [3, "Runde 3: bitte ergänzen"],
    ]);
  });

  it("AK-703 Freigabe nur mit nicht leerer Begründung zurücknehmen; danach Abgelehnt und bearbeitbar", async () => {
    const report = await fillWeek(40);
    await act(persons.anna, report.id, submit);
    await act(persons.bernd, report.id, { action: "APPROVE" });

    expect(await act(persons.clara, report.id, { action: "REVOKE_APPROVAL", text: "  " })).toEqual({
      ok: false,
      fieldErrors: { reason: TRANSITION_MESSAGES.reasonRequired },
    });
    expect(await act(persons.anna, report.id, { action: "REVOKE_APPROVAL", text: "x" })).toMatchObject({ ok: false });
    expect(await status(report.id)).toBe("APPROVED");

    expect(
      await act(persons.clara, report.id, {
        action: "REVOKE_APPROVAL",
        text: "Mittwoch falsches Datum",
        seen: { status: "APPROVED", version: 2 },
      }),
    ).toEqual({ ok: true, status: "REJECTED", version: 3 });
    const { changes } = await loadReportHistory(prisma, report.id);
    expect(changes.at(-1)).toMatchObject({
      fromStatus: "APPROVED",
      toStatus: "REJECTED",
      actorName: "Clara",
      reason: "Mittwoch falsches Datum",
      reviewRound: 1,
    });
    const save = await saveReportDays(
      prisma,
      persons.anna,
      report.id,
      new Map([[report.days[2].id, { dayType: "WORK", activities: "korrigiert" }]]),
    );
    expect(save.ok).toBe(true);
  });

  it("AK-704 freigegebenen Bericht kann niemand ändern, auch kein Ausbilder", async () => {
    const report = await fillWeek(40);
    await act(persons.anna, report.id, submit);
    await act(persons.bernd, report.id, { action: "APPROVE" });

    const change = new Map([[report.days[0].id, { dayType: "WORK", activities: "geändert" }]]);
    for (const person of [persons.anna, persons.bernd, persons.clara]) {
      expect((await saveReportDays(prisma, person, report.id, change)).ok).toBe(false);
    }
    const actions: ReportAction[] = ["SUBMIT", "WITHDRAW", "APPROVE", "REJECT", "RESUBMIT"];
    for (const action of actions) {
      for (const person of [persons.anna, persons.bernd]) {
        expect((await act(person, report.id, { action, text: "x" })).ok).toBe(false);
      }
    }
    await expect(
      prisma.reportDay.update({ where: { id: report.days[0].id }, data: { activities: "direkt" } }),
    ).rejects.toThrow(/schreibgeschützt/);
    expect(await status(report.id)).toBe("APPROVED");
    expect((await annasReport(40)).days[0].activities).toBe("Netzwerk geplant");
  });
});

describe("Historie (AK-801 – AK-803)", () => {
  it("AK-801 jeder Wechsel landet mit Datum, Uhrzeit, Person, altem und neuem Status in der Historie", async () => {
    const report = await fillWeek(40);
    setFixedNow("2026-10-06T10:00:00+02:00");
    await act(persons.anna, report.id, submit);
    setFixedNow("2026-10-06T10:10:00+02:00");
    await act(persons.anna, report.id, { action: "WITHDRAW" });
    setFixedNow("2026-10-06T10:20:00+02:00");
    await act(persons.anna, report.id, submit);
    setFixedNow("2026-10-07T09:00:00+02:00");
    await act(persons.bernd, report.id, { action: "REJECT", text: "Bitte genauer" });
    setFixedNow("2026-10-07T12:00:00+02:00");
    await act(persons.anna, report.id, { action: "RESUBMIT" });
    setFixedNow("2026-10-08T08:00:00+02:00");
    await act(persons.clara, report.id, { action: "APPROVE" });
    setFixedNow("2026-10-09T08:00:00+02:00");
    await act(persons.bernd, report.id, { action: "REVOKE_APPROVAL", text: "Datum falsch" });

    const { changes } = await loadReportHistory(prisma, report.id);
    expect(changes.map((c) => [c.createdAt.toISOString(), c.actorName, c.fromStatus, c.toStatus, c.reason])).toEqual([
      ["2026-10-06T08:00:00.000Z", "Anna", "DRAFT", "SUBMITTED", null],
      ["2026-10-06T08:10:00.000Z", "Anna", "SUBMITTED", "DRAFT", null],
      ["2026-10-06T08:20:00.000Z", "Anna", "DRAFT", "SUBMITTED", null],
      ["2026-10-07T07:00:00.000Z", "Bernd", "SUBMITTED", "REJECTED", null],
      ["2026-10-07T10:00:00.000Z", "Anna", "REJECTED", "SUBMITTED", null],
      ["2026-10-08T06:00:00.000Z", "Clara", "SUBMITTED", "APPROVED", null],
      ["2026-10-09T06:00:00.000Z", "Bernd", "APPROVED", "REJECTED", "Datum falsch"],
    ]);
  });

  it("AK-802 Kommentare früherer Runden bleiben erhalten und sind ihrer Runde zugeordnet", async () => {
    const report = await fillWeek(40);
    await act(persons.anna, report.id, submit);
    await act(persons.bernd, report.id, {
      action: "REJECT",
      text: "Erste Runde",
      dayComments: new Map([[report.days[0].id, "Montag ergänzen"]]),
    });
    await act(persons.anna, report.id, { action: "RESUBMIT" });
    await act(persons.clara, report.id, { action: "REJECT", text: "Zweite Runde" });

    const { comments } = await loadReportHistory(prisma, report.id);
    expect(comments.map((c) => [c.reviewRound, c.authorName, c.text])).toEqual([
      [1, "Bernd", "Erste Runde"],
      [1, "Bernd", "Montag ergänzen"],
      [2, "Clara", "Zweite Runde"],
    ]);
  });

  it("AK-803 Kommentare lassen sich weder ändern noch löschen", async () => {
    const report = await fillWeek(40);
    await act(persons.anna, report.id, submit);
    await act(persons.bernd, report.id, {
      action: "REJECT",
      text: "Bitte ergänzen",
      dayComments: new Map([[report.days[0].id, "Montag"]]),
    });

    await expect(prisma.comment.updateMany({ data: { text: "geändert" } })).rejects.toThrow(/unveränderlich/);
    await expect(prisma.comment.deleteMany()).rejects.toThrow(/unveränderlich/);
    await expect(prisma.$executeRaw`DELETE FROM comment`).rejects.toThrow(/unveränderlich/);
    // Auch nicht über das Löschen des Tages.
    await expect(prisma.reportDay.delete({ where: { id: report.days[0].id } })).rejects.toThrow(/unveränderlich/);
    expect(await prisma.comment.count({ where: { reportId: report.id } })).toBe(2);
  });

  it("AK-803 endgültiges Löschen des Azubis entfernt Berichte, Statuswechsel und Kommentare per Kaskade", async () => {
    const report = await fillWeek(40);
    await act(persons.anna, report.id, submit);
    await act(persons.bernd, report.id, {
      action: "REJECT",
      text: "Bitte ergänzen",
      dayComments: new Map([[report.days[0].id, "Montag"]]),
    });

    await prisma.person.delete({ where: { id: persons.anna.id } });

    expect(await prisma.comment.count()).toBe(0);
    expect(await prisma.statusChange.count()).toBe(0);
  });
});

describe("AK-602 deaktivierter Azubi (bestätigte Auslegung)", () => {
  it("eingereichter Bericht eines deaktivierten Azubis kann freigegeben, aber nicht abgelehnt werden", async () => {
    const one = await fillWeek(39);
    const two = await fillWeek(40);
    await act(persons.anna, one.id, submit);
    await act(persons.anna, two.id, submit);
    expect((await deactivatePerson(prisma, persons.bernd, persons.anna.id)).ok).toBe(true);

    expect((await listReviewQueue(prisma, persons.bernd, "mine")).map((r) => r.trainee.active)).toEqual([false, false]);
    expect(await act(persons.bernd, one.id, { action: "REJECT", text: "x" })).toEqual({
      ok: false,
      formError: TRANSITION_MESSAGES.traineeInactiveReview,
    });
    expect((await act(persons.bernd, two.id, { action: "APPROVE" })).ok).toBe(true);
    expect(await act(persons.bernd, two.id, { action: "REVOKE_APPROVAL", text: "x" })).toEqual({
      ok: false,
      formError: TRANSITION_MESSAGES.traineeInactiveReview,
    });
  });
});

describe("AK-501 Woche ganz außerhalb der Ausbildung (bestätigte Auslegung)", () => {
  it("wird nicht eingereicht, auch mit Inhalt", async () => {
    const report = await fillWeek(36);
    await prisma.person.update({
      where: { id: persons.anna.id },
      data: { trainingStart: new Date("2026-09-14T00:00:00Z") },
    });
    expect(await act(persons.anna, report.id, submit)).toEqual({
      ok: false,
      formError: "Diese Woche liegt ganz außerhalb der Ausbildung und wird nicht eingereicht.",
    });
  });
});
