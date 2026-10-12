import { describe, expect, it } from "vitest";
import { relativeTime } from "./relative-time";

const now = new Date("2026-10-12T10:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("relativeTime", () => {
  it("nennt Minuten, Stunden, Tage, Monate und Jahre", () => {
    expect(relativeTime(ago(20_000), now)).toBe("gerade eben");
    expect(relativeTime(ago(5 * MIN), now)).toBe("vor 5 Min.");
    expect(relativeTime(ago(2 * HOUR + 10 * MIN), now)).toBe("vor 2 Std.");
    expect(relativeTime(ago(DAY + HOUR), now)).toBe("vor 1 Tag");
    expect(relativeTime(ago(3 * DAY), now)).toBe("vor 3 Tagen");
    expect(relativeTime(ago(31 * DAY), now)).toBe("vor 1 Monat");
    expect(relativeTime(ago(100 * DAY), now)).toBe("vor 3 Monaten");
    expect(relativeTime(ago(400 * DAY), now)).toBe("vor 1 Jahr");
    expect(relativeTime(ago(800 * DAY), now)).toBe("vor 2 Jahren");
  });

  it("Zeitpunkte in der Zukunft (Uhren leicht versetzt) gelten als „gerade eben“", () => {
    expect(relativeTime(new Date(now.getTime() + 5000), now)).toBe("gerade eben");
  });
});
