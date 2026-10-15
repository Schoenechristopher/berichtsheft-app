/**
 * Auswahl der Ablauf-Fälle (Browser) nach Modul (`docs/ci-richtlinie.md`, CI-37): Bei Logik- und Serveränderungen
 * laufen nur die Browser-Fälle der betroffenen Module und der Module, die nach dem Modulgraph (`specs/modulgraph.json`)
 * davon abhängen. Im Zweifel laufen alle Fälle (CI-34).
 *
 * - Datei → Modul: Abschnitte der Code-Landkarte (`specs/code-landkarte.md`, `sectionsByFile()`).
 * - Fall → Modul: AK-IDs im Testnamen und in den Tags (`@AK-…`), Zuordnung AK-ID → Modul aus Abschnitt 4 der
 *   Fach-Specs (`specs/M0x-…`, `specs/Q-…`). Die Ablauf-Fälle aus `e2e/pruefung-ablauf.spec.ts` tragen die ID ihres
 *   Prüffalls (`AK-101-02 (M02.json, ablauf)`) und damit das Modul aus `specs/pruefung/M0x.json`.
 * - Umsetzung: ein Muster für `playwright test --grep-invert`, das genau die Fälle abwählt, deren AK-IDs alle zu nicht
 *   gewählten Modulen gehören. Ein Fall ohne AK-ID läuft deshalb immer mit.
 *
 * Reines JavaScript ohne Abhängigkeiten und ohne Dateizugriff (wie `pruefumfang.mjs`).
 */
import { CROSS_SECTION } from "../code-landkarte/landkarte.mjs";
import { klassifiziere } from "./pruefumfang.mjs";

/**
 * @typedef {object} Modulgraph
 * @property {Record<string, { name: string, abhaengigVon: string[] }>} module
 */

/**
 * @typedef {object} Kontext
 * @property {Modulgraph} graph Inhalt von `specs/modulgraph.json`.
 * @property {Map<string, Set<string>>} landkarte Datei → Abschnitte der Code-Landkarte (`sectionsByFile()`).
 * @property {Map<string, string>} akModul AK-ID → Modul (`akModule()`).
 */

/**
 * @typedef {object} Auswahl
 * @property {boolean} alle Alle Ablauf-Fälle laufen.
 * @property {string[]} module Gewählte Module (leer bei `alle`).
 * @property {string[]} gruende Feste Codes, z. B. `alle:unbekannte-datei`, `modul:M01`, `abhaengig:M03`.
 * @property {string} grepInvert Muster für `--grep-invert`; leer, wenn alle Fälle laufen.
 */

/** Dateien des Testgerüsts: Ihre Änderung wirkt auf alle Browser-Fälle (Code `alle:testgeruest`). */
const TESTGERUEST = ["e2e/helpers.ts", "e2e/pruefung/", "tests/pruefung/", "playwright.config.ts"];

/**
 * Browser-Fälle ohne eindeutiges Modul, die immer mitlaufen (Querschnitt, Barrierefreiheit, Oberfläche,
 * Produktionsmodus, Plattform), als Pfade unter `e2e/`.
 */
export const IMMER_MIT = [
  "ak-1101-browser.spec.ts",
  "ak-1102-smartphone.spec.ts",
  "barrierefreiheit.spec.ts",
  "produktionsmodus.spec.ts",
  "screenshots.spec.ts",
  "ui-ak.spec.ts",
];

/** AK-ID ohne Präfix davor und ohne weitere Ziffer danach: `AK-101` trifft `AK-101-02`, nicht `AK-1011` oder `UI-AK-10`. */
const ID_ANFANG = "(?<![\\w-])";
const ID_ENDE = "(?!\\d)";

/**
 * Zuordnung AK-ID → Modul aus der Tabelle „Akzeptanzkriterien“ der Fach-Specs (Zeilen `| AK-404 | … |`), wie
 * `parseModuleCriteria()` in `scripts/ak-abdeckung/coverage.ts`.
 * @param {{ datei: string, markdown: string }[]} specs Fach-Specs mit Dateinamen (`M01-kalender-und-zeit.md` …)
 * @returns {Map<string, string>}
 */
export function akModule(specs) {
  /** @type {Map<string, string>} */
  const zuordnung = new Map();
  for (const { datei, markdown } of specs) {
    const modul = /^(M\d{2}|Q)-[^/]*\.md$/.exec(datei.split("/").pop() ?? "")?.[1];
    if (!modul) {
      continue;
    }
    let imAbschnitt = false;
    for (const zeile of markdown.split("\n")) {
      if (/^##\s/.test(zeile)) {
        imAbschnitt = /^##\s+(\d+\.\s+)?Akzeptanzkriterien\b/.test(zeile);
        continue;
      }
      const id = imAbschnitt ? /^\|\s*((?:UI-)?AK-\d{2,4})\s*\|/.exec(zeile)?.[1] : undefined;
      if (id && !zuordnung.has(id)) {
        zuordnung.set(id, modul);
      }
    }
  }
  return zuordnung;
}

/**
 * Das Modul selbst und alle Module, die nach dem Graph (transitiv) davon abhängen.
 * @param {Modulgraph} graph
 * @param {string} modul
 * @returns {Set<string>}
 */
export function mitAbhaengigen(graph, modul) {
  const ergebnis = new Set([modul]);
  let gewachsen = true;
  while (gewachsen) {
    gewachsen = false;
    for (const [kandidat, { abhaengigVon }] of Object.entries(graph.module)) {
      if (!ergebnis.has(kandidat) && abhaengigVon.some((vorgaenger) => ergebnis.has(vorgaenger))) {
        ergebnis.add(kandidat);
        gewachsen = true;
      }
    }
  }
  return ergebnis;
}

/** @param {string} text */
function regexText(text) {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

/**
 * Regex-Alternative für AK-IDs, nach Präfix gruppiert: `AK-(?:101|102)|UI-AK-(?:01)`.
 * @param {string[]} ids
 */
function idAlternativen(ids) {
  /** @type {Map<string, string[]>} */
  const nachPraefix = new Map();
  for (const id of [...ids].sort()) {
    const [, praefix, nummer] = /^((?:UI-)?AK-)(\d+)$/.exec(id) ?? [];
    if (praefix) {
      nachPraefix.set(praefix, [...(nachPraefix.get(praefix) ?? []), nummer]);
    }
  }
  return [...nachPraefix].map(([praefix, nummern]) => `${praefix}(?:${nummern.join("|")})`).join("|");
}

/**
 * Muster für `playwright test --grep-invert`: wählt einen Fall ab, dessen Titel (mit Datei, `describe` und Tags) eine
 * AK-ID eines nicht gewählten Moduls nennt, aber keine eines gewählten Moduls, und der nicht in einer Datei aus
 * `dateien` steht. Als `/…/` ohne Schalter, damit Playwright groß und klein unterscheidet (sonst träfe `AK-101` auch
 * den Dateinamen `ak-101-anmeldung.spec.ts`).
 * @param {{ behalten: string[], verwerfen: string[], dateien: string[] }} teile AK-IDs und Pfade unter `e2e/`
 */
export function grepInvertMuster({ behalten, verwerfen, dateien }) {
  if (verwerfen.length === 0) {
    return "";
  }
  const schutz = [
    ...(behalten.length > 0 ? [`${ID_ANFANG}(?:${idAlternativen(behalten)})${ID_ENDE}`] : []),
    ...dateien.map((datei) => `(?<![\\w.-])${regexText(datei)}`),
  ];
  const ohneSchutz = schutz.length > 0 ? `(?!.*(?:${schutz.join("|")}))` : "";
  return `/^${ohneSchutz}(?=.*${ID_ANFANG}(?:${idAlternativen(verwerfen)})${ID_ENDE})/`;
}

/** @param {string[]} gruende @returns {Auswahl} */
function alle(gruende) {
  return { alle: true, module: [], gruende: [...new Set(gruende)].sort(), grepInvert: "" };
}

/**
 * Kern von CI-37: Ablauf-Fälle nach den geänderten Dateien. Doku (Klasse D) und Liferay ändern die TypeScript-App
 * nicht und zählen nicht. Bleibt keine Datei übrig, laufen alle Fälle (unverändertes Verhalten).
 * @param {string[]} dateien Geänderte Dateien gegenüber der Basis
 * @param {Kontext} kontext
 * @returns {Auswahl}
 */
export function auswahlNachModul(dateien, { graph, landkarte, akModul }) {
  const relevant = dateien.filter((datei) => !["D", "L62", "L72"].includes(klassifiziere(datei)));
  if (relevant.length === 0) {
    return alle(["alle:ohne-modul-datei"]);
  }
  /** @type {string[]} */
  const alleGruende = [];
  /** @type {Set<string>} */
  const direkt = new Set();
  /** @type {string[]} */
  const specDateien = [];
  for (const datei of relevant) {
    if (TESTGERUEST.some((eintrag) => (eintrag.endsWith("/") ? datei.startsWith(eintrag) : datei === eintrag))) {
      alleGruende.push("alle:testgeruest");
      continue;
    }
    if (datei.startsWith("e2e/") && datei.endsWith(".spec.ts")) {
      specDateien.push(datei.slice("e2e/".length));
      continue;
    }
    const abschnitte = landkarte.get(datei);
    if (!abschnitte) {
      alleGruende.push("alle:unbekannte-datei");
    } else if (abschnitte.has(CROSS_SECTION)) {
      alleGruende.push("alle:querschnitt");
    } else {
      for (const modul of abschnitte) {
        if (!(modul in graph.module)) {
          alleGruende.push("alle:unbekanntes-modul");
        }
        direkt.add(modul);
      }
    }
  }
  if (alleGruende.length > 0) {
    return alle(alleGruende);
  }

  /** @type {Set<string>} */
  const gewaehlt = new Set();
  for (const modul of direkt) {
    for (const abhaengig of mitAbhaengigen(graph, modul)) {
      gewaehlt.add(abhaengig);
    }
  }
  const gewaehlteModule = [...gewaehlt].sort();
  const gruende = [
    ...gewaehlteModule.map((modul) => (direkt.has(modul) ? `modul:${modul}` : `abhaengig:${modul}`)),
    ...specDateien.map((datei) => `datei:e2e/${datei}`),
  ];
  const behalten = [...akModul].filter(([, modul]) => gewaehlt.has(modul)).map(([id]) => id);
  const verwerfen = [...akModul].filter(([, modul]) => !gewaehlt.has(modul)).map(([id]) => id);
  if (verwerfen.length === 0) {
    return { alle: true, module: gewaehlteModule, gruende: [...gruende, "alle:alle-module"], grepInvert: "" };
  }
  return {
    alle: false,
    module: gewaehlteModule,
    gruende,
    grepInvert: grepInvertMuster({ behalten, verwerfen, dateien: [...IMMER_MIT, ...specDateien].sort() }),
  };
}

/**
 * Auswahl eines CI-Laufs: CI-37 gilt nur für Logik- und Serveränderungen (Klassen L und P, dazu Doku). Erzwungene volle
 * Prüfung (CI-35), Oberfläche (O), Infrastruktur (I) und unbekannte Pfade (CI-34) wählen alle Fälle.
 * @param {{ e2e: boolean, modulauswahl: boolean }} umfang Ergebnis von `bestimmeUmfang()`
 * @param {string[]} dateien
 * @param {Kontext} kontext
 * @returns {Auswahl}
 */
export function waehleAblauf(umfang, dateien, kontext) {
  if (!umfang.e2e) {
    return { alle: false, module: [], gruende: ["keine:ohne-browser-lauf"], grepInvert: "" };
  }
  if (!umfang.modulauswahl) {
    return alle(["alle:erzwungen"]);
  }
  const klassen = new Set(dateien.map(klassifiziere));
  const breit = ["O", "I", "unbekannt"].filter((klasse) => klassen.has(klasse));
  if (breit.length > 0) {
    return alle(breit.map((klasse) => `alle:klasse-${klasse}`));
  }
  return auswahlNachModul(dateien, kontext);
}
