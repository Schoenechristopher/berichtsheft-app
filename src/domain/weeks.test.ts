import { describe, expect, it } from "vitest";
import {
  APP_TIME_ZONE,
  InvalidIsoWeekError,
  calendarDateIn,
  compareWeeks,
  formatDate,
  isoWeekMonday,
  isoWeekOf,
  isoWeekWorkdays,
  isoWeeksInYear,
  isValidIsoWeek,
  currentIsoWeek,
  nextIsoWeek,
  today,
  toDateInput,
  weekLabel,
  weekRangeLabel,
  weekRangeShort,
  weekdayLong,
  weekdayShort,
} from "./weeks";

describe("ISO-Kalenderwochen", () => {
  it("AK-1203 Montag der Woche", () => {
    expect(isoWeekMonday(2026, 36).toISOString()).toBe("2026-08-31T00:00:00.000Z");
    expect(isoWeekMonday(2026, 41).toISOString()).toBe("2026-10-05T00:00:00.000Z");
    expect(isoWeekMonday(2026, 53).toISOString()).toBe("2026-12-28T00:00:00.000Z");
    expect(isoWeekMonday(2027, 1).toISOString()).toBe("2027-01-04T00:00:00.000Z");
  });

  it("AK-1203 Mo–Fr und Beschriftung", () => {
    const days = isoWeekWorkdays(2026, 52);
    expect(days.map(formatDate)).toEqual(["21.12.2026", "22.12.2026", "23.12.2026", "24.12.2026", "25.12.2026"]);
    expect(days.map(weekdayShort)).toEqual(["Mo", "Di", "Mi", "Do", "Fr"]);
    expect(weekLabel(2026, 40)).toBe("KW 40/2026 (28.09.2026 – 02.10.2026)");
    expect(toDateInput(days[0])).toBe("2026-12-21");
    expect(toDateInput(null)).toBe("");
  });
});

describe("Woche eines Datums", () => {
  it("AK-1203 ISO-Woche, Vergleich und Folgewoche, auch am Jahreswechsel", () => {
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

  it("AK-1202 Kalendertag in Europe/Berlin", () => {
    expect(toDateInput(calendarDateIn(new Date("2026-10-04T22:30:00Z"), "Europe/Berlin"))).toBe("2026-10-05");
    expect(toDateInput(calendarDateIn(new Date("2026-10-04T21:59:00Z"), "Europe/Berlin"))).toBe("2026-10-04");
    // Winterzeit: UTC+1.
    expect(toDateInput(calendarDateIn(new Date("2026-12-31T23:00:00Z"), "Europe/Berlin"))).toBe("2027-01-01");
  });
});

describe("Kalendertag und Woche in Europe/Berlin", () => {
  it("AK-1202 05.10.2026, 22:30 UTC ist Dienstag, 06.10.2026; Sommer- und Winterzeit", () => {
    expect(APP_TIME_ZONE).toBe("Europe/Berlin");
    const day = today(new Date("2026-10-05T22:30:00Z"));
    expect([toDateInput(day), weekdayLong(day)]).toEqual(["2026-10-06", "Dienstag"]);
    // Sommerzeit (UTC+2) endet am 25.10.2026 um 3:00 Uhr: davor 22:00 UTC, danach 23:00 UTC als Mitternacht.
    expect(toDateInput(today(new Date("2026-10-24T21:59:59Z")))).toBe("2026-10-24");
    expect(toDateInput(today(new Date("2026-10-24T22:00:00Z")))).toBe("2026-10-25");
    expect(toDateInput(today(new Date("2026-10-25T22:59:59Z")))).toBe("2026-10-25");
    expect(toDateInput(today(new Date("2026-10-25T23:00:00Z")))).toBe("2026-10-26");
    // Sommerzeit beginnt am 29.03.2026: Mitternacht vom 29. auf den 30.03. ist 22:00 UTC.
    expect(toDateInput(today(new Date("2026-03-29T22:00:00Z")))).toBe("2026-03-30");
  });

  it("AK-1202 Sonntag 23:59 Uhr Berlin gehört noch zur alten Woche, Montag 0:00 Uhr zur neuen", () => {
    expect(currentIsoWeek(new Date("2026-10-11T23:59:00+02:00"))).toEqual({ isoYear: 2026, isoWeek: 41 });
    expect(currentIsoWeek(new Date("2026-10-12T00:00:00+02:00"))).toEqual({ isoYear: 2026, isoWeek: 42 });
    // Jahreswechsel in Winterzeit: Silvester 23:30 Uhr Berlin ist schon KW 53/2026, Montag 04.01.2027 KW 1/2027.
    expect(currentIsoWeek(new Date("2027-01-03T23:59:00+01:00"))).toEqual({ isoYear: 2026, isoWeek: 53 });
    expect(currentIsoWeek(new Date("2027-01-03T23:00:00Z"))).toEqual({ isoYear: 2027, isoWeek: 1 });
  });
});

describe("Wochen, die es nicht gibt", () => {
  it("AK-1203 Jahre mit 52 und 53 Kalenderwochen", () => {
    expect([2020, 2025, 2026, 2027, 2032].map(isoWeeksInYear)).toEqual([53, 52, 53, 52, 53]);
  });

  it("AK-1204 KW 53/2027 und KW 0 werden abgewiesen, KW 53/2026 nicht", () => {
    expect(isValidIsoWeek(2026, 53)).toBe(true);
    expect(isValidIsoWeek(2027, 53)).toBe(false);
    expect(isValidIsoWeek(2027, 0)).toBe(false);
    expect(isValidIsoWeek(2027, 1.5)).toBe(false);
    expect(isValidIsoWeek(Number.NaN, 1)).toBe(false);
    expect(() => isoWeekMonday(2027, 53)).toThrow(InvalidIsoWeekError);
    expect(() => isoWeekMonday(2027, 53)).toThrow(
      "Ungültige Kalenderwoche: KW 53/2027 (das Jahr 2027 hat 52 Kalenderwochen).",
    );
    expect(() => isoWeekMonday(2026, 0)).toThrow(InvalidIsoWeekError);
    expect(() => isoWeekMonday(2026, 54)).toThrow(InvalidIsoWeekError);
  });

  it("AK-1204 eine ungültige Woche rutscht nirgends still ins Nachbarjahr", () => {
    expect(() => isoWeekWorkdays(2027, 53)).toThrow(InvalidIsoWeekError);
    expect(() => weekLabel(2027, 53)).toThrow(InvalidIsoWeekError);
    expect(() => weekRangeLabel(2027, 0)).toThrow(InvalidIsoWeekError);
    expect(() => weekRangeShort(2027, 53)).toThrow(InvalidIsoWeekError);
    expect(() => nextIsoWeek({ isoYear: 2027, isoWeek: 53 })).toThrow(InvalidIsoWeekError);
    expect(nextIsoWeek({ isoYear: 2027, isoWeek: 52 })).toEqual({ isoYear: 2028, isoWeek: 1 });
  });

  it("AK-1204 Wochen aus einem Kalendertag gibt es immer (jeder Tag von 2000 bis 2040)", () => {
    const invalid: string[] = [];
    for (let time = Date.UTC(2000, 0, 1); time <= Date.UTC(2040, 11, 31); time += 86_400_000) {
      const week = isoWeekOf(new Date(time));
      if (!isValidIsoWeek(week.isoYear, week.isoWeek)) {
        invalid.push(`${toDateInput(new Date(time))}: KW ${week.isoWeek}/${week.isoYear}`);
      }
    }
    expect(invalid).toEqual([]);
  });
});

describe("weekRangeShort", () => {
  it("kurzer Zeitraum für Kacheln", () => {
    expect(weekRangeShort(2026, 41)).toBe("05.10.–09.10.");
    expect(weekRangeShort(2026, 1)).toBe("29.12.–02.01.");
  });
});
