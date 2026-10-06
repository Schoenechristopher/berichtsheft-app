/**
 * Antwort der PDF-Routen: das frisch erzeugte PDF als Download oder die Meldung wie auf der
 * Berichtsseite („Seite nicht gefunden“, „Zugriff verweigert“). Nie zwischenspeichern (AK-905).
 */
import type { ExportResult } from "@/lib/report-export";
import { renderReportPdf } from "./render";

const NO_STORE = "private, no-store, max-age=0";

export async function pdfResponse(result: ExportResult): Promise<Response> {
  if (!result.ok) {
    return new Response(result.message, {
      status: result.status,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": NO_STORE },
    });
  }
  const pdf = await renderReportPdf(result.document);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition(result.fileName),
      "Content-Length": String(pdf.length),
      "Cache-Control": NO_STORE,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** Download mit Dateinamen; der Name ist bereits ASCII (`fileNamePart`), `filename*` zur Sicherheit. */
export function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
