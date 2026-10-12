/**
 * Merge-Kriterien nach `docs/07-spec-automatisches-mergen.md` (AM-R01 bis AM-R12, AM-S01): entscheidet, ob ein PR
 * automatisch gemergt werden darf, und nennt jeden Verstoß einzeln (AM-AK-10).
 *
 * Reine Funktionen ohne Netz und ohne GitHub; die Eingaben sammelt `index.mjs` im Workflow.
 */

/**
 * @typedef {object} Datei
 * @property {string} pfad
 * @property {"A" | "M" | "D" | "R"} status Hinzugefügt, geändert, gelöscht, umbenannt.
 * @property {string} [alterPfad] Bei Umbenennung der bisherige Pfad.
 * @property {number} zeilen Hinzugefügte plus gelöschte Zeilen.
 * @property {string[]} [neueZeilen] Hinzugefügte Zeilen (ohne führendes `+`).
 */

/**
 * @typedef {object} Kommentar
 * @property {string} text
 * @property {boolean} schreibrecht Autor hat Schreibrecht im Repository.
 */

/**
 * @typedef {object} PrDaten
 * @property {"pull_request" | "merge_group"} ereignis
 * @property {string[]} labels
 * @property {boolean} vonAussen PR kommt aus einem Fork.
 * @property {string} autor Login des PR-Autors.
 * @property {string} titel
 * @property {string} beschreibung
 * @property {string} headSha Aktueller Stand des PRs.
 * @property {Datei[]} dateien
 * @property {Kommentar[]} kommentare
 * @property {Record<string, number>} testsVorher Zahl der Tests je AK- und UI-AK-ID auf dem Ziel-Branch.
 * @property {Record<string, number>} testsNachher Zahl der Tests je AK- und UI-AK-ID mit dem PR.
 * @property {string[]} prueffaelleVorher IDs der Prüffälle auf dem Ziel-Branch.
 * @property {string[]} prueffaelleNachher IDs der Prüffälle mit dem PR.
 * @property {string[]} laufzeitAbhaengigkeiten Pakete unter `dependencies` in `package.json` des Ziel-Branchs.
 * @property {boolean} mainGruen Letzte CI-Prüfung auf `main` ist grün.
 * @property {boolean} schalterAn `.github/automerge.yml` auf dem Ziel-Branch steht auf `aktiv: true`.
 */

/**
 * @typedef {object} Entscheidung
 * @property {boolean} antrag Label `automerge` ist gesetzt.
 * @property {boolean} zulaessig Der Check ist grün.
 * @property {string[]} gruende Verstöße; leer, wenn zulässig.
 * @property {boolean} zulaessigOhneSchalter Ergebnis ohne AM-R12, für den Schattenbetrieb (AM-R14).
 * @property {string} hinweis Kurzfassung für die Zusammenfassung des Laufs.
 */

export const LABEL_ANTRAG = "automerge";
export const LABEL_REVERT = "revert";
export const DEPENDABOT = "dependabot[bot]";
export const MARKIERUNG_ABNAHME = "abnahme-steuerung";
export const MAX_ZEILEN = 1500;
/** Bei der Größe nicht gezählt (AM-R10): Lockfiles und erzeugte Dateien. */
const NICHT_GEZAEHLT = new Set(["package-lock.json", "docs/03-testabdeckung.md"]);
const ABHAENGIGKEITEN = new Set(["package.json", "package-lock.json"]);

/** Geschützte Pfade (AM-R04): Ordner enden mit `/`, sonst genaue Datei. */
const GESCHUETZT = [
  // Regeln und Auslegungen
  "docs/01-spezifikation.md",
  "docs/02-plan.md",
  "docs/05-ui-spezifikation.md",
  "docs/06-spec-architektur.md",
  "docs/07-spec-automatisches-mergen.md",
  "docs/08-spec-modellwahl.md",
  "docs/09-spec-kosteneffizienz.md",
  "docs/ci-richtlinie.md",
  "specs/",
  "profile/",
  "playbooks/",
  // Anweisungen an Sitzungen
  "CLAUDE.md",
  "AGENTS.md",
  ".claude/",
  // CI, Laufzeit und Schalter
  ".github/",
  "Dockerfile",
  "docker/",
  "docker-compose.yml",
  "keycloak/",
  ".env.example",
  // Abhängigkeiten
  "package.json",
  "package-lock.json",
  ...["liferay-625/", "liferay-72/"].flatMap((wurzel) =>
    ["settings.gradle", "gradle.properties", "build.gradle", "build.properties", "build.xml", "ivy.xml"].map(
      (datei) => wurzel + datei,
    ),
  ),
  // Sicherheit
  "src/auth.ts",
  "src/proxy.ts",
  "src/lib/auth/",
  "src/domain/access.ts",
  "src/domain/report-access.ts",
  // Datenbank
  "prisma/migrations/",
  "prisma/schema.prisma",
  // Umsetzung dieser Spec
  "scripts/merge-kriterien/",
];
const NICHT_GESCHUETZT = new Set(["specs/code-landkarte.md"]);

/** @param {string} pfad */
export function istGeschuetzt(pfad) {
  if (NICHT_GESCHUETZT.has(pfad)) {
    return false;
  }
  return GESCHUETZT.some((eintrag) => (eintrag.endsWith("/") ? pfad.startsWith(eintrag) : pfad === eintrag));
}

/** Testdateien (AM-R06): Vitest, Playwright, Datenbanktests, Testordner der Liferay-Umsetzungen. */
export function istTestdatei(/** @type {string} */ pfad) {
  return (
    /\.test\.(ts|tsx|mts|mjs|js)$/.test(pfad) ||
    pfad.startsWith("e2e/") ||
    pfad.startsWith("tests/") ||
    (/^liferay-(625|72)\//.test(pfad) && /(^|\/)(src\/)?test\//.test(pfad))
  );
}

/**
 * Aufrufe, mit denen ein Test übersprungen oder eingeschränkt wird (AM-R06): `it.skip(`, `test.only(`,
 * `describe.skipIf(`, `test.fixme(`, `test.fail(`, `@Ignore`, `@Disabled`.
 */
const SKIP_MUSTER =
  /\b(?:it|test|describe|suite|bench|context)(?:\.\w+)*\.(?:skip|only|fixme|skipIf|runIf|todo)\s*\(|\btest\.fail\s*\(|^\s*@(?:Ignore|Disabled)\b/;

/** Zeile ohne Inhalt von Zeichenketten, damit erwähnte Aufrufe in Texten nicht zählen. */
function ohneZeichenketten(/** @type {string} */ zeile) {
  return zeile.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');
}

/**
 * Nicht abgehakte Punkte im Abschnitt „Bitte bestätigen“ der PR-Beschreibung (AM-R05).
 * @param {string} beschreibung
 * @returns {string[]}
 */
export function offenePunkte(beschreibung) {
  const zeilen = beschreibung.split(/\r?\n/);
  const start = zeilen.findIndex((zeile) => /^#{1,6}\s*Bitte bestätigen\b/i.test(zeile.trim()));
  if (start < 0) {
    return [];
  }
  const punkte = [];
  for (const zeile of zeilen.slice(start + 1)) {
    if (/^#{1,6}\s/.test(zeile.trim())) {
      break;
    }
    const treffer = /^\s*(?:[-*+]|\d+[.)])\s+\[ \]\s+(.*)$/.exec(zeile);
    if (treffer) {
      punkte.push(treffer[1].trim());
    }
  }
  return punkte;
}

/**
 * Zahl der Tests je AK- und UI-AK-ID aus `docs/03-testabdeckung.md`.
 * @param {string} markdown
 * @returns {Record<string, number>}
 */
export function testsJeAk(markdown) {
  /** @type {Record<string, number>} */
  const zahlen = {};
  for (const zeile of markdown.split(/\r?\n/)) {
    if (!/^\|\s*(UI-)?AK-\d+\s*\|/.test(zeile)) {
      continue;
    }
    // Zellen an nicht maskierten `|` trennen (die Datei schreibt `|` in Texten als `\|`).
    const zellen = zeile.split(/(?<!\\)\|/).map((zelle) => zelle.trim());
    const id = zellen[1];
    const tests = zellen[3] ?? "";
    zahlen[id] = tests === "" || tests.includes("kein Test") ? 0 : tests.split("<br>").length;
  }
  return zahlen;
}

/**
 * IDs der Prüffälle in einer JSON-Datei unter `specs/pruefung/`.
 * @param {string} json
 * @returns {string[]}
 */
export function prueffallIds(json) {
  return [...json.matchAll(/"id"\s*:\s*"([^"]+)"/g)].map((treffer) => treffer[1]);
}

/** @param {string} version */
function teile(version) {
  const treffer = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version);
  return treffer ? treffer.slice(1, 4).map(Number) : null;
}

/**
 * Prüft einen Dependabot-PR nach AM-R09.
 * @param {string} titel
 * @param {string[]} laufzeit
 * @returns {string[]} Verstöße
 */
export function pruefeDependabot(titel, laufzeit) {
  const treffer = /^(?:chore(?:\(deps(?:-dev)?\))?: )?Bump (\S+) from (\S+) to (\S+)/i.exec(titel);
  if (!treffer) {
    return [`Dependabot: Update nicht auswertbar (z. B. Gruppen-Update), Chris gibt frei: „${titel}“`];
  }
  const [, paket, von, nach] = treffer;
  const alt = teile(von);
  const neu = teile(nach);
  if (!alt || !neu) {
    return [`Dependabot: Version nicht auswertbar: ${paket} ${von} → ${nach}`];
  }
  if (neu[0] !== alt[0]) {
    return [`Major-Version: ${paket} ${von} → ${nach}`];
  }
  // Unbekannte Pakete gelten vorsichtshalber als Laufzeitabhängigkeit.
  if (neu[1] !== alt[1] && laufzeit.includes(paket)) {
    return [`Minor-Version einer Laufzeitabhängigkeit: ${paket} ${von} → ${nach}`];
  }
  return [];
}

/**
 * Prüft die Abnahme der Steuerung nach AM-R07: Kommentar mit `<!-- abnahme-steuerung sha=<Stand> -->` von einem Konto mit
 * Schreibrecht, für den aktuellen Stand des PRs.
 * @param {Kommentar[]} kommentare
 * @param {string} headSha
 * @returns {string[]} Verstöße
 */
export function pruefeAbnahme(kommentare, headSha) {
  const abnahmen = kommentare
    .map((kommentar) => ({
      kommentar,
      sha: new RegExp(`<!--\\s*${MARKIERUNG_ABNAHME}(?:\\s+sha=([0-9a-f]{7,40}))?\\s*-->`, "i").exec(kommentar.text),
    }))
    .filter(({ sha }) => sha !== null);
  if (abnahmen.length === 0) {
    return ["Abnahme der Steuerung fehlt"];
  }
  const mitRecht = abnahmen.filter(({ kommentar }) => kommentar.schreibrecht);
  if (mitRecht.length === 0) {
    return ["Abnahme der Steuerung stammt von einem Konto ohne Schreibrecht"];
  }
  const aktuell = mitRecht.some(({ sha }) => sha?.[1] && headSha.startsWith(sha[1].toLowerCase()));
  return aktuell ? [] : ["Abnahme der Steuerung ist älter als der letzte Push (gilt nicht für den aktuellen Stand)"];
}

/**
 * Entscheidet über einen PR (AM-S01).
 * @param {PrDaten} pr
 * @returns {Entscheidung}
 */
export function entscheideAutomerge(pr) {
  if (pr.ereignis === "merge_group") {
    // Die Warteschlange nimmt nur PRs auf, deren Pflicht-Checks schon grün waren (AM-S02).
    return {
      antrag: true,
      zulaessig: true,
      gruende: [],
      zulaessigOhneSchalter: true,
      hinweis: "Merge-Warteschlange",
    };
  }
  if (!pr.labels.includes(LABEL_ANTRAG)) {
    return { antrag: false, zulaessig: true, gruende: [], zulaessigOhneSchalter: true, hinweis: "kein Antrag" };
  }

  const revert = pr.labels.includes(LABEL_REVERT);
  const dependabot = pr.autor === DEPENDABOT;
  /** @type {string[]} */
  const gruende = [];

  if (pr.vonAussen) {
    gruende.push("PR von außen");
  }

  // AM-R04 geschützte Pfade; nicht für den Revert (AM-R13), für Dependabot ohne package.json/package-lock.json (AM-R09).
  if (!revert) {
    const pfade = new Set(pr.dateien.flatMap((datei) => [datei.pfad, ...(datei.alterPfad ? [datei.alterPfad] : [])]));
    for (const pfad of [...pfade].sort()) {
      if (istGeschuetzt(pfad) && !(dependabot && ABHAENGIGKEITEN.has(pfad))) {
        gruende.push(`geschützter Pfad: ${pfad}`);
      }
    }
  }

  // AM-R05 offene Fragen
  for (const punkt of offenePunkte(pr.beschreibung)) {
    gruende.push(`offener Punkt unter „Bitte bestätigen“: ${punkt}`);
  }

  // AM-R06 keine schwächeren Tests
  for (const datei of pr.dateien) {
    const alt = datei.alterPfad ?? datei.pfad;
    if ((datei.status === "D" || datei.status === "R") && istTestdatei(alt)) {
      gruende.push(`Testdatei ${datei.status === "D" ? "gelöscht" : "umbenannt"}: ${alt}`);
    }
    if (istTestdatei(datei.pfad)) {
      for (const zeile of datei.neueZeilen ?? []) {
        if (SKIP_MUSTER.test(ohneZeichenketten(zeile))) {
          gruende.push(`Test übersprungen oder eingeschränkt in ${datei.pfad}: ${zeile.trim()}`);
        }
      }
    }
  }
  for (const [id, vorher] of Object.entries(pr.testsVorher).sort(([a], [b]) => a.localeCompare(b))) {
    const nachher = pr.testsNachher[id] ?? 0;
    if (nachher < vorher) {
      gruende.push(`weniger Tests zu ${id}: vorher ${vorher}, nachher ${nachher}`);
    }
  }
  const nachher = new Set(pr.prueffaelleNachher);
  for (const id of pr.prueffaelleVorher.filter((fall) => !nachher.has(fall)).sort()) {
    gruende.push(`Prüffall entfernt: ${id}`);
  }

  // AM-R07 Abnahme der Steuerung; nicht für Dependabot (AM-R09) und den Revert (AM-R13).
  if (!dependabot && !revert) {
    gruende.push(...pruefeAbnahme(pr.kommentare, pr.headSha));
  }

  // AM-R09 Dependabot
  if (dependabot) {
    gruende.push(...pruefeDependabot(pr.titel, pr.laufzeitAbhaengigkeiten));
  }

  // AM-R10 Größe
  const zeilen = pr.dateien
    .filter((datei) => !NICHT_GEZAEHLT.has(datei.pfad))
    .reduce((summe, datei) => summe + datei.zeilen, 0);
  if (zeilen > MAX_ZEILEN) {
    gruende.push(`zu groß: ${zeilen} geänderte Zeilen (höchstens ${MAX_ZEILEN})`);
  }

  // AM-R11 main grün; der Revert darf trotzdem (AM-R13).
  if (!pr.mainGruen && !revert) {
    gruende.push("main ist rot");
  }

  const zulaessigOhneSchalter = gruende.length === 0;
  // AM-R12 Schalter
  if (!pr.schalterAn) {
    gruende.push("Schalter aus (.github/automerge.yml: aktiv: false)");
  }

  return {
    antrag: true,
    zulaessig: gruende.length === 0,
    gruende,
    zulaessigOhneSchalter,
    hinweis: gruende.length === 0 ? "zulässig" : `nicht zulässig (${gruende.length} Gründe)`,
  };
}
