/**
 * Änderungsklassen und Umfang der Prüfung nach `docs/ci-richtlinie.md` (CI-10 bis CI-14, CI-32 bis CI-35,
 * Abschnitt 7). Einzige Stelle, an der Pfade den Klassen zugeordnet werden.
 *
 * Reines JavaScript ohne Abhängigkeiten, damit der Workflow es ohne `npm ci` mit `node` ausführen kann.
 */

/** @typedef {"D" | "P" | "L" | "O" | "I" | "L62" | "L72" | "U" | "unbekannt"} Klasse */

/**
 * @typedef {object} Umfang
 * @property {boolean} schnell Schnelle Prüfung (Lint, Typecheck, Vitest, AK-Abdeckung).
 * @property {boolean} e2e Docker Compose + Playwright mit `chromium` und `smartphone-375`.
 * @property {boolean} browserVoll Zusätzlich `firefox`, `msedge`, `a11y` und `screenshots`.
 * @property {boolean} liferay625 Schnelle Prüfung Liferay 6.2.5 (Job `liferay625-schnell`, CI-09, CI-25).
 * @property {boolean} liferay72 Schnelle Prüfung Liferay 7.2 (Job `liferay72-schnell`).
 * @property {boolean} liferay625Voll Volle Prüfung Liferay 6.2.5 (Job `liferay625-voll`, CI-10, CI-11, CI-35).
 * @property {boolean} liferay72Voll Volle Prüfung Liferay 7.2 (Job `liferay72-voll`).
 * @property {boolean} modulauswahl Umfang nach Klassen: Die Ablauf-Fälle dürfen nach Modul ausgewählt werden (CI-37,
 *   `modulauswahl.mjs`); `false` bei erzwungener voller Prüfung (CI-35).
 * @property {string} grund Begründung für die Zusammenfassung des Laufs.
 */

/** Ordner (mit `/` am Ende) und einzelne Dateien je Klasse; Markdown gehört immer zu D. */
const ZUORDNUNG = /** @type {const} */ ([
  ["L62", ["liferay-625/"]],
  ["L72", ["liferay-72/"]],
  // Klasse U: startet automatisch keinen Liferay-Job; der Upgrade-Test läuft nur von Hand (upgrade.yml).
  ["U", ["upgrade-625-auf-72/"]],
  ["D", ["docs/", "profile/", "playbooks/"]],
  ["P", ["specs/pruefung/"]],
  [
    "L",
    [
      "src/domain/",
      "src/lib/",
      "src/pdf/",
      "src/worker/",
      "src/auth.ts",
      "src/proxy.ts",
      "prisma/",
      "scripts/",
      "tests/",
      "specs/modulgraph.json",
    ],
  ],
  [
    "O",
    [
      "src/app/",
      "src/components/",
      "assets/",
      "public/",
      "e2e/",
      "playwright.config.ts",
      "next.config.ts",
      "postcss.config.mjs",
    ],
  ],
  [
    "I",
    [
      "package.json",
      "package-lock.json",
      "Dockerfile",
      "docker/",
      "docker-compose.yml",
      "keycloak/",
      ".github/",
      ".claude/",
      ".env.example",
      ".dockerignore",
      ".gitattributes",
      ".gitignore",
      ".prettierignore",
      ".prettierrc.json",
      "tsconfig.json",
      "eslint.config.mjs",
      "vitest.config.ts",
      "prisma.config.ts",
    ],
  ],
]);

/**
 * Klasse eines Pfads (relativ zum Repository, mit `/`). Unbekannte Pfade lösen die volle Prüfung aus (CI-34).
 * @param {string} pfad
 * @returns {Klasse}
 */
export function klassifiziere(pfad) {
  if (pfad.toLowerCase().endsWith(".md")) {
    return "D";
  }
  for (const [klasse, eintraege] of ZUORDNUNG) {
    if (eintraege.some((eintrag) => (eintrag.endsWith("/") ? pfad.startsWith(eintrag) : pfad === eintrag))) {
      return klasse;
    }
  }
  return "unbekannt";
}

/** @param {Partial<Umfang>} teil @param {string} grund @returns {Umfang} */
function umfang(teil, grund) {
  return {
    schnell: false,
    e2e: false,
    browserVoll: false,
    liferay625: false,
    liferay72: false,
    liferay625Voll: false,
    liferay72Voll: false,
    modulauswahl: false,
    ...teil,
    grund,
  };
}

const VOLL = { schnell: true, e2e: true, browserVoll: true };
const LIFERAY_VOLL = { liferay625: true, liferay72: true, liferay625Voll: true, liferay72Voll: true };

/**
 * Umfang nach den Klassen der geänderten Dateien (CI-32): Vereinigung aller ausgelösten Jobs.
 * @param {string[]} dateien
 * @param {{ liferayVoll?: boolean }} [optionen] `liferayVoll: false` für Entwürfe (CI-10): Liferay nur schnell.
 * @returns {Umfang}
 */
export function umfangNachKlassen(dateien, { liferayVoll = true } = {}) {
  const klassen = new Set(dateien.map(klassifiziere));
  const liste = [...klassen].sort().join(", ") || "keine Änderungen";
  const browserVoll = ["O", "I", "unbekannt"].some((k) => klassen.has(k));
  const e2e = browserVoll || klassen.has("L") || klassen.has("P");
  return umfang(
    {
      schnell: true,
      e2e,
      browserVoll,
      liferay625: klassen.has("L62"),
      liferay72: klassen.has("L72"),
      liferay625Voll: liferayVoll && klassen.has("L62"),
      liferay72Voll: liferayVoll && klassen.has("L72"),
      modulauswahl: true,
    },
    `Änderungsklassen: ${liste}`,
  );
}

/**
 * Berührt der PR nur die Klassen L62, L72 und D, und davon mindestens eine Liferay-Klasse (AM-R08, Ausnahme)?
 * @param {string[]} dateien
 * @returns {boolean}
 */
function nurLiferay(dateien) {
  const klassen = new Set(dateien.map(klassifiziere));
  return (klassen.has("L62") || klassen.has("L72")) && [...klassen].every((k) => ["L62", "L72", "D"].includes(k));
}

/**
 * @typedef {object} Anlass
 * @property {"pull_request" | "merge_group" | "push" | "schedule" | "workflow_dispatch"} ereignis
 * @property {string[]} [dateien] Geänderte Dateien gegenüber dem Ziel-Branch.
 * @property {boolean} [entwurf] PR ist ein Entwurf.
 * @property {string[]} [labels] Labels des PRs.
 * @property {"voll" | "klassen"} [auswahl] Auswahl beim Start von Hand.
 * @property {number} [tageSeitLetztemCommit] Für den Wochenlauf: Alter des letzten Commits auf `main`.
 */

/**
 * Umfang eines CI-Laufs.
 * @param {Anlass} anlass
 * @returns {Umfang}
 */
export function bestimmeUmfang(anlass) {
  const dateien = anlass.dateien ?? [];
  switch (anlass.ereignis) {
    case "schedule":
      // CI-14: kein neuer Commit seit dem letzten Wochenlauf → ohne Tests beenden.
      if ((anlass.tageSeitLetztemCommit ?? 0) >= 7) {
        return umfang({}, "Wochenlauf: kein neuer Commit auf main seit dem letzten Wochenlauf");
      }
      return umfang({ ...VOLL, ...LIFERAY_VOLL }, "Wochenlauf: alle Konfigurationen (CI-14, CI-35)");
    case "workflow_dispatch":
      if (anlass.auswahl === "klassen") {
        return umfangNachKlassen(dateien);
      }
      return umfang({ ...VOLL, ...LIFERAY_VOLL }, "Start von Hand: alle Konfigurationen (CI-35)");
    case "push":
      return umfang({ schnell: true }, "main nach dem Merge: nur schnelle Prüfung (CI-13)");
    case "pull_request":
      if ((anlass.labels ?? []).includes("volle-pruefung")) {
        return umfang({ ...VOLL, ...LIFERAY_VOLL }, "Label volle-pruefung: alle Konfigurationen (CI-35)");
      }
      if (anlass.entwurf) {
        // Liferay: die schnelle Prüfung der berührten Plattformen läuft (CI-09), die volle erst bei bereitem PR.
        return umfang(
          {
            ...umfangNachKlassen(dateien, { liferayVoll: false }),
            e2e: false,
            browserVoll: false,
            modulauswahl: false,
          },
          "Entwurf: nur schnelle Prüfung (CI-10)",
        );
      }
      if ((anlass.labels ?? []).includes("automerge")) {
        // AM-R08: Wer automatisch gemergt werden soll, braucht mindestens den Umfang der Klasse L.
        const nachKlassen = umfangNachKlassen(dateien);
        if (nachKlassen.e2e || nurLiferay(dateien)) {
          // Reine Liferay-PRs (Klassen L62, L72, D): der -voll-Job der Plattform ersetzt Compose mit Chromium.
          return nachKlassen;
        }
        return umfang(
          { ...nachKlassen, e2e: true },
          `${nachKlassen.grund}; Label automerge: mindestens Klasse L (AM-R08)`,
        );
      }
      return umfangNachKlassen(dateien);
    case "merge_group":
      return umfangNachKlassen(dateien);
    default:
      // Unbekannter Anlass: im Zweifel voll (CI-34).
      return umfang(VOLL, `Unbekannter Anlass ${String(anlass.ereignis)}: alle Konfigurationen`);
  }
}
