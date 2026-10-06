import { describe, expect, it } from "vitest";
import { isPublicHoliday } from "./holidays";
import {
  classifyWeek,
  correctOutsideTraining,
  isWeekOutsideTraining,
  currentIsoWeek,
  isOutsideTraining,
  isPastOpen,
  planReportDays,
  weeksDue,
  type StoredDay,
  type TrainingPeriod,
} from "./report-generation";
import { formatDate, isoWeekOf, type IsoWeek } from "./weeks";

const date = (value: string) => new Date(`${value}T00:00:00Z`);
const period = (start: string, end?: string): TrainingPeriod => ({ start: date(start), end: end ? date(end) : null });
const label = (weeks: IsoWeek[]) => weeks.map((week) => `${week.isoWeek}/${week.isoYear}`);

describe("Wochen erzeugen", () => {
  it("AK-301 Beginn 01.09.2026, heute 06.10.2026 → Berichte KW 36–41, keiner mehr", () => {
    const weeks = weeksDue(period("2026-09-01"), new Date("2026-10-06T10:00:00+02:00"));
    expect(label(weeks)).toEqual(["36/2026", "37/2026", "38/2026", "39/2026", "40/2026", "41/2026"]);
  });

  it("AK-302 keine zukünftigen Wochen; mit Beginn der neuen Woche (Europe/Berlin) kommt ihr Bericht dazu", () => {
    const training = period("2026-09-01");
    // Sonntag 11.10.2026, 23:59 Uhr in Berlin: noch KW 41.
    expect(label(weeksDue(training, new Date("2026-10-11T23:59:00+02:00"))).at(-1)).toBe("41/2026");
    // Montag 12.10.2026, 0:00 Uhr in Berlin (Sonntag 22:00 UTC): KW 42 ist da.
    expect(label(weeksDue(training, new Date("2026-10-11T22:00:00Z"))).at(-1)).toBe("42/2026");
    expect(currentIsoWeek(new Date("2026-10-11T22:00:00Z"))).toEqual({ isoYear: 2026, isoWeek: 42 });
  });

  it("AK-302 Beginn in der Zukunft: noch kein Bericht", () => {
    expect(weeksDue(period("2026-11-02"), new Date("2026-10-06T10:00:00+02:00"))).toEqual([]);
  });

  it("AK-303 nach dem Ausbildungsende entstehen keine Berichte mehr", () => {
    const weeks = weeksDue(period("2026-09-01", "2026-09-16"), new Date("2026-10-06T10:00:00+02:00"));
    expect(label(weeks)).toEqual(["36/2026", "37/2026", "38/2026"]);
    // Ende in der Zukunft begrenzt nicht: bis zur aktuellen Woche.
    expect(label(weeksDue(period("2026-09-01", "2029-08-31"), new Date("2026-10-06T10:00:00+02:00"))).at(-1)).toBe(
      "41/2026",
    );
  });

  it("AK-304 pro Woche genau ein Eintrag, auch über den Jahreswechsel mit KW 53", () => {
    const weeks = weeksDue(period("2026-12-14"), new Date("2027-01-12T09:00:00+01:00"));
    expect(label(weeks)).toEqual(["51/2026", "52/2026", "53/2026", "1/2027", "2/2027"]);
    expect(new Set(label(weeks)).size).toBe(weeks.length);
  });

  it("AK-305 Beginn und Ende mitten in der Woche: Tage außerhalb sind markiert", () => {
    // Beginn Dienstag 01.09.2026: Montag 31.08. liegt davor.
    const first = planReportDays({ isoYear: 2026, isoWeek: 36 }, period("2026-09-01", "2026-09-17"), "NW");
    expect(first.map((day) => [formatDate(day.date), day.outsideTraining])).toEqual([
      ["31.08.2026", true],
      ["01.09.2026", false],
      ["02.09.2026", false],
      ["03.09.2026", false],
      ["04.09.2026", false],
    ]);
    // Ende Donnerstag 17.09.2026: Freitag liegt danach.
    const last = planReportDays({ isoYear: 2026, isoWeek: 38 }, period("2026-09-01", "2026-09-17"), "NW");
    expect(last.map((day) => day.outsideTraining)).toEqual([false, false, false, false, true]);
    expect(isOutsideTraining(date("2026-09-17"), period("2026-09-01", "2026-09-17"))).toBe(false);
  });

  it("AK-305 neue Berichte haben Mo–Fr und ohne Feiertag noch keine Tagesart", () => {
    const days = planReportDays({ isoYear: 2026, isoWeek: 41 }, period("2026-09-01"), "NW");
    expect(days).toHaveLength(5);
    expect(days.every((day) => day.dayType === null && !day.outsideTraining)).toBe(true);
  });
});

describe("Feiertage", () => {
  it("AK-404 Fr 25.12.2026 ist als „Feiertag“ vorbelegt", () => {
    const days = planReportDays({ isoYear: 2026, isoWeek: 52 }, period("2026-09-01"), "NW");
    expect(days.map((day) => day.dayType)).toEqual([null, null, null, null, "HOLIDAY"]);
    expect(formatDate(days[4].date)).toBe("25.12.2026");
  });

  it("AK-404 Do 27.05.2027 (Fronleichnam) bei Nordrhein-Westfalen ja, bei Niedersachsen nein", () => {
    const week = isoWeekOf(date("2027-05-27"));
    const nw = planReportDays(week, period("2026-09-01"), "NW");
    const ni = planReportDays(week, period("2026-09-01"), "NI");
    expect(formatDate(nw[3].date)).toBe("27.05.2027");
    expect(nw[3].dayType).toBe("HOLIDAY");
    expect(ni[3].dayType).toBeNull();
    expect(isPublicHoliday(date("2027-05-27"), "NW")).toBe(true);
    expect(isPublicHoliday(date("2027-05-27"), "NI")).toBe(false);
  });

  it("AK-404 Feiertage außerhalb der Ausbildung werden nicht vorbelegt", () => {
    // Neujahr 01.01.2027 (Freitag), Ausbildungsende 31.12.2026.
    const days = planReportDays({ isoYear: 2026, isoWeek: 53 }, period("2026-09-01", "2026-12-31"), "NW");
    expect(days[4]).toMatchObject({ outsideTraining: true, dayType: null });
  });
});

describe("Geänderter Ausbildungszeitraum", () => {
  const days: StoredDay[] = [
    { id: "mo", date: date("2026-12-21"), dayType: "WORK", outsideTraining: false },
    { id: "di", date: date("2026-12-22"), dayType: null, outsideTraining: false },
    { id: "mi", date: date("2026-12-23"), dayType: null, outsideTraining: false },
    { id: "do", date: date("2026-12-24"), dayType: null, outsideTraining: true },
    { id: "fr", date: date("2026-12-25"), dayType: null, outsideTraining: true },
  ];

  it("AK-203 Markierung wird neu berechnet, Inhalte bleiben, neu einbezogene Feiertage vorbelegt", () => {
    // Beginn später (Mittwoch), Ende offen.
    expect(correctOutsideTraining(days, period("2026-12-23"), "NW")).toEqual([
      { id: "mo", outsideTraining: true },
      { id: "di", outsideTraining: true },
      { id: "do", outsideTraining: false },
      { id: "fr", outsideTraining: false, dayType: "HOLIDAY" },
    ]);
  });

  it("AK-203 unveränderter Zeitraum ändert nichts", () => {
    expect(correctOutsideTraining(days, period("2026-09-01", "2026-12-23"), "NW")).toEqual([]);
  });
});

describe("Übersicht", () => {
  const current = { isoYear: 2026, isoWeek: 41 };

  it("AK-306 offene Wochen in der Vergangenheit werden hervorgehoben", () => {
    expect(isPastOpen({ isoYear: 2026, isoWeek: 40, status: "DRAFT" }, current)).toBe(true);
    expect(isPastOpen({ isoYear: 2026, isoWeek: 36, status: "REJECTED" }, current)).toBe(true);
    // Nicht offen oder nicht vergangen.
    expect(isPastOpen({ isoYear: 2026, isoWeek: 40, status: "SUBMITTED" }, current)).toBe(false);
    expect(isPastOpen({ isoYear: 2026, isoWeek: 39, status: "APPROVED" }, current)).toBe(false);
    expect(isPastOpen({ isoYear: 2026, isoWeek: 41, status: "DRAFT" }, current)).toBe(false);
    expect(isPastOpen({ isoYear: 2025, isoWeek: 52, status: "DRAFT" }, current)).toBe(true);
  });
});

describe("Wochen ganz außerhalb der Ausbildung", () => {
  const current = { isoYear: 2026, isoWeek: 41 };
  // Beginn von 01.08. auf 01.09.2026 verschoben: KW 31–35 liegen ganz davor.
  const shifted = period("2026-09-01");
  const week = (isoWeek: number, extra: Partial<Parameters<typeof classifyWeek>[0]> = {}) => ({
    isoYear: 2026,
    isoWeek,
    status: "DRAFT" as const,
    hasContent: false,
    hasHistory: false,
    ...extra,
  });

  it("AK-203 unberührter leerer Entwurf ganz außerhalb wird ausgeblendet und zählt nicht als offen", () => {
    expect(isWeekOutsideTraining({ isoYear: 2026, isoWeek: 35 }, shifted)).toBe(true);
    expect(classifyWeek(week(35), shifted, current)).toEqual({
      hidden: true,
      outsideTraining: true,
      open: false,
      pastOpen: false,
    });
  });

  it("AK-306 Woche ganz außerhalb mit Inhalt oder Historie bleibt sichtbar, markiert, nicht offen", () => {
    for (const extra of [
      { hasContent: true },
      { hasHistory: true },
      { status: "REJECTED" as const, hasHistory: true },
    ]) {
      expect(classifyWeek(week(34, extra), shifted, current)).toEqual({
        hidden: false,
        outsideTraining: true,
        open: false,
        pastOpen: false,
      });
    }
  });

  it("AK-306 Woche teilweise in der Ausbildung bleibt normal; wandert der Beginn zurück, erscheint die Woche wieder", () => {
    // KW 36: Montag davor, Rest in der Ausbildung.
    expect(classifyWeek(week(36), shifted, current)).toEqual({
      hidden: false,
      outsideTraining: false,
      open: true,
      pastOpen: true,
    });
    expect(classifyWeek(week(35), period("2026-08-01"), current)).toEqual({
      hidden: false,
      outsideTraining: false,
      open: true,
      pastOpen: true,
    });
    // Nach dem Ausbildungsende.
    expect(classifyWeek(week(40), period("2026-09-01", "2026-09-25"), current).hidden).toBe(true);
  });
});
