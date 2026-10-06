/**
 * Liest ein erzeugtes PDF für Tests wieder aus (pdfjs-dist, nur in Tests): Text je Seite.
 * Zeilenumbrüche des Layouts werden als „\n“ geliefert.
 */
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export interface PdfText {
  pages: string[];
  /** Alle Seiten hintereinander. */
  text: string;
  /** Dokumenteigenschaft „Titel“. */
  title: string | null;
}

export async function extractPdfText(buffer: Uint8Array): Promise<PdfText> {
  const task = getDocument({ data: new Uint8Array(buffer), useSystemFonts: false, verbosity: 0 });
  const document = await task.promise;
  const pages: string[] = [];
  for (let number = 1; number <= document.numPages; number++) {
    const content = await (await document.getPage(number)).getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : "") : "")).join(""));
  }
  const info = (await document.getMetadata()).info as { Title?: string };
  await task.destroy();
  return { pages, text: pages.join("\n"), title: info.Title ?? null };
}

/** Text ohne Leerraum – zum Vergleich langer Texte unabhängig vom Zeilenumbruch des Layouts. */
export function withoutWhitespace(text: string): string {
  return text.replace(/\s+/g, "");
}
