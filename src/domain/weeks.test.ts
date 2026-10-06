import { describe, expect, it } from "vitest";
import {
  calendarDateIn,
  compareWeeks,
  formatDate,
  isoWeekMonday,
  isoWeekOf,
  isoWeekWorkdays,
  nextIsoWeek,
  toDateInput,
  weekLabel,
  weekRangeLabel,
  weekdayLong,
  weekdayShort,
} from "./weeks";

describe("ISO-Kalenderwochen", () => {
  it("Montag der Woche", () => {
    expect(isoWeekMonday(2026, 36).toISOString()).toBe("2026-08-31T00:00:00.000Z");
    expect(isoWeekMonday(2026, 41).toISOString()).toBe("2026-10-05T00:00:00.000Z");
    expect(isoWeekMonday(2026, 53).toISOString()).toBe("2026-12-28T00:00:00.000Z");
    expect(isoWeekMonday(2027, 1).toISOString()).toBe("2027-01-04T00:00:00.000Z");
  });

  it("Mo–Fr und Beschriftung", () => {
    const days = isoWeekWorkdays(2026, 52);
    expect(days.map(formatDate)).toEqual(["21.12.2026", "22.12.2026", "23.12.2026", "24.12.2026", "25.12.2026"]);
    expect(days.map(weekdayShort)).toEqual(["Mo", "Di", "Mi", "Do", "Fr"]);
    expect(weekLabel(2026, 40)).toBe("KW 40/2026 (28.09.2026 – 02.10.2026)");
    expect(toDateInput(days[0])).toBe("2026-12-21");
    expect(toDateInput(null)).toBe("");
  });
});

describe("Woche eines Datums", () => {
  it("ISO-Woche, Vergleich und Folgewoche, auch am Jahreswechsel", () => {
    const d = (value: string) => new Date(`${value}T00:00:00Z`);
    expect(isoWeekOf(d("2026-10-06"))).toEqual({ isoYear: 2026, isoWeek: 41 });
    expect(isoWeekOf(d("2026-09-01"))).toEqual({ isoYear: 2026, isoWeek: 36 });
    expect(isoWeekOf(d("2027-01-01"))).toEqual({ isoYear: 2026, isoWeek: 53 });
    expect(isoWeekOf(d("2027-01-04"))).toEqual({ isoYear: 2027, isoWeek: 1 });
    expect(isoWeekOf(d("2025-12-29"))).toEqual({ isoYear: 2026, isoWeek: 1 });
    expect(nextIsoWeek({ isoYear: 2026, isoWeek: 53 })).toEqual({ isoYear: 2027, isoWeek: 1 });
    expect(compareWeeks({ isoYear: 2026, isoWeek: 53 }, { isoYear: 2027, isoWeek: 1 })).toBeLessThan(0);
    expect(weekRangeLabel(2026, 41)).toBe("05.10.2026 – 09.10.2026");
    expect(weekdayLong(d("2026-10-05"))).toBe("Montag");
  });

  it("Kalendertag in Europe/Berlin", () => {
    expect(toDateInput(calendarDateIn(new Date("2026-10-04T22:30:00Z"), "Europe/Berlin"))).toBe("2026-10-05");
    expect(toDateInput(calendarDateIn(new Date("2026-10-04T21:59:00Z"), "Europe/Berlin"))).toBe("2026-10-04");
    // Winterzeit: UTC+1.
    expect(toDateInput(calendarDateIn(new Date("2026-12-31T23:00:00Z"), "Europe/Berlin"))).toBe("2027-01-01");
  });
});
