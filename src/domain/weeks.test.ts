import { describe, expect, it } from "vitest";
import { formatDate, isoWeekMonday, isoWeekWorkdays, toDateInput, weekLabel, weekdayShort } from "./weeks";

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
