import { describe, expect, it } from "vitest";
import {
  DAY_TYPES,
  DAY_TYPE_LABELS,
  MAX_ACTIVITIES_LENGTH,
  activitiesError,
  activitiesLength,
  hasContent,
  normalizeActivities,
  validateDayInputs,
  type DayInput,
} from "./report-days";
import type { DayType } from "./report-generation";

type Stored = { dayType: DayType | null; activities: string };

function validate(inputs: Record<string, DayInput>, stored: Record<string, Stored>, outside: string[] = []) {
  const days = Object.keys(stored).map((id) => ({ id, outsideTraining: outside.includes(id) }));
  return validateDayInputs(days, new Map(Object.entries(inputs)), new Map(Object.entries(stored)));
}

describe("Bericht erfassen", () => {
  it("AK-402 genau fünf Tagesarten: Betrieb, Berufsschule, Urlaub, Krank, Feiertag", () => {
    expect(DAY_TYPES.map((type) => DAY_TYPE_LABELS[type])).toEqual([
      "Betrieb",
      "Berufsschule",
      "Urlaub",
      "Krank",
      "Feiertag",
    ]);
  });

  it("AK-402 andere Tagesarten werden abgewiesen, Meldung am Tag", () => {
    const result = validate(
      { mo: { dayType: "HOMEOFFICE", activities: "" } },
      { mo: { dayType: null, activities: "" } },
    );
    expect(result).toEqual({ ok: false, errors: { mo: { dayType: "Bitte eine der fünf Tagesarten wählen." } } });
  });

  it("AK-405 vorbelegte Tagesart lässt sich ändern, z. B. Feiertag → Berufsschule", () => {
    const result = validate(
      { fr: { dayType: "SCHOOL", activities: "Lernfeld 3" } },
      { fr: { dayType: "HOLIDAY", activities: "" } },
    );
    expect(result).toEqual({ ok: true, updates: [{ id: "fr", dayType: "SCHOOL", activities: "Lernfeld 3" }] });
  });

  it("AK-406 Entwurf darf unvollständig gespeichert werden (Tagesart leer)", () => {
    const result = validate({ mo: { dayType: "", activities: "Notiz" } }, { mo: { dayType: "WORK", activities: "" } });
    expect(result).toEqual({ ok: true, updates: [{ id: "mo", dayType: null, activities: "Notiz" }] });
  });

  it("AK-305 Tage außerhalb der Ausbildung werden nicht geändert", () => {
    const result = validate(
      { mo: { dayType: "WORK", activities: "versucht" } },
      { mo: { dayType: null, activities: "" } },
      ["mo"],
    );
    expect(result).toEqual({ ok: true, updates: [] });
  });

  it("AK-407 Umlaute, Zeilenumbrüche und Leerzeichen bleiben unverändert; nur \\r\\n wird zu \\n", () => {
    const text = "  Prüfung der Größe – „Übergabe“ an Jörg ß\n\nZweite Zeile\t mit Tab  ";
    expect(normalizeActivities(text)).toBe(text);
    expect(normalizeActivities("a\r\nb\rc")).toBe("a\nb\nc");
    const result = validate(
      { mo: { dayType: "WORK", activities: text.replace(/\n/g, "\r\n") } },
      { mo: { dayType: null, activities: "" } },
    );
    expect(result).toEqual({ ok: true, updates: [{ id: "mo", dayType: "WORK", activities: text }] });
  });

  it("AK-407 mindestens 2.000 Zeichen pro Tag; Obergrenze 5.000 mit Meldung am Feld", () => {
    expect(MAX_ACTIVITIES_LENGTH).toBeGreaterThanOrEqual(2000);
    const max = "ä".repeat(MAX_ACTIVITIES_LENGTH);
    expect(activitiesLength(max)).toBe(5000);
    expect(activitiesError(max)).toBeUndefined();
    expect(activitiesError(`${max}xy`)).toBe("Höchstens 5.000 Zeichen – bitte um 2 kürzen.");
    // Zeilenumbruch „\r\n“ zählt als ein Zeichen.
    expect(activitiesLength("a\r\nb")).toBe(3);

    const result = validate(
      { mo: { dayType: "WORK", activities: `${max}!` } },
      { mo: { dayType: null, activities: "" } },
    );
    expect(result).toEqual({
      ok: false,
      errors: { mo: { activities: "Höchstens 5.000 Zeichen – bitte um 1 kürzen." } },
    });
  });

  it("AK-406 nicht mitgeschickte Felder bleiben unverändert, unveränderte Tage werden nicht geschrieben", () => {
    const result = validate(
      { mo: { dayType: null, activities: null }, di: { dayType: "WORK", activities: "gleich" } },
      { mo: { dayType: "SICK", activities: "x" }, di: { dayType: "WORK", activities: "gleich" } },
    );
    expect(result).toEqual({ ok: true, updates: [] });
  });
});

describe("AK-306 hasContent: Bericht mit Inhalt", () => {
  it("AK-306 kein Tag mit Tagesart oder Text: kein Inhalt", () => {
    expect(hasContent([])).toBe(false);
    expect(
      hasContent([
        { dayType: null, activities: "" },
        { dayType: null, activities: null },
      ]),
    ).toBe(false);
  });

  it("AK-306 eine Tagesart oder ein Text genügt", () => {
    expect(
      hasContent([
        { dayType: null, activities: "" },
        { dayType: "SCHOOL", activities: "" },
      ]),
    ).toBe(true);
    expect(hasContent([{ dayType: null, activities: "Netzwerk" }])).toBe(true);
  });
});
