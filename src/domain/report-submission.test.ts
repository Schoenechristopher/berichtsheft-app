import { describe, expect, it } from "vitest";
import { planReportDays } from "./report-generation";
import { submissionHeadline, submissionSummary, validateSubmission, type DayForSubmission } from "./report-submission";
import { isoWeekWorkdays } from "./weeks";

/** KW 41/2026 (05.–09.10.2026), alle Tage „Betrieb“ mit Text. */
function week(overrides: Partial<DayForSubmission>[] = []): DayForSubmission[] {
  return isoWeekWorkdays(2026, 41).map((date, index) => ({
    id: `d${index}`,
    date,
    dayType: "WORK",
    activities: "Server aufgesetzt",
    outsideTraining: false,
    ...overrides[index],
  }));
}

describe("Pflichtfelder beim Einreichen", () => {
  it("AK-501 vollständige Woche ist einreichbar", () => {
    expect(validateSubmission(week())).toEqual([]);
  });

  it("AK-501 AK-502 fehlende Tagesart und leerer Text (auch nur Leerzeichen) werden je Tag benannt", () => {
    const issues = validateSubmission(
      week([{ dayType: null }, {}, { dayType: "SCHOOL", activities: "  \n " }, { dayType: "" }, { activities: "" }]),
    );
    expect(issues).toEqual([
      { dayId: "d0", dayLabel: "Montag, 05.10.2026", dayShort: "Mo", problem: "DAY_TYPE_MISSING" },
      { dayId: "d2", dayLabel: "Mittwoch, 07.10.2026", dayShort: "Mi", problem: "ACTIVITIES_MISSING" },
      { dayId: "d3", dayLabel: "Donnerstag, 08.10.2026", dayShort: "Do", problem: "DAY_TYPE_MISSING" },
      { dayId: "d4", dayLabel: "Freitag, 09.10.2026", dayShort: "Fr", problem: "ACTIVITIES_MISSING" },
    ]);
    expect(submissionHeadline(issues)).toBe("4 Tage sind unvollständig: Mo, Mi, Do, Fr");
    expect(submissionSummary(issues)).toBe(
      "Nicht eingereicht – bitte ergänzen: Montag, 05.10.2026: Tagesart fehlt; Mittwoch, 07.10.2026: Tätigkeiten fehlen; Donnerstag, 08.10.2026: Tagesart fehlt; Freitag, 09.10.2026: Tätigkeiten fehlen.",
    );
  });

  it("AK-503 Urlaub, Krank und Feiertag brauchen keinen Text", () => {
    expect(
      validateSubmission(
        week([
          { dayType: "VACATION", activities: "" },
          { dayType: "SICK", activities: "" },
          { dayType: "HOLIDAY", activities: "" },
          { dayType: "HOLIDAY", activities: "trotzdem Text" },
        ]),
      ),
    ).toEqual([]);
  });

  it("AK-504 Woche nur aus Urlaub und Feiertagen ist vollständig (und muss eingereicht werden)", () => {
    const days = week([
      { dayType: "VACATION", activities: "" },
      { dayType: "VACATION", activities: "" },
      { dayType: "HOLIDAY", activities: "" },
      { dayType: "VACATION", activities: "" },
      { dayType: "VACATION", activities: "" },
    ]);
    expect(validateSubmission(days)).toEqual([]);
  });

  it("AK-305 AK-501 Tage außerhalb der Ausbildung sind keine Pflicht", () => {
    expect(
      validateSubmission(
        week([
          { outsideTraining: true, dayType: null, activities: "" },
          { outsideTraining: true, dayType: "WORK", activities: "" },
        ]),
      ),
    ).toEqual([]);
  });

  it("Beispielszenario: KW 52/2026, Freitag 25.12. von „Feiertag“ auf „Berufsschule“ ohne Text → „Tätigkeiten fehlen“", () => {
    const planned = planReportDays({ isoYear: 2026, isoWeek: 52 }, { start: new Date("2026-09-01"), end: null }, "NW");
    expect(planned[4].dayType).toBe("HOLIDAY");
    const days: DayForSubmission[] = planned.map((day, index) => ({
      id: `d${index}`,
      ...day,
      dayType: index < 4 ? "WORK" : "SCHOOL",
      activities: index < 4 ? "Betrieb" : "",
    }));
    expect(validateSubmission(days)).toEqual([
      { dayId: "d4", dayLabel: "Freitag, 25.12.2026", dayShort: "Fr", problem: "ACTIVITIES_MISSING" },
    ]);
    expect(submissionHeadline(validateSubmission(days))).toBe("1 Tag ist unvollständig: Fr");
  });
});
