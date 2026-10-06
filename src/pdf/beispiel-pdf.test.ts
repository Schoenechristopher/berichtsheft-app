/**
 * Beispiel-PDFs aus den Seed-Daten, ohne Datenbank. Als Test, weil @react-pdf/renderer nur als
 * ES-Modul läuft (Vitest kann das, `tsx` in diesem Projekt nicht). `npm run pdf:beispiel` schreibt
 * sie nach `beispiel-pdf/` (nicht eingecheckt; in CI als Artefakt „beispiel-pdf“):
 *
 * - Annas Seed-Bericht KW 40/2026, von Bernd freigegeben (Freigabevermerk),
 * - Sammel-PDF KW 36–41/2026 mit Entwürfen, einer abgelehnten und einer langen Woche.
 *
 * Nur Testdaten (Anna, Bernd aus dem Seed). Zeitpunkt fest, damit das Ergebnis vergleichbar bleibt.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractPdfText } from "../../tests/pdf-text";
import type { DayType } from "@/domain/report-generation";
import { planReportDays } from "@/domain/report-generation";
import type { HistoryChange } from "@/domain/report-history";
import {
  rangePdfDocument,
  rangePdfFileName,
  weekPdfDocument,
  weekPdfFileName,
  type ReportForPdf,
  type WeekForExport,
} from "@/domain/report-pdf";
import { toDateInput } from "@/domain/weeks";
import { renderReportPdf } from "./render";
import { seedFederalState, seedPersons, seedReport } from "@/lib/seed-data";

/** Zielordner; ohne `PDF_BEISPIEL_DIR` wird nur geprüft, nicht geschrieben. */
const outDir = process.env.PDF_BEISPIEL_DIR ? path.resolve(process.env.PDF_BEISPIEL_DIR) : null;
const created = new Date("2026-10-09T16:30:00+02:00");
const anna = seedPersons.anna.name;
const period = { start: new Date(`${seedPersons.anna.trainingStart}T00:00:00Z`), end: null };

let seq = 0;
function change(from: HistoryChange["fromStatus"], to: HistoryChange["toStatus"], actor: string, at: string) {
  seq++;
  return {
    id: `c${seq}`,
    seq,
    reviewRound: 1,
    fromStatus: from,
    toStatus: to,
    actorName: actor,
    reason: null,
    createdAt: new Date(at),
  };
}

/** Bericht einer Woche 2026 wie von der Wochenerzeugung angelegt, mit Inhalt je Tag. */
function report(
  isoWeek: number,
  status: ReportForPdf["status"],
  changes: HistoryChange[],
  content: (date: string) => { dayType: DayType | null; activities: string },
): ReportForPdf & WeekForExport {
  const days = planReportDays({ isoYear: 2026, isoWeek }, period, seedFederalState).map((day) => ({
    ...day,
    ...(day.outsideTraining ? { dayType: null, activities: "" } : content(toDateInput(day.date))),
  }));
  return { isoYear: 2026, isoWeek, status, changes, days, hasContent: true, hasHistory: changes.length > 0 };
}

const seedDays = new Map<string, { dayType: DayType | null; activities: string }>(
  seedReport.days.map((day) => [day.date, { dayType: day.dayType, activities: day.activities }]),
);
const kw40 = report(
  40,
  "APPROVED",
  [
    change("DRAFT", "SUBMITTED", anna, "2026-10-02T15:10:00Z"),
    change("SUBMITTED", "APPROVED", seedPersons.bernd.name, "2026-10-05T07:45:00Z"),
  ],
  (date) => {
    const day = seedDays.get(date);
    return day?.dayType ? day : { dayType: "WORK", activities: "Störungstickets geprüft, Übergabe an den 2nd-Level." };
  },
);
const long = "Größere Inbetriebnahme: Switches konfiguriert, VLANs dokumentiert, Überwachung eingerichtet. ";

const weeks = [
  report(
    36,
    "APPROVED",
    [
      change("DRAFT", "SUBMITTED", anna, "2026-09-04T14:00:00Z"),
      change("SUBMITTED", "APPROVED", seedPersons.bernd.name, "2026-09-07T08:00:00Z"),
    ],
    () => ({
      dayType: "WORK",
      activities: "Begrüßung, Sicherheitsunterweisung, Rundgang durch alle Abteilungen.",
    }),
  ),
  report(
    37,
    "REJECTED",
    [
      change("DRAFT", "SUBMITTED", anna, "2026-09-11T14:00:00Z"),
      change("SUBMITTED", "REJECTED", seedPersons.bernd.name, "2026-09-14T08:00:00Z"),
    ],
    () => ({
      dayType: "SCHOOL",
      activities: "Lernfeld 1: Das Unternehmen und die eigene Rolle im Betrieb beschreiben.",
    }),
  ),
  report(38, "SUBMITTED", [change("DRAFT", "SUBMITTED", anna, "2026-09-18T14:00:00Z")], () => ({
    dayType: "WORK",
    activities: long.repeat(30).trim(),
  })),
  report(39, "DRAFT", [], () => ({ dayType: "VACATION", activities: "" })),
  kw40,
  report(41, "DRAFT", [], () => ({ dayType: null, activities: "" })),
];

describe("Beispiel-PDF aus den Seed-Daten", () => {
  it("AK-901 AK-902 AK-903 AK-904 Einzelwoche und Sammel-PDF erzeugen", async () => {
    const single = await renderReportPdf(weekPdfDocument(kw40, anna, period, created));
    const range = { from: period.start, to: new Date("2026-10-09T00:00:00Z") };
    const collection = await renderReportPdf(rangePdfDocument(weeks, anna, period, range, created));

    expect((await extractPdfText(single)).text).toContain("Freigegeben von Bernd Ausbilder am 05.10.2026, 09:45 Uhr");
    const pages = (await extractPdfText(collection)).pages;
    expect(pages.filter((page) => page.includes("Wochenbericht KW ")).length).toBe(weeks.length);

    if (outDir) {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(path.join(outDir, weekPdfFileName(anna, kw40)), single);
      writeFileSync(path.join(outDir, rangePdfFileName(anna, range)), collection);
      console.info(`Beispiel-PDFs in ${outDir}`);
    }
  });
});
