import { expect, test } from "@playwright/test";
import {
  accounts,
  annasSeedReportId,
  deletePersons,
  downloadPdf,
  insertTrainee,
  login,
  personId,
  withDatabase,
} from "./helpers";

/**
 * PDF-Export (Etappe 5) über die Oberfläche: Download einer Woche und eines Zeitraums, Zugriff
 * (AK-906). Inhalt und Layout prüfen ausführlich die Vitest-Tests (`src/pdf/`, `tests/db/`).
 */
const otto = { name: "Otto Fremd", email: "otto.fremd@berichtsheft.test" };

test.describe("PDF-Export", () => {
  test.describe.configure({ mode: "serial" });

  test.afterEach(async () => {
    await deletePersons(otto.email);
  });

  test("AK-906 AK-901 Azubi lädt den eigenen Wochenbericht als PDF herunter", async ({ page }) => {
    await login(page, accounts.anna);
    await page.goto(`/berichte/${await annasSeedReportId()}`);
    const pdf = await downloadPdf(page, () => page.getByRole("link", { name: "Als PDF herunterladen" }).click());
    expect(pdf.fileName).toBe("Berichtsheft_Anna-Azubi_KW40-2026.pdf");
    expect(pdf.text).toContain("Wochenbericht KW 40/2026");
    expect(pdf.text).toContain("Anna Azubi");
    expect(pdf.text).toContain("28.09.2026 – 02.10.2026");
    expect(pdf.text).toContain("Einführung in die Abteilung, Arbeitsplatz eingerichtet.");
    expect(pdf.text).toContain("Nicht freigegeben – Status: Entwurf");
    expect(pdf.text).toContain("Seite 1 von 1");
  });

  test("AK-906 AK-902 Azubi lädt das eigene Berichtsheft für einen Zeitraum herunter", async ({ page }) => {
    await login(page, accounts.anna);
    await page.getByText("Berichtsheft als PDF herunterladen").click();
    const form = page.getByRole("form", { name: "Berichtsheft als PDF" });
    // Vorbelegt mit dem Ausbildungsbeginn.
    await expect(form.getByLabel("Von")).toHaveValue("2026-09-01");

    // „Bis“ vor „Von“ wird schon in der Oberfläche abgewiesen.
    await form.getByLabel("Von").fill("2026-10-02");
    await form.getByLabel("Bis").fill("2026-09-28");
    await form.getByRole("button", { name: "Zeitraum als PDF herunterladen" }).click();
    await expect(form.getByRole("alert")).toHaveText("„Bis“ darf nicht vor „Von“ liegen.");

    await form.getByLabel("Von").fill("2026-09-21");
    await form.getByLabel("Bis").fill("2026-10-02");
    const pdf = await downloadPdf(page, () =>
      form.getByRole("button", { name: "Zeitraum als PDF herunterladen" }).click(),
    );
    expect(pdf.fileName).toBe("Berichtsheft_Anna-Azubi_2026-09-21_bis_2026-10-02.pdf");
    expect(pdf.pages.map((text) => /Wochenbericht KW (\d+)/.exec(text)?.[1])).toEqual(["39", "40"]);
  });

  test("AK-906 Azubi kann keine fremden Berichte exportieren", async ({ page }) => {
    const { id: ottoId, reportId } = await insertTrainee({ ...otto, withReport: true });
    await login(page, accounts.anna);

    for (const path of [`/berichte/${reportId}/pdf`, `/azubis/${ottoId}/pdf`]) {
      const response = await page.request.get(path);
      expect(response.status()).toBe(403);
      expect(await response.text()).toBe("Zugriff verweigert");
      expect(response.headers()["content-type"]).not.toContain("pdf");
    }
    for (const path of ["/berichte/00000000-0000-4000-8000-000000000000/pdf", "/azubis/kein-azubi/pdf"]) {
      const response = await page.request.get(path);
      expect(response.status()).toBe(404);
      expect(await response.text()).toBe("Seite nicht gefunden");
    }
  });

  test("AK-906 ohne Anmeldung kein PDF", async ({ page }) => {
    const response = await page.request.get(`/berichte/${await annasSeedReportId()}/pdf`, { maxRedirects: 0 });
    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);
    expect(response.headers()["location"]).toContain("/anmelden");
  });

  test("AK-906 Ausbilder exportieren die Berichte aller Azubis, auch deaktivierter", async ({ page }) => {
    const { id: ottoId, reportId } = await insertTrainee({ ...otto, withReport: true });
    await withDatabase((db) => db.query("UPDATE person SET active = false WHERE id = $1", [ottoId]));

    // Clara ist Otto nicht zugeordnet.
    await login(page, accounts.clara);
    await page.goto(`/berichte/${reportId}`);
    const week = await downloadPdf(page, () => page.getByRole("link", { name: "Als PDF herunterladen" }).click());
    expect(week.fileName).toBe("Berichtsheft_Otto-Fremd_KW40-2026.pdf");
    expect(week.text).toContain("Otto Fremd");
    expect(week.text).toContain("Testtätigkeit");

    await page.goto(`/ausbilder/azubis/${ottoId}`);
    await page.getByText("Berichtsheft als PDF herunterladen").click();
    const form = page.getByRole("form", { name: "Berichtsheft als PDF" });
    await form.getByLabel("Von").fill("2026-09-28");
    await form.getByLabel("Bis").fill("2026-10-02");
    const range = await downloadPdf(page, () =>
      form.getByRole("button", { name: "Zeitraum als PDF herunterladen" }).click(),
    );
    expect(range.fileName).toBe("Berichtsheft_Otto-Fremd_2026-09-28_bis_2026-10-02.pdf");
    expect(range.text).toContain("Testtätigkeit");

    // Auch Annas Berichte (Bernd zugeordnet) kann Clara exportieren.
    const annaResponse = await page.request.get(`/azubis/${await personId(accounts.anna.email)}/pdf`);
    expect(annaResponse.status()).toBe(200);
    expect(annaResponse.headers()["content-type"]).toBe("application/pdf");
    expect(annaResponse.headers()["cache-control"]).toContain("no-store");
  });

  test("AK-1102 PDF-Export bei 375 px ohne horizontales Scrollen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await login(page, accounts.anna);
    await page.getByText("Berichtsheft als PDF herunterladen").click();
    await expect(page.getByRole("button", { name: "Zeitraum als PDF herunterladen" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    await page.goto(`/berichte/${await annasSeedReportId()}`);
    await expect(page.getByRole("link", { name: "Als PDF herunterladen" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  });
});
