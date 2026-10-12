import { describe, expect, it } from "vitest";
import { firstLine, progressLabel, weekProgress } from "./week-progress";
import { isoWeekWorkdays } from "./weeks";

const dates = isoWeekWorkdays(2026, 41);

describe("Wochenfortschritt", () => {
  it("UI-AK-04 zählt ausgefüllte Tage nach den Pflichtangaben, Tage außerhalb der Ausbildung nicht", () => {
    const progress = weekProgress([
      { date: dates[0], dayType: null, activities: "", outsideTraining: true },
      { date: dates[1], dayType: "WORK", activities: "Server gepatcht", outsideTraining: false },
      { date: dates[2], dayType: "SCHOOL", activities: "   ", outsideTraining: false },
      { date: dates[3], dayType: "SICK", activities: "", outsideTraining: false },
      { date: dates[4], dayType: null, activities: "Text ohne Tagesart", outsideTraining: false },
    ]);
    expect(progress.days.map((day) => [day.weekday, day.mark])).toEqual([
      ["Mo", "outside"],
      ["Di", "filled"],
      ["Mi", "empty"],
      ["Do", "filled"],
      ["Fr", "empty"],
    ]);
    expect(progressLabel(progress)).toBe("2 von 4 Tagen ausgefüllt");
    expect(progressLabel({ filled: 1, total: 1 })).toBe("1 von 1 Tag ausgefüllt");
  });

  it("erste Zeile eines Kommentars, gekürzt", () => {
    expect(firstLine("  Bitte genauer.\nZweite Zeile")).toBe("Bitte genauer.");
    expect(firstLine("x".repeat(200), 10)).toBe(`${"x".repeat(9)}…`);
  });
});
