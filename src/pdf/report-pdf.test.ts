/**
 * Layout-Tests: PDF erzeugen und den Text wieder auslesen (AK-901 – AK-907).
 */
import { describe, expect, it } from "vitest";
import { extractPdfText, withoutWhitespace } from "../../tests/pdf-text";
import type { DayType } from "@/domain/report-generation";
import type { HistoryChange } from "@/domain/report-history";
import { rangePdfDocument, weekPdfDocument, type ReportForPdf, type WeekForExport } from "@/domain/report-pdf";
import { isoWeekOf, isoWeekWorkdays } from "@/domain/weeks";
import { breakableParts } from "./fonts";
import { renderReportPdf } from "./render";

const utc = (date: string) => new Date(`${date}T00:00:00Z`);
const period = { start: utc("2026-09-01"), end: null };
const now = new Date("2026-10-06T19:00:00Z");

function week(
  isoWeek: number,
  options: {
    isoYear?: number;
    status?: ReportForPdf["status"];
    changes?: HistoryChange[];
    days?: { dayType: DayType | null; activities: string; outsideTraining?: boolean }[];
  } = {},
): ReportForPdf & WeekForExport {
  const isoYear = options.isoYear ?? 2026;
  return {
    isoYear,
    isoWeek,
    status: options.status ?? "DRAFT",
    changes: options.changes ?? [],
    hasContent: true,
    hasHistory: (options.changes ?? []).length > 0,
    days: isoWeekWorkdays(isoYear, isoWeek).map((date, index) => ({
      date,
      dayType: options.days?.[index] ? options.days[index].dayType : "WORK",
      activities: options.days?.[index]?.activities ?? `Tätigkeit KW ${isoWeek} Tag ${index + 1}`,
      outsideTraining: options.days?.[index]?.outsideTraining ?? false,
    })),
  };
}

const approval = (actorName: string, at: string): HistoryChange[] => [
  {
    id: "s1",
    seq: 1,
    reviewRound: 1,
    fromStatus: "DRAFT",
    toStatus: "SUBMITTED",
    actorName: "Anna Azubi",
    reason: null,
    createdAt: new Date("2026-10-02T15:00:00Z"),
  },
  {
    id: "s2",
    seq: 2,
    reviewRound: 1,
    fromStatus: "SUBMITTED",
    toStatus: "APPROVED",
    actorName,
    reason: null,
    createdAt: new Date(at),
  },
];

async function renderWeek(report: ReportForPdf) {
  const buffer = await renderReportPdf(weekPdfDocument(report, "Anna Azubi", period, now));
  expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  return extractPdfText(buffer);
}

describe("PDF einer Woche", () => {
  it("AK-901 enthält Name, Kalenderwoche, Zeitraum, alle Tage mit Datum, Tagesart und Tätigkeiten sowie den Status", async () => {
    const pdf = await renderWeek(
      week(36, {
        days: [
          { dayType: null, activities: "", outsideTraining: true },
          { dayType: "WORK", activities: "Arbeitsplatz eingerichtet" },
          { dayType: "SCHOOL", activities: "Lernfeld 1" },
          { dayType: "VACATION", activities: "" },
          { dayType: null, activities: "" },
        ],
      }),
    );
    expect(pdf.pages).toHaveLength(1);
    const text = pdf.text;
    for (const expected of [
      "Wochenbericht KW 36/2026",
      "Anna Azubi",
      "31.08.2026 – 04.09.2026",
      "Status",
      "Entwurf",
      "Montag, 31.08.2026",
      "außerhalb der Ausbildung",
      "Dienstag, 01.09.2026",
      "Betrieb",
      "Arbeitsplatz eingerichtet",
      "Mittwoch, 02.09.2026",
      "Berufsschule",
      "Lernfeld 1",
      "Donnerstag, 03.09.2026",
      "Urlaub",
      "Freitag, 04.09.2026",
      "Tagesart noch offen",
      "Erstellt am 06.10.2026, 21:00 Uhr",
      "Seite 1 von 1",
    ]) {
      expect(text).toContain(expected);
    }
    // Tage in der Reihenfolge Mo–Fr
    const positions = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"].map((day) =>
      text.indexOf(`${day}, `),
    );
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(pdf.title).toBe("Berichtsheft Anna Azubi – KW 36/2026");
  });

  it("AK-903 freigegebene Woche trägt den Freigabevermerk mit Name und Datum", async () => {
    const pdf = await renderWeek(
      week(40, { status: "APPROVED", changes: approval("Bernd Ausbilder", "2026-10-05T12:05:00Z") }),
    );
    expect(pdf.text).toContain("Freigabevermerk");
    expect(pdf.text).toContain("Freigegeben von Bernd Ausbilder am 05.10.2026, 14:05 Uhr");
    expect(pdf.text).not.toContain("Nicht freigegeben");
  });

  it("AK-904 nicht freigegebene Wochen sind deutlich gekennzeichnet, auf jeder Seite", async () => {
    for (const [status, label] of [
      ["DRAFT", "Entwurf"],
      ["SUBMITTED", "Eingereicht"],
      ["REJECTED", "Abgelehnt"],
    ] as const) {
      const pdf = await renderWeek(week(40, { status }));
      expect(pdf.text).toContain(`Nicht freigegeben – Status: ${label}`);
      expect(pdf.text).not.toContain("Freigabevermerk");
      expect(pdf.text).not.toContain("Freigegeben von");
    }
    const long = await renderWeek(
      week(40, { days: Array(5).fill({ dayType: "WORK", activities: "Text ".repeat(900) }) }),
    );
    expect(long.pages.length).toBeGreaterThan(1);
    for (const page of long.pages) {
      expect(page).toContain("KW 40/2026 · Nicht freigegeben (Entwurf)");
    }
  });

  it("AK-905 nach der Rücknahme enthält ein neu erzeugtes PDF keinen Freigabevermerk", async () => {
    const changes = [
      ...approval("Bernd Ausbilder", "2026-10-05T12:05:00Z"),
      {
        id: "s3",
        seq: 3,
        reviewRound: 1,
        fromStatus: "APPROVED" as const,
        toStatus: "REJECTED" as const,
        actorName: "Clara Ausbilderin",
        reason: "Mittwoch falsches Datum",
        createdAt: new Date("2026-10-06T08:00:00Z"),
      },
    ];
    const pdf = await renderWeek(week(40, { status: "REJECTED", changes }));
    expect(pdf.text).toContain("Nicht freigegeben – Status: Abgelehnt");
    expect(pdf.text).not.toContain("Freigabevermerk");
    expect(pdf.text).not.toContain("Freigegeben von");
    // Kommentare und Begründungen gehören nicht ins PDF (Vorschlag, siehe PR).
    expect(pdf.text).not.toContain("Mittwoch falsches Datum");
  });

  it("AK-907 Umlaute und 5.000 Zeichen pro Tag erscheinen vollständig", async () => {
    const umlauts = "Prüfung der Größe: Äpfel, Öfen, Übungen – äöü ÄÖÜ ß „Anführung“ € 1½ ";
    const days = Array.from({ length: 5 }, (_, index) => {
      let text = `Tag ${index + 1}: `;
      let line = 0;
      while (Array.from(text).length < 5000) {
        text += line % 7 === 6 ? `${umlauts}\n` : umlauts;
        line++;
      }
      return { dayType: "WORK" as const, activities: Array.from(text).slice(0, 5000).join("") };
    });
    expect(days.every((day) => Array.from(day.activities).length === 5000)).toBe(true);
    const pdf = await renderWeek(week(40, { days }));
    const extracted = withoutWhitespace(pdf.pages.map(withoutRunningHeaders).join(""));
    let position = 0;
    for (const day of days) {
      const expected = withoutWhitespace(day.activities);
      const found = extracted.indexOf(expected, position);
      expect(found, `Text von „${day.activities.slice(0, 5)}“ vollständig und in Reihenfolge`).toBeGreaterThanOrEqual(
        0,
      );
      position = found + expected.length;
    }
    expect(pdf.text).toContain("äöü ÄÖÜ ß");
  });

  it("AK-907 überlange Wörter ohne Leerzeichen werden umbrochen, nicht abgeschnitten", async () => {
    const word = "Ä".repeat(10) + "x".repeat(990);
    const pdf = await renderWeek(week(40, { days: [{ dayType: "WORK", activities: `Adresse: ${word} Ende` }] }));
    expect(pdf.text.match(/x/g)).toHaveLength(990);
    expect(pdf.text.match(/Ä/g)).toHaveLength(10);
    expect(pdf.text).toContain("Ende");
    expect(breakableParts("Ausbildungsnachweis")).toEqual(["Ausbildungsnachweis"]);
  });
});

/** Entfernt Kopf- und Fußzeile, damit sie den Fließtext beim Vergleich nicht unterbrechen. */
function withoutRunningHeaders(page: string): string {
  return page
    .split("\n")
    .filter(
      (line) => !line.startsWith("Berichtsheft · ") && !line.startsWith("KW ") && !line.startsWith("Erstellt am "),
    )
    .filter((line) => !/^Seite \d+ von \d+$/.test(line))
    .join("\n");
}

describe("Sammel-PDF", () => {
  const range = { from: utc("2026-09-01"), to: utc("2026-10-09") };

  it("AK-902 alle Wochen in zeitlicher Reihenfolge, jede beginnt auf einer neuen Seite", async () => {
    const reports = [
      week(41),
      week(38, { days: Array(5).fill({ dayType: "WORK", activities: "Lang ".repeat(1200) }) }),
      week(36),
      week(40, { status: "APPROVED", changes: approval("Bernd Ausbilder", "2026-10-05T12:05:00Z") }),
      week(42),
    ];
    const document = rangePdfDocument(reports, "Anna Azubi", period, range, now);
    const pdf = await extractPdfText(await renderReportPdf(document));

    const starts = pdf.pages.flatMap((page, index) => {
      const match = /Wochenbericht KW (\d+)\/2026/.exec(page);
      return match ? [{ week: Number(match[1]), page: index }] : [];
    });
    expect(starts.map((start) => start.week)).toEqual([36, 38, 40, 41]);
    // KW 38 läuft über mehrere Seiten; KW 40 beginnt trotzdem auf einer eigenen neuen Seite.
    expect(starts[2].page - starts[1].page).toBeGreaterThan(1);
    for (const start of starts) {
      expect(pdf.pages[start.page]).toContain(`KW ${start.week}/2026 ·`);
    }
    expect(pdf.pages[starts[2].page]).toContain("Freigegeben von Bernd Ausbilder");
    expect(pdf.pages.at(-1)).toContain(`Seite ${pdf.pages.length} von ${pdf.pages.length}`);
    expect(pdf.text).not.toContain("KW 42/2026");
    expect(pdf.title).toBe("Berichtsheft Anna Azubi – 01.09.2026 – 09.10.2026");
  });

  it("AK-902 ohne Wochen im Zeitraum entsteht ein PDF mit Hinweis", async () => {
    const document = rangePdfDocument([], "Anna Azubi", period, range, now);
    const pdf = await extractPdfText(await renderReportPdf(document));
    expect(pdf.pages).toHaveLength(1);
    expect(pdf.text).toContain("Im Zeitraum 01.09.2026 – 09.10.2026 gibt es keine Wochenberichte.");
  });

  it("AK-902 Laufzeit: Sammel-PDF über eine ganze Ausbildung (150 Wochen)", async () => {
    const activities = "Kundenauftrag bearbeitet, Netzwerk geprüft, Dokumentation ergänzt. ".repeat(6);
    const reports = Array.from({ length: 150 }, (_, index) => {
      const monday = new Date(utc("2026-09-07").getTime() + index * 7 * 86_400_000);
      const isoWeek = isoWeekOf(monday);
      return week(isoWeek.isoWeek, {
        isoYear: isoWeek.isoYear,
        status: index % 3 === 0 ? "DRAFT" : "APPROVED",
        changes: index % 3 === 0 ? [] : approval("Bernd Ausbilder", "2026-10-05T12:05:00Z"),
        days: Array(5).fill({ dayType: "WORK", activities }),
      });
    });
    const started = performance.now();
    const document = rangePdfDocument(
      reports,
      "Anna Azubi",
      period,
      { from: utc("2026-09-01"), to: utc("2029-12-31") },
      now,
    );
    const buffer = await renderReportPdf(document);
    const seconds = (performance.now() - started) / 1000;
    const pdf = await extractPdfText(buffer);
    console.info(
      `AK-902 Laufzeit: 150 Wochen, ${pdf.pages.length} Seiten, ${(buffer.length / 1024).toFixed(0)} KiB in ${seconds.toFixed(2)} s`,
    );
    expect(pdf.pages.filter((page) => page.includes("Wochenbericht KW "))).toHaveLength(150);
    expect(seconds).toBeLessThan(30);
  }, 120_000);
});
