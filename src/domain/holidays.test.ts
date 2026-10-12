import { describe, expect, it } from "vitest";
import { ONE_TIME_HOLIDAYS, isPublicHoliday, publicHolidays } from "./holidays";

const date = (value: string) => new Date(`${value}T00:00:00Z`);

describe("Feiertage je Bundesland", () => {
  it("AK-404 Fr 25.12.2026 ist überall Feiertag; Do 27.05.2027 (Fronleichnam) in NW ja, in NI nein", () => {
    expect(isPublicHoliday(date("2026-12-25"), "NW")).toBe(true);
    expect(isPublicHoliday(date("2026-12-25"), "NI")).toBe(true);
    expect(isPublicHoliday(date("2027-05-27"), "NW")).toBe(true);
    expect(isPublicHoliday(date("2027-05-27"), "NI")).toBe(false);
    expect(isPublicHoliday(date("2026-12-28"), "NW")).toBe(false);
  });

  it("AK-1206 einmalige landesweite Feiertage in Berlin: 08.05.2020, 08.05.2025, 17.06.2028", () => {
    expect(isPublicHoliday(date("2020-05-08"), "BE")).toBe(true);
    expect(isPublicHoliday(date("2025-05-08"), "BE")).toBe(true);
    expect(isPublicHoliday(date("2028-06-17"), "BE")).toBe(true);
    expect(isPublicHoliday(date("2025-05-08"), "NW")).toBe(false);
    expect(isPublicHoliday(date("2025-05-08"), "BB")).toBe(false);
    // Nur in diesen Jahren, nicht jedes Jahr.
    expect(isPublicHoliday(date("2026-05-08"), "BE")).toBe(false);
    expect(isPublicHoliday(date("2021-05-08"), "BE")).toBe(false);
    expect(publicHolidays(2025, "BE").has("2025-05-08")).toBe(true);
    expect(publicHolidays(2026, "BE").has("2025-05-08")).toBe(false);
  });

  it("AK-1206 Reformationstag 31.10.2017 war bundesweit Feiertag, in HB, HH, NI und SH erst ab 2018 jedes Jahr", () => {
    for (const state of ["BW", "BY", "BE", "HB", "HH", "HE", "NI", "NW", "RP", "SL", "SH"]) {
      expect(isPublicHoliday(date("2017-10-31"), state)).toBe(true);
    }
    for (const state of ["HB", "HH", "NI", "SH"]) {
      expect(isPublicHoliday(date("2016-10-31"), state)).toBe(false);
      expect(isPublicHoliday(date("2018-10-31"), state)).toBe(true);
    }
    expect(isPublicHoliday(date("2016-10-31"), "SN")).toBe(true);
    expect(isPublicHoliday(date("2026-10-31"), "NW")).toBe(false);
  });

  it("AK-1206 regionale Feiertage zählen nicht: Augsburger Friedensfest, Fronleichnam in SN und TH", () => {
    expect(isPublicHoliday(date("2026-08-08"), "BY")).toBe(false);
    expect(isPublicHoliday(date("2027-05-27"), "SN")).toBe(false);
    expect(isPublicHoliday(date("2027-05-27"), "TH")).toBe(false);
  });

  it("AK-1206 weitere landesweite Feiertage einzelner Länder ab ihrem Einführungsjahr", () => {
    // Frauentag: Berlin ab 2019, Mecklenburg-Vorpommern ab 2023; Weltkindertag: Thüringen ab 2019.
    expect([2018, 2019].map((year) => isPublicHoliday(date(`${year}-03-08`), "BE"))).toEqual([false, true]);
    expect([2022, 2023].map((year) => isPublicHoliday(date(`${year}-03-08`), "MV"))).toEqual([false, true]);
    expect([2018, 2019].map((year) => isPublicHoliday(date(`${year}-09-20`), "TH"))).toEqual([false, true]);
    // Buß- und Bettag nur in Sachsen.
    expect(isPublicHoliday(date("2026-11-18"), "SN")).toBe(true);
    expect(isPublicHoliday(date("2026-11-18"), "BY")).toBe(false);
  });

  it("AK-1205 unbekanntes Bundesland wird abgewiesen", () => {
    expect(() => publicHolidays(2026, "XX")).toThrow("Unbekanntes Bundesland: XX");
    expect(() => isPublicHoliday(date("2026-12-25"), "AUGSBURG")).toThrow(/Unbekanntes Bundesland/);
  });

  it("AK-1206 Ergänzungsliste enthält nur gültige Kalendertage", () => {
    for (const dates of Object.values(ONE_TIME_HOLIDAYS)) {
      for (const value of dates ?? []) {
        expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(date(value).toISOString().slice(0, 10)).toBe(value);
      }
    }
  });
});
