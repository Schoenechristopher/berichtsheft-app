import { describe, expect, it } from "vitest";
import type { HistoryChange } from "./report-history";
import {
  RANGE_MESSAGES,
  defaultExportRange,
  fileNamePart,
  isWeekInRange,
  parseDateInput,
  parseExportRange,
  pdfDayTypeLabel,
  pdfMarking,
  rangePdfDocument,
  rangePdfFileName,
  selectExportWeeks,
  toPdfWeek,
  weekPdfDocument,
  weekPdfFileName,
  type ReportForPdf,
  type WeekForExport,
} from "./report-pdf";

const utc = (date: string) => new Date(`${date}T00:00:00Z`);
const period = { start: utc("2026-09-01"), end: null };

let seq = 0;
const change = (
  fromStatus: HistoryChange["fromStatus"],
  toStatus: HistoryChange["toStatus"],
  actorName: string,
  at: string,
): HistoryChange => ({
  id: `c${++seq}`,
  seq,
  reviewRound: 1,
  fromStatus,
  toStatus,
  actorName,
  reason: null,
  createdAt: new Date(at),
});

const approvedOnce = [
  change("DRAFT", "SUBMITTED", "Anna Azubi", "2026-10-02T15:00:00Z"),
  change("SUBMITTED", "APPROVED", "Bernd Ausbilder", "2026-10-05T12:05:00Z"),
];

describe("Freigabevermerk und Kennzeichnung", () => {
  it("AK-903 freigegebene Woche: Vermerk mit Name des Ausbilders und Datum der Freigabe", () => {
    expect(pdfMarking("APPROVED", approvedOnce)).toMatchObject({
      kind: "APPROVED",
      approverName: "Bernd Ausbilder",
      text: "Freigegeben von Bernd Ausbilder am 05.10.2026, 14:05 Uhr",
    });
  });

  it("AK-903 nach erneuter Freigabe zählt die aktuell gültige", () => {
    const changes = [
      ...approvedOnce,
      change("APPROVED", "REJECTED", "Clara Ausbilderin", "2026-10-06T08:00:00Z"),
      change("REJECTED", "SUBMITTED", "Anna Azubi", "2026-10-06T09:00:00Z"),
      change("SUBMITTED", "APPROVED", "Clara Ausbilderin", "2026-10-07T10:30:00Z"),
    ];
    expect(pdfMarking("APPROVED", changes).text).toBe("Freigegeben von Clara Ausbilderin am 07.10.2026, 12:30 Uhr");
  });

  it("AK-904 nicht freigegebene Wochen sind gekennzeichnet, mit Status", () => {
    expect(pdfMarking("DRAFT", []).text).toBe("Nicht freigegeben – Status: Entwurf");
    expect(pdfMarking("SUBMITTED", approvedOnce.slice(0, 1)).text).toBe("Nicht freigegeben – Status: Eingereicht");
    expect(pdfMarking("REJECTED", []).kind).toBe("NOT_APPROVED");
  });

  it("AK-905 nach der Rücknahme gibt es keinen Vermerk mehr", () => {
    const revoked = [...approvedOnce, change("APPROVED", "REJECTED", "Clara Ausbilderin", "2026-10-06T08:00:00Z")];
    const marking = pdfMarking("REJECTED", revoked);
    expect(marking).toMatchObject({ kind: "NOT_APPROVED", text: "Nicht freigegeben – Status: Abgelehnt" });
    expect(marking.text).not.toContain("Bernd");
  });
});

const report = (
  isoWeek: number,
  overrides: Partial<ReportForPdf & WeekForExport> = {},
): ReportForPdf & WeekForExport => ({
  isoYear: 2026,
  isoWeek,
  status: "DRAFT",
  days: [],
  changes: [],
  hasContent: true,
  hasHistory: false,
  ...overrides,
});

describe("Druckdaten einer Woche", () => {
  it("AK-901 Name, Kalenderwoche, Zeitraum, Tage mit Datum, Tagesart und Tätigkeiten, Status", () => {
    const week = toPdfWeek(
      report(36, {
        days: [
          { date: utc("2026-09-04"), dayType: "SCHOOL", activities: "Lernfeld 1", outsideTraining: false },
          { date: utc("2026-08-31"), dayType: null, activities: "", outsideTraining: true },
          { date: utc("2026-09-01"), dayType: "WORK", activities: "Start", outsideTraining: false },
          { date: utc("2026-09-02"), dayType: null, activities: "", outsideTraining: false },
          { date: utc("2026-09-03"), dayType: "HOLIDAY", activities: "", outsideTraining: false },
        ],
      }),
      "Anna Azubi",
      period,
    );
    expect(week).toMatchObject({
      traineeName: "Anna Azubi",
      title: "KW 36/2026",
      range: "31.08.2026 – 04.09.2026",
      statusLabel: "Entwurf",
      outsideTraining: false,
    });
    expect(week.days.map((day) => [day.label, day.dayTypeLabel, day.activities])).toEqual([
      ["Montag, 31.08.2026", "außerhalb der Ausbildung", ""],
      ["Dienstag, 01.09.2026", "Betrieb", "Start"],
      ["Mittwoch, 02.09.2026", "Tagesart noch offen", ""],
      ["Donnerstag, 03.09.2026", "Feiertag", ""],
      ["Freitag, 04.09.2026", "Berufsschule", "Lernfeld 1"],
    ]);
  });

  it("AK-901 Tage außerhalb der Ausbildung behalten eine gespeicherte Tagesart erkennbar", () => {
    expect(pdfDayTypeLabel({ dayType: "WORK", outsideTraining: true })).toBe("außerhalb der Ausbildung (Betrieb)");
  });

  it("AK-901 Woche ganz außerhalb der Ausbildung ist markiert", () => {
    expect(toPdfWeek(report(35), "Anna Azubi", period).outsideTraining).toBe(true);
  });

  it("AK-901 Erstellungsdatum aus dem Uhr-Zeitpunkt und Titel", () => {
    const document = weekPdfDocument(report(40), "Anna Azubi", period, new Date("2026-10-06T19:00:00Z"));
    expect(document.createdAt).toBe("06.10.2026, 21:00 Uhr");
    expect(document.title).toBe("Berichtsheft Anna Azubi – KW 40/2026");
  });
});

describe("Zeitraum des Sammel-PDF", () => {
  const range = (from: string, to: string) => ({ from: utc(from), to: utc(to) });

  it("AK-902 jede Woche, deren Mo–Fr den Zeitraum berührt", () => {
    // KW 40: 28.09.–02.10.2026, KW 41: 05.–09.10.2026
    expect(isWeekInRange({ isoYear: 2026, isoWeek: 40 }, range("2026-10-02", "2026-10-05"))).toBe(true);
    expect(isWeekInRange({ isoYear: 2026, isoWeek: 41 }, range("2026-10-02", "2026-10-05"))).toBe(true);
    expect(isWeekInRange({ isoYear: 2026, isoWeek: 39 }, range("2026-10-02", "2026-10-05"))).toBe(false);
    // Nur Samstag und Sonntag: keine Woche.
    expect(isWeekInRange({ isoYear: 2026, isoWeek: 40 }, range("2026-10-03", "2026-10-04"))).toBe(false);
    expect(isWeekInRange({ isoYear: 2026, isoWeek: 41 }, range("2026-10-03", "2026-10-04"))).toBe(false);
  });

  it("AK-902 Wochen in zeitlicher Reihenfolge, auch über den Jahreswechsel", () => {
    const reports = [report(41), report(1, { isoYear: 2027 }), report(53), report(36)];
    const selected = selectExportWeeks(reports, range("2026-09-01", "2027-01-08"), period);
    expect(selected.map((r) => `${r.isoWeek}/${r.isoYear}`)).toEqual(["36/2026", "41/2026", "53/2026", "1/2027"]);
  });

  it("AK-902 ausgeblendete Wochen erscheinen nicht, Wochen mit Inhalt außerhalb der Ausbildung schon", () => {
    const shifted = { start: utc("2026-09-14"), end: null };
    const reports = [
      report(36, { hasContent: false }),
      report(37, { hasContent: true }),
      report(38, { hasContent: false }),
    ];
    const selected = selectExportWeeks(reports, range("2026-09-01", "2026-09-30"), shifted);
    expect(selected.map((r) => r.isoWeek)).toEqual([37, 38]);
    const document = rangePdfDocument(reports, "Anna Azubi", shifted, range("2026-09-01", "2026-09-30"), new Date());
    expect(document.weeks.map((week) => [week.isoWeek, week.outsideTraining])).toEqual([
      [37, true],
      [38, false],
    ]);
    expect(document.rangeLabel).toBe("01.09.2026 – 30.09.2026");
  });

  it("AK-902 Von/Bis prüfen und vorbelegen", () => {
    const fallback = defaultExportRange(period, utc("2026-10-06"));
    expect(fallback).toEqual(range("2026-09-01", "2026-10-06"));
    expect(defaultExportRange({ start: utc("2024-09-01"), end: utc("2026-06-30") }, utc("2026-10-06"))).toEqual(
      range("2024-09-01", "2026-06-30"),
    );
    expect(parseExportRange(null, null, fallback)).toEqual({ ok: true, range: fallback });
    expect(parseExportRange("2026-09-15", "2026-10-02", fallback)).toEqual({
      ok: true,
      range: range("2026-09-15", "2026-10-02"),
    });
    expect(parseExportRange("2026-10-02", "2026-09-15", fallback)).toEqual({
      ok: false,
      message: RANGE_MESSAGES.order,
    });
    expect(parseExportRange("2026-02-31", "", fallback)).toEqual({ ok: false, message: RANGE_MESSAGES.invalidFrom });
    expect(parseExportRange("", "morgen", fallback)).toEqual({ ok: false, message: RANGE_MESSAGES.invalidTo });
    expect(parseDateInput("2028-02-29")).toEqual(utc("2028-02-29"));
  });
});

describe("Dateiname", () => {
  it("AK-901 sprechender Dateiname einer Woche", () => {
    expect(weekPdfFileName("Anna Azubi", { isoYear: 2026, isoWeek: 40 })).toBe("Berichtsheft_Anna-Azubi_KW40-2026.pdf");
  });

  it("AK-902 sprechender Dateiname eines Zeitraums", () => {
    expect(rangePdfFileName("Anna Azubi", { from: utc("2026-09-01"), to: utc("2026-10-09") })).toBe(
      "Berichtsheft_Anna-Azubi_2026-09-01_bis_2026-10-09.pdf",
    );
  });

  it("AK-907 Umlaute und Sonderzeichen im Namen werden für den Dateinamen umschrieben", () => {
    expect(fileNamePart("Jörg Müßig-Äpfel")).toBe("Joerg-Muessig-Aepfel");
    expect(fileNamePart("René O'Neil")).toBe("Rene-O-Neil");
    expect(fileNamePart("../..")).toBe("Azubi");
  });
});
