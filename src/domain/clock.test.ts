import { afterEach, describe, expect, it } from "vitest";
import { clockFromEnvironment, fixedClock, now, resetClock, setClock, setFixedNow } from "./clock";

describe("Uhr-Modul", () => {
  afterEach(() => {
    resetClock();
  });

  it("AK-1201 Uhr ist in Tests fest einstellbar: Montag 12.10.2026, 9:00 Uhr Europe/Berlin", () => {
    setFixedNow("2026-10-12T09:00:00+02:00");

    expect(now().toISOString()).toBe("2026-10-12T07:00:00.000Z");
    const parts = new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(now());
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
    expect([part("weekday"), part("hour"), part("minute")]).toEqual(["Montag", "09", "00"]);
  });

  it("AK-1201 feste Uhr bleibt stehen, auch wenn echte Zeit vergeht", async () => {
    setFixedNow(new Date("2026-12-25T10:00:00+01:00"));
    const first = now();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(now().getTime()).toBe(first.getTime());
  });

  it("AK-1201 liefert jedes Mal eine neue Date-Instanz, Änderungen wirken nicht auf die Uhr zurück", () => {
    setFixedNow("2026-10-06T08:00:00Z");
    const value = now();
    value.setFullYear(2000);
    expect(now().toISOString()).toBe("2026-10-06T08:00:00.000Z");
  });

  it("AK-1201 setClock akzeptiert eine eigene Uhr", () => {
    let ticks = 0;
    setClock({ now: () => new Date(Date.UTC(2026, 0, 1) + ticks++ * 1000) });
    expect(now().toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(now().toISOString()).toBe("2026-01-01T00:00:01.000Z");
  });

  it("AK-1201 resetClock kehrt zur echten Uhr zurück", () => {
    setFixedNow("2000-01-01T00:00:00Z");
    resetClock();
    const before = Date.now();
    const value = now().getTime();
    expect(value).toBeGreaterThanOrEqual(before);
    expect(value).toBeLessThanOrEqual(Date.now());
  });

  it("AK-1201 APP_FIXED_NOW stellt die Uhr außerhalb von Produktion fest", () => {
    const clock = clockFromEnvironment({ APP_FIXED_NOW: "2026-10-19T09:00:00+02:00", NODE_ENV: "test" });
    expect(clock.now().toISOString()).toBe("2026-10-19T07:00:00.000Z");
  });

  it("AK-1201 APP_FIXED_NOW wirkt in Produktion nicht", () => {
    const clock = clockFromEnvironment({ APP_FIXED_NOW: "2000-01-01T00:00:00Z", NODE_ENV: "production" });
    expect(clock.now().getFullYear()).toBeGreaterThan(2000);
  });

  it("AK-1201 ungültiger Zeitpunkt wird abgewiesen", () => {
    expect(() => fixedClock("kein Datum")).toThrow(/Ungültiger Zeitpunkt/);
  });
});
