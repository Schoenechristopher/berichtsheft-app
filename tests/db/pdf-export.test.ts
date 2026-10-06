/**
 * PDF-Export mit Datenbank (AK-902 – AK-906): Zugriff, Freigabevermerk nach Freigabe und Rücknahme,
 * Sammel-PDF mit echten Berichten. Das PDF wird erzeugt und wieder ausgelesen.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { now, resetClock, setFixedNow } from "@/domain/clock";
import { deactivatePerson } from "@/lib/people/service";
import { loadRangeExport, loadWeekExport, type ExportResult } from "@/lib/report-export";
import { transitionReport } from "@/lib/report-transitions";
import { ensureReportsForTrainee } from "@/lib/reports";
import { renderReportPdf } from "@/pdf/render";
import { extractPdfText } from "../pdf-text";
import { createPersons, resetDatabase, testDb } from "./helpers";

const prisma = testDb();

afterAll(async () => {
  await resetDatabase(prisma);
  await prisma.$disconnect();
});

afterEach(() => {
  resetClock();
});

type Persons = Awaited<ReturnType<typeof createPersons>>;
let persons: Persons;

beforeEach(async () => {
  await resetDatabase(prisma);
  await prisma.setting.create({ data: { id: 1, federalState: "NW" } });
  setFixedNow("2026-10-06T10:00:00+02:00");
  persons = await createPersons(prisma);
  await ensureReportsForTrainee(prisma, persons.anna.id, now());
});

async function annasReport(isoWeek: number) {
  const report = await prisma.weeklyReport.findUniqueOrThrow({
    where: { traineeId_isoYear_isoWeek: { traineeId: persons.anna.id, isoYear: 2026, isoWeek } },
  });
  await prisma.reportDay.updateMany({
    where: { reportId: report.id, outsideTraining: false },
    data: { dayType: "WORK", activities: `Tätigkeit KW ${isoWeek}` },
  });
  return report;
}

async function pdfText(result: ExportResult) {
  if (!result.ok) {
    throw new Error(`Export fehlgeschlagen: ${result.status} ${result.message}`);
  }
  return extractPdfText(await renderReportPdf(result.document));
}

/** Annas Bericht einreichen und von `trainer` freigeben lassen, zu festen Zeitpunkten. */
async function submitAndApprove(reportId: string, trainer: Persons["bernd"], at: string) {
  setFixedNow("2026-10-06T08:00:00+02:00");
  expect((await transitionReport(prisma, persons.anna, reportId, { action: "SUBMIT" })).ok).toBe(true);
  setFixedNow(at);
  expect((await transitionReport(prisma, trainer, reportId, { action: "APPROVE" })).ok).toBe(true);
}

describe("Freigabevermerk im PDF", () => {
  it("AK-903 nach der Freigabe trägt das PDF den Vermerk mit Name und Datum", async () => {
    const report = await annasReport(40);
    await submitAndApprove(report.id, persons.bernd, "2026-10-07T14:05:00+02:00");

    const result = await loadWeekExport(prisma, persons.anna, report.id, now());
    expect(result).toMatchObject({ ok: true, fileName: "Berichtsheft_Anna_KW40-2026.pdf" });
    const pdf = await pdfText(result);
    expect(pdf.text).toContain("Freigegeben von Bernd am 07.10.2026, 14:05 Uhr");
    expect(pdf.text).toContain("Erstellt am 07.10.2026, 14:05 Uhr");
  });

  it("AK-905 nach der Rücknahme enthält ein neu erzeugtes PDF keinen Freigabevermerk", async () => {
    const report = await annasReport(40);
    await submitAndApprove(report.id, persons.bernd, "2026-10-07T14:05:00+02:00");
    expect((await pdfText(await loadWeekExport(prisma, persons.bernd, report.id, now()))).text).toContain(
      "Freigegeben von Bernd",
    );

    setFixedNow("2026-10-08T09:00:00+02:00");
    const revoked = await transitionReport(prisma, persons.clara, report.id, {
      action: "REVOKE_APPROVAL",
      text: "Mittwoch falsches Datum",
    });
    expect(revoked.ok).toBe(true);

    const pdf = await pdfText(await loadWeekExport(prisma, persons.bernd, report.id, now()));
    expect(pdf.text).toContain("Nicht freigegeben – Status: Abgelehnt");
    expect(pdf.text).not.toContain("Freigabevermerk");
    expect(pdf.text).not.toContain("Freigegeben von");
  });

  it("AK-904 nicht freigegebene Woche ist gekennzeichnet", async () => {
    const report = await annasReport(41);
    const pdf = await pdfText(await loadWeekExport(prisma, persons.anna, report.id, now()));
    expect(pdf.text).toContain("Nicht freigegeben – Status: Entwurf");
  });
});

describe("Sammel-PDF", () => {
  it("AK-902 Wochen des Zeitraums in zeitlicher Reihenfolge, je eine neue Seite, mit Vermerk der freigegebenen", async () => {
    const kw38 = await annasReport(38);
    await annasReport(39);
    await submitAndApprove(kw38.id, persons.clara, "2026-10-06T09:00:00+02:00");

    // 16.09. (Mi, KW 38) bis 28.09. (Mo, KW 40): KW 38, 39 und 40.
    const result = await loadRangeExport(prisma, persons.bernd, persons.anna.id, "2026-09-16", "2026-09-28", now());
    expect(result).toMatchObject({ ok: true, fileName: "Berichtsheft_Anna_2026-09-16_bis_2026-09-28.pdf" });
    const pdf = await pdfText(result);
    expect(pdf.pages.map((page) => /Wochenbericht KW (\d+)/.exec(page)?.[1])).toEqual(["38", "39", "40"]);
    expect(pdf.pages[0]).toContain("Freigegeben von Clara am 06.10.2026, 09:00 Uhr");
    expect(pdf.pages[1]).toContain("Nicht freigegeben – Status: Entwurf");
  });

  it("AK-902 ohne Angabe gilt Ausbildungsbeginn bis heute; ausgeblendete Wochen fehlen", async () => {
    // Beginn nachträglich auf den 15.09. verschoben: KW 36 und 37 sind unberührt und ausgeblendet.
    await prisma.person.update({
      where: { id: persons.anna.id },
      data: { trainingStart: new Date("2026-09-15T00:00:00Z") },
    });
    const result = await loadRangeExport(prisma, persons.anna, persons.anna.id, null, null, now());
    expect(result).toMatchObject({ ok: true, fileName: "Berichtsheft_Anna_2026-09-15_bis_2026-10-06.pdf" });
    const pdf = await pdfText(result);
    expect(pdf.pages.map((page) => /Wochenbericht KW (\d+)/.exec(page)?.[1])).toEqual(["38", "39", "40", "41"]);
  });

  it("AK-902 „Bis“ vor „Von“ wird abgewiesen", async () => {
    expect(await loadRangeExport(prisma, persons.anna, persons.anna.id, "2026-10-01", "2026-09-01", now())).toEqual({
      ok: false,
      status: 400,
      message: "„Bis“ darf nicht vor „Von“ liegen.",
    });
  });
});

describe("Zugriff (AK-906)", () => {
  async function otherTrainee() {
    const otto = await prisma.person.create({
      data: {
        accountId: "test-otto",
        email: "otto@test.invalid",
        name: "Otto",
        role: "TRAINEE",
        trainerId: persons.clara.id,
        trainingStart: new Date("2026-09-01T00:00:00Z"),
      },
    });
    await ensureReportsForTrainee(prisma, otto.id, now());
    const report = await prisma.weeklyReport.findFirstOrThrow({ where: { traineeId: otto.id } });
    return { otto, report };
  }

  it("AK-906 Azubi exportiert nur eigene Berichte; fremde ergeben „Zugriff verweigert“", async () => {
    const own = await annasReport(40);
    const { otto, report } = await otherTrainee();
    expect((await loadWeekExport(prisma, persons.anna, own.id, now())).ok).toBe(true);
    expect((await loadRangeExport(prisma, persons.anna, persons.anna.id, null, null, now())).ok).toBe(true);
    expect(await loadWeekExport(prisma, persons.anna, report.id, now())).toEqual({
      ok: false,
      status: 403,
      message: "Zugriff verweigert",
    });
    expect(await loadRangeExport(prisma, persons.anna, otto.id, null, null, now())).toMatchObject({ status: 403 });
    // Ein Azubi kann auch über die Ausbilder-ID nichts exportieren.
    expect(await loadRangeExport(prisma, persons.anna, persons.bernd.id, null, null, now())).toMatchObject({
      status: 404,
    });
  });

  it("AK-906 unbekannte oder ungültige IDs ergeben „Seite nicht gefunden“", async () => {
    for (const id of ["00000000-0000-4000-8000-000000000000", "kein-bericht"]) {
      expect(await loadWeekExport(prisma, persons.bernd, id, now())).toEqual({
        ok: false,
        status: 404,
        message: "Seite nicht gefunden",
      });
      expect(await loadRangeExport(prisma, persons.bernd, id, null, null, now())).toMatchObject({ status: 404 });
    }
  });

  it("AK-906 Ausbilder exportieren die Berichte aller Azubis, auch deaktivierter", async () => {
    const own = await annasReport(40);
    const { otto, report } = await otherTrainee();
    expect((await deactivatePerson(prisma, persons.bernd, persons.anna.id)).ok).toBe(true);

    for (const trainer of [persons.bernd, persons.clara]) {
      const week = await loadWeekExport(prisma, trainer, own.id, now());
      expect((await pdfText(week)).text).toContain("Tätigkeit KW 40");
      expect((await loadRangeExport(prisma, trainer, persons.anna.id, null, null, now())).ok).toBe(true);
      expect((await loadWeekExport(prisma, trainer, report.id, now())).ok).toBe(true);
      expect((await loadRangeExport(prisma, trainer, otto.id, null, null, now())).ok).toBe(true);
    }
  });

  it("AK-906 deaktivierte Personen exportieren nichts", async () => {
    const own = await annasReport(40);
    const inactive = { ...persons.anna, active: false };
    expect(await loadWeekExport(prisma, inactive, own.id, now())).toMatchObject({ status: 403 });
    expect(await loadRangeExport(prisma, inactive, persons.anna.id, null, null, now())).toMatchObject({
      status: 403,
    });
  });
});
