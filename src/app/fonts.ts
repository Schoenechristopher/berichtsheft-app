import localFont from "next/font/local";

/**
 * IBM Plex Sans (SIL Open Font License, `src/app/fonts/OFL.txt`), lokal gebündelt: Die Dateien
 * liegen im Repository, `next/font` liefert sie mit der App aus. Zur Laufzeit wird nichts aus dem
 * Internet geladen, auch nicht im Docker-Image. Teilmenge „latin“ mit allen deutschen Zeichen.
 */
export const plexSans = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});
