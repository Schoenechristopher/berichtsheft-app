/**
 * Erzeugt das PDF als Buffer (serverseitig, ohne Browser). Bei jedem Aufruf neu – es gibt keinen
 * Zwischenspeicher, damit nach einer Rücknahme kein alter Freigabevermerk erscheint (AK-905).
 */
import { renderToBuffer } from "@react-pdf/renderer";
import type { PdfDocument } from "@/domain/report-pdf";
import { registerPdfFonts } from "./fonts";
import { ReportPdf } from "./ReportPdf";

export async function renderReportPdf(document: PdfDocument): Promise<Buffer> {
  registerPdfFonts();
  return renderToBuffer(<ReportPdf data={document} />);
}
