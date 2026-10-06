/**
 * Eingebettete Schrift für das PDF: Noto Sans (SIL Open Font License, `assets/fonts/OFL.txt`).
 * Sie liegt im Repository und wird aus dem Dateisystem geladen – zur Laufzeit kommt nichts aus
 * dem Internet, auch nicht im Docker-Image. Enthält alle deutschen Zeichen (AK-907).
 */
import path from "node:path";
import { Font } from "@react-pdf/renderer";

export const PDF_FONT_FAMILY = "Noto Sans";

/** Ordner der Schriftdateien; der Server startet im Projektverzeichnis (auch im Container). */
export const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

/**
 * Bruchstellen für überlange Wörter ohne Leerzeichen (z. B. Adressen): Wörter bis zu dieser Länge
 * bleiben ganz; längere dürfen nach je so vielen Zeichen umbrochen werden (mit Trennstrich am
 * Zeilenende), damit nichts über den Rand läuft und abgeschnitten wird (AK-907).
 */
export const MAX_UNBROKEN_WORD = 24;

/** Teilt ein Wort in Stücke, an denen der Zeilenumbruch erlaubt ist. Normale Wörter bleiben ganz. */
export function breakableParts(word: string): string[] {
  const chars = Array.from(word);
  if (chars.length <= MAX_UNBROKEN_WORD) {
    return [word];
  }
  const parts: string[] = [];
  for (let i = 0; i < chars.length; i += MAX_UNBROKEN_WORD) {
    parts.push(chars.slice(i, i + MAX_UNBROKEN_WORD).join(""));
  }
  return parts;
}

let registered = false;

/** Registriert Schrift und Silbentrennung einmal pro Prozess. */
export function registerPdfFonts(): void {
  if (registered) {
    return;
  }
  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: path.join(FONT_DIR, "NotoSans-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(FONT_DIR, "NotoSans-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  // Keine automatische (englische) Silbentrennung: Wörter bleiben unverändert, nur überlange
  // werden umbrochen.
  Font.registerHyphenationCallback(breakableParts);
  registered = true;
}
