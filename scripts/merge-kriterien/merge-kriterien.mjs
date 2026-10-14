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
 * @property {Record<string, number>} testsVorher Zahl der Tests je AK-, UI-AK- und AM-AK-ID auf dem Ziel-Branch.
 * @property {Record<string, number>} testsNachher Zahl der Tests je AK- und UI-AK-ID mit dem PR.
 * @property {string[]} prueffaelleVorher IDs der Prüffälle auf dem Ziel-Branch.
 * @property {string[]} prueffaelleNachher IDs der Prüffälle mit dem PR.
 * @property {string[]} laufzeitAbhaengigkeiten Pakete unter `dependencies` in `package.json` des Ziel-Branchs.
 * @property {boolean} mainGruen Letzte CI-Prüfung auf `main` ist grün.
 * @property {boolean} schalterAn `.github/automerge.yml` auf dem Ziel-Branch steht auf `aktiv: true`.
 */

/**
 * @typedef {object} Grund Ein Verstoß als fester Code mit Detail; der Text entsteht in {@link grundText}.
 * @property {string} code Fester Code, z. B. `geschuetzter-pfad`, `offene-frage`, `abnahme-ohne-sha`.
 * @property {string} [detail] Pfad, Punkt, AK-ID, Paket, Stand oder Zeilenzahl.
 * @property {string} [zeile] Bei `test-uebersprungen` die Zeile.
 * @property {number} [vorher] Bei `weniger-tests`.
 * @property {number} [nachher] Bei `weniger-tests`.
 * @property {string} [von] Bei Dependabot die bisherige Version.
 * @property {string} [nach] Bei Dependabot die neue Version.
 */

/**
 * @typedef {object} Kriterium Ein ausgewertetes Kriterium (Entscheidung 2a).
 * @property {keyof typeof KRITERIEN} id AM-R-ID oder `Herkunft`.
 * @property {boolean} erfuellt
 * @property {Grund[]} gruende Verstöße; leer, wenn erfüllt.
 * @property {"revert" | "dependabot" | "kein-dependabot"} [entfaellt] Das Kriterium gilt für diesen PR nicht.
 */

/**
 * @typedef {object} Entscheidung
 * @property {boolean} antrag Label `automerge` ist gesetzt.
 * @property {boolean} zulaessig Der Check ist grün.
 * @property {string[]} gruende Verstöße als Text; leer, wenn zulässig.
 * @property {Kriterium[]} kriterien Jedes ausgewertete Kriterium einzeln; ohne Antrag nur AM-R01.
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

/** Höchstlänge eines Punkts in einem Grund (AM-R05). */
const MAX_PUNKT = 120;

/** Überschrift „Bitte bestätigen“: jede Ebene, mit oder ohne Doppelpunkt, oder eine Zeile nur aus Fettschrift. */
const BITTE_BESTAETIGEN =
  /^(?:#{1,6}\s*(?:\*\*|__)?\s*Bitte bestätigen(?![\p{L}\p{N}])|(?:\*\*|__)\s*Bitte bestätigen\s*:?\s*(?:\*\*|__)\s*:?$)/iu;

/**
 * Offene Punkte im Abschnitt „Bitte bestätigen“ der PR-Beschreibung (AM-R05), fail-closed: Jeder Listenpunkt (`-`,
 * `*`, `+` oder nummeriert, auch eingerückt) zählt als offen, außer er ist mit `[x]` abgehakt. Der Abschnitt endet an der
 * nächsten Überschrift (`#`); Zeilen in Codeblöcken beenden ihn nicht.
 * @param {string} beschreibung
 * @returns {string[]} Die offenen Punkte, auf {@link MAX_PUNKT} Zeichen gekürzt.
 */
export function offenePunkte(beschreibung) {
  const punkte = [];
  let imAbschnitt = false;
  let imCode = false;
  for (const zeile of beschreibung.split(/\r?\n/)) {
    const text = zeile.trim();
    if (/^(```|~~~)/.test(text)) {
      imCode = !imCode;
    }
    if (!imCode && /^#{1,6}(\s|$)/.test(text)) {
      imAbschnitt = BITTE_BESTAETIGEN.test(text);
      continue;
    }
    if (!imCode && BITTE_BESTAETIGEN.test(text)) {
      imAbschnitt = true;
      continue;
    }
    if (!imAbschnitt || /^([-*_])(\s*\1){2,}$/.test(text)) {
      continue;
    }
    const treffer = /^(?:[-*+]|\d+[.)])\s+(\S.*)$/.exec(text);
    if (treffer && !/^\[[xX]\]/.test(treffer[1])) {
      const punkt = treffer[1].replace(/^\[\s?\]\s*/, "").trim();
      punkte.push(punkt.length > MAX_PUNKT ? `${punkt.slice(0, MAX_PUNKT - 1)}…` : punkt);
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
    if (!/^\|\s*(UI-|AM-)?AK-\d+\s*\|/.test(zeile)) {
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
 * @returns {Grund[]} Verstöße
 */
export function pruefeDependabot(titel, laufzeit) {
  const treffer = /^(?:chore(?:\(deps(?:-dev)?\))?: )?Bump (\S+) from (\S+) to (\S+)/i.exec(titel);
  if (!treffer) {
    return [{ code: "dependabot-nicht-auswertbar", detail: titel }];
  }
  const [, paket, von, nach] = treffer;
  const alt = teile(von);
  const neu = teile(nach);
  if (!alt || !neu) {
    return [{ code: "dependabot-version-unklar", detail: paket, von, nach }];
  }
  if (neu[0] !== alt[0]) {
    return [{ code: "major-version", detail: paket, von, nach }];
  }
  // Unbekannte Pakete gelten vorsichtshalber als Laufzeitabhängigkeit.
  if (neu[1] !== alt[1] && laufzeit.includes(paket)) {
    return [{ code: "minor-laufzeit", detail: paket, von, nach }];
  }
  return [];
}

/**
 * Prüft die Abnahme der Steuerung nach AM-R07: Kommentar mit `<!-- abnahme-steuerung sha=<Stand> -->` von einem Konto mit
 * Schreibrecht, für den aktuellen Stand des PRs. Ohne gültiges `sha=` (7 bis 40 Hexadezimalzeichen) gilt die Abnahme als
 * fehlend (`abnahme-ohne-sha`); `abnahme-veraltet` nur, wenn ein gültiges `sha=` nicht zum Stand passt.
 * @param {Kommentar[]} kommentare
 * @param {string} headSha
 * @returns {Grund[]} Verstöße
 */
export function pruefeAbnahme(kommentare, headSha) {
  const abnahmen = kommentare
    .map((kommentar) => ({
      kommentar,
      markierung: new RegExp(`<!--\\s*${MARKIERUNG_ABNAHME}(?![\\w-])([^>]*?)-->`, "i").exec(kommentar.text),
    }))
    .filter(({ markierung }) => markierung !== null);
  if (abnahmen.length === 0) {
    return [{ code: "abnahme-fehlt" }];
  }
  const mitRecht = abnahmen.filter(({ kommentar }) => kommentar.schreibrecht);
  if (mitRecht.length === 0) {
    return [{ code: "abnahme-ohne-schreibrecht" }];
  }
  const stande = mitRecht
    .map(({ markierung }) => /(?:^|\s)sha=([0-9a-f]{7,40})(?=\s|$)/i.exec(markierung?.[1] ?? "")?.[1]?.toLowerCase())
    .filter((sha) => sha !== undefined);
  if (stande.length === 0) {
    return [{ code: "abnahme-ohne-sha" }];
  }
  const kopf = headSha.toLowerCase();
  return stande.some((sha) => kopf.startsWith(sha)) ? [] : [{ code: "abnahme-veraltet", detail: stande.at(-1) }];
}

/**
 * Lesbarer Text zu einem Grund. Tests prüfen Code und Detail, nicht diesen Wortlaut.
 * @param {Grund} grund
 */
export function grundText(grund) {
  const { detail = "", von, nach } = grund;
  switch (grund.code) {
    case "kein-antrag":
      return "kein Antrag (Label `automerge` fehlt)";
    case "pr-von-aussen":
      return "PR von außen";
    case "geschuetzter-pfad":
      return `geschützter Pfad: ${detail}`;
    case "offene-frage":
      return `offener Punkt unter „Bitte bestätigen“: ${detail}`;
    case "testdatei-geloescht":
      return `Testdatei gelöscht: ${detail}`;
    case "testdatei-umbenannt":
      return `Testdatei umbenannt: ${detail}`;
    case "test-uebersprungen":
      return `Test übersprungen oder eingeschränkt in ${detail}: ${grund.zeile ?? ""}`;
    case "weniger-tests":
      return `weniger Tests zu ${detail}: vorher ${grund.vorher}, nachher ${grund.nachher}`;
    case "prueffall-entfernt":
      return `Prüffall entfernt: ${detail}`;
    case "abnahme-fehlt":
      return "Abnahme der Steuerung fehlt";
    case "abnahme-ohne-schreibrecht":
      return "Abnahme der Steuerung stammt von einem Konto ohne Schreibrecht";
    case "abnahme-ohne-sha":
      return "Abnahme-Kommentar ohne gültiges sha=<Commit>";
    case "abnahme-veraltet":
      return `Abnahme der Steuerung gilt für ${detail}, nicht für den aktuellen Stand (älter als der letzte Push)`;
    case "dependabot-nicht-auswertbar":
      return `Dependabot: Update nicht auswertbar (z. B. Gruppen-Update), Chris gibt frei: „${detail}“`;
    case "dependabot-version-unklar":
      return `Dependabot: Version nicht auswertbar: ${detail} ${von} → ${nach}`;
    case "major-version":
      return `Major-Version: ${detail} ${von} → ${nach}`;
    case "minor-laufzeit":
      return `Minor-Version einer Laufzeitabhängigkeit: ${detail} ${von} → ${nach}`;
    case "zu-gross":
      return `zu groß: ${detail} geänderte Zeilen (höchstens ${MAX_ZEILEN})`;
    case "main-rot":
      return "main ist rot";
    case "schalter-aus":
      return "Schalter aus (.github/automerge.yml: aktiv: false)";
    default:
      return detail ? `${grund.code}: ${detail}` : grund.code;
  }
}

/** Ausgewertete Kriterien in der Reihenfolge der Spec, mit Bezeichnung für die Zusammenfassung (AM-S02). */
export const KRITERIEN = /** @type {const} */ ({
  "AM-R01": "Antrag (Label `automerge`)",
  Herkunft: "PR aus diesem Repository (Geltungsbereich)",
  "AM-R04": "Keine geschützten Pfade",
  "AM-R05": "Keine offenen Fragen",
  "AM-R06": "Keine schwächeren Tests",
  "AM-R07": "Abnahme der Steuerung",
  "AM-R09": "Dependabot",
  "AM-R10": "Größe",
  "AM-R11": "main ist grün",
  "AM-R12": "Schalter an",
});

/** Nicht in diesem Check ausgewertet; steht als Hinweis unter der Tabelle. */
export const NICHT_MASCHINELL =
  "AM-R02 und AM-R03 (Ablauf der Steuerung), AM-R08 (Pflicht-Check „Prüfung abgeschlossen“), AM-R13 bis AM-R15 (nach dem Merge)";

/** Entfallende Kriterien: Grund des Entfallens als fester Code. */
const ENTFAELLT_TEXT = {
  revert: "entfällt beim Revert (AM-R13)",
  dependabot: "entfällt bei Dependabot (AM-R09)",
  "kein-dependabot": "nur für Dependabot-PRs",
};

/**
 * @param {keyof typeof KRITERIEN} id
 * @param {Grund[]} gruende
 * @param {Kriterium["entfaellt"]} [entfaellt]
 * @returns {Kriterium}
 */
function kriterium(id, gruende, entfaellt) {
  return entfaellt ? { id, erfuellt: true, gruende: [], entfaellt } : { id, erfuellt: gruende.length === 0, gruende };
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
      kriterien: [],
      zulaessigOhneSchalter: true,
      hinweis: "Merge-Warteschlange",
    };
  }
  if (!pr.labels.includes(LABEL_ANTRAG)) {
    return {
      antrag: false,
      zulaessig: true,
      gruende: [],
      kriterien: [{ id: "AM-R01", erfuellt: false, gruende: [{ code: "kein-antrag" }] }],
      zulaessigOhneSchalter: true,
      hinweis: "kein Antrag",
    };
  }

  const revert = pr.labels.includes(LABEL_REVERT);
  const dependabot = pr.autor === DEPENDABOT;
  /** @type {Kriterium[]} */
  const kriterien = [kriterium("AM-R01", [])];

  kriterien.push(kriterium("Herkunft", pr.vonAussen ? [{ code: "pr-von-aussen" }] : []));

  // AM-R04 geschützte Pfade; nicht für den Revert (AM-R13), für Dependabot ohne package.json/package-lock.json (AM-R09).
  const pfade = new Set(pr.dateien.flatMap((datei) => [datei.pfad, ...(datei.alterPfad ? [datei.alterPfad] : [])]));
  kriterien.push(
    kriterium(
      "AM-R04",
      [...pfade]
        .sort()
        .filter((pfad) => istGeschuetzt(pfad) && !(dependabot && ABHAENGIGKEITEN.has(pfad)))
        .map((pfad) => ({ code: "geschuetzter-pfad", detail: pfad })),
      revert ? "revert" : undefined,
    ),
  );

  // AM-R05 offene Fragen
  kriterien.push(
    kriterium(
      "AM-R05",
      offenePunkte(pr.beschreibung).map((punkt) => ({ code: "offene-frage", detail: punkt })),
    ),
  );

  // AM-R06 keine schwächeren Tests
  /** @type {Grund[]} */
  const tests = [];
  for (const datei of pr.dateien) {
    const alt = datei.alterPfad ?? datei.pfad;
    if ((datei.status === "D" || datei.status === "R") && istTestdatei(alt)) {
      tests.push({ code: datei.status === "D" ? "testdatei-geloescht" : "testdatei-umbenannt", detail: alt });
    }
    if (istTestdatei(datei.pfad)) {
      for (const zeile of datei.neueZeilen ?? []) {
        if (SKIP_MUSTER.test(ohneZeichenketten(zeile))) {
          tests.push({ code: "test-uebersprungen", detail: datei.pfad, zeile: zeile.trim() });
        }
      }
    }
  }
  for (const [id, vorher] of Object.entries(pr.testsVorher).sort(([a], [b]) => a.localeCompare(b))) {
    const nachher = pr.testsNachher[id] ?? 0;
    if (nachher < vorher) {
      tests.push({ code: "weniger-tests", detail: id, vorher, nachher });
    }
  }
  const nachher = new Set(pr.prueffaelleNachher);
  for (const id of pr.prueffaelleVorher.filter((fall) => !nachher.has(fall)).sort()) {
    tests.push({ code: "prueffall-entfernt", detail: id });
  }
  kriterien.push(kriterium("AM-R06", tests));

  // AM-R07 Abnahme der Steuerung; nicht für Dependabot (AM-R09) und den Revert (AM-R13).
  kriterien.push(
    kriterium(
      "AM-R07",
      dependabot || revert ? [] : pruefeAbnahme(pr.kommentare, pr.headSha),
      revert ? "revert" : dependabot ? "dependabot" : undefined,
    ),
  );

  // AM-R09 Dependabot
  kriterien.push(
    kriterium(
      "AM-R09",
      dependabot ? pruefeDependabot(pr.titel, pr.laufzeitAbhaengigkeiten) : [],
      dependabot ? undefined : "kein-dependabot",
    ),
  );

  // AM-R10 Größe
  const zeilen = pr.dateien
    .filter((datei) => !NICHT_GEZAEHLT.has(datei.pfad))
    .reduce((summe, datei) => summe + datei.zeilen, 0);
  kriterien.push(kriterium("AM-R10", zeilen > MAX_ZEILEN ? [{ code: "zu-gross", detail: String(zeilen) }] : []));

  // AM-R11 main grün; der Revert darf trotzdem (AM-R13).
  kriterien.push(kriterium("AM-R11", pr.mainGruen ? [] : [{ code: "main-rot" }], revert ? "revert" : undefined));

  // AM-R12 Schalter
  kriterien.push(kriterium("AM-R12", pr.schalterAn ? [] : [{ code: "schalter-aus" }]));

  const gruende = kriterien.flatMap((eintrag) => eintrag.gruende.map(grundText));
  const zulaessigOhneSchalter = kriterien.every((eintrag) => eintrag.erfuellt || eintrag.id === "AM-R12");
  return {
    antrag: true,
    zulaessig: gruende.length === 0,
    gruende,
    kriterien,
    zulaessigOhneSchalter,
    hinweis: gruende.length === 0 ? "zulässig" : `nicht zulässig (${gruende.length} Gründe)`,
  };
}

/** Zelle einer Markdown-Tabelle: `|` maskieren, Zeilenumbrüche entfernen. */
function zelle(/** @type {string} */ text) {
  return text.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

/**
 * Zusammenfassung des Laufs als Markdown (AM-S02): Ergebnis und eine Tabelle mit jedem ausgewerteten Kriterium. Die
 * Steuerung übernimmt die Tabelle in den Kommentar nach dem Merge (AM-AK-13).
 * @param {Entscheidung} entscheidung
 * @returns {string}
 */
export function erstelleBericht(entscheidung) {
  const ja = (/** @type {boolean} */ wert) => (wert ? "ja" : "nein");
  const zeilen = ["### Merge-Kriterien", "", `Ergebnis: **${entscheidung.hinweis}**`, ""];
  if (entscheidung.antrag && entscheidung.kriterien.length > 0) {
    zeilen.push(
      `- Zulässig: ${ja(entscheidung.zulaessig)}`,
      `- Zulässig ohne Schalter (Schattenbetrieb, AM-R14): ${ja(entscheidung.zulaessigOhneSchalter)}`,
      "",
    );
  }
  if (entscheidung.kriterien.length > 0) {
    zeilen.push("| Kriterium | Ergebnis | Grund |", "| --- | --- | --- |");
    for (const eintrag of entscheidung.kriterien) {
      const ergebnis = eintrag.entfaellt ? "entfällt" : eintrag.erfuellt ? "erfüllt" : "nicht erfüllt";
      const grund = eintrag.entfaellt
        ? ENTFAELLT_TEXT[eintrag.entfaellt]
        : eintrag.gruende.map((g) => zelle(grundText(g))).join("<br>");
      zeilen.push(`| ${eintrag.id} ${KRITERIEN[eintrag.id]} | ${ergebnis} | ${grund} |`);
    }
    zeilen.push("", `Nicht in diesem Check ausgewertet: ${NICHT_MASCHINELL}.`, "");
  }
  return zeilen.join("\n");
}
