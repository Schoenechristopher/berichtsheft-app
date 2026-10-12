/**
 * Änderungsklassen und Umfang der Prüfung nach `docs/ci-richtlinie.md` (CI-10 bis CI-14, CI-32 bis CI-35,
 * Abschnitt 7). Einzige Stelle, an der Pfade den Klassen zugeordnet werden.
 *
 * Reines JavaScript ohne Abhängigkeiten, damit der Workflow es ohne `npm ci` mit `node` ausführen kann.
 */

/** @typedef {"D" | "P" | "L" | "O" | "I" | "L62" | "L72" | "unbekannt"} Klasse */

/**
 * @typedef {object} Umfang
 * @property {boolean} schnell Schnelle Prüfung (Lint, Typecheck, Vitest, AK-Abdeckung).
 * @property {boolean} e2e Docker Compose + Playwright mit `chromium` und `smartphone-375`.
 * @property {boolean} browserVoll Zusätzlich `firefox`, `msedge`, `a11y` und `screenshots`.
 * @property {boolean} liferay625 Liferay-6.2.5-Job.
 * @property {boolean} liferay72 Liferay-7.2-Job.
 * @property {string} grund Begründung für die Zusammenfassung des Laufs.
 */

/** Ordner (mit `/` am Ende) und einzelne Dateien je Klasse; Markdown gehört immer zu D. */
const ZUORDNUNG = /** @type {const} */ ([
  ["L62", ["liferay-625/"]],
  ["L72", ["liferay-72/"]],
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
    ...teil,
    grund,
  };
}

const VOLL = { schnell: true, e2e: true, browserVoll: true };

/**
 * Umfang nach den Klassen der geänderten Dateien (CI-32): Vereinigung aller ausgelösten Jobs.
 * @param {string[]} dateien
 * @returns {Umfang}
 */
export function umfangNachKlassen(dateien) {
  const klassen = new Set(dateien.map(klassifiziere));
  const liste = [...klassen].sort().join(", ") || "keine Änderungen";
  const browserVoll = ["O", "I", "unbekannt"].some((k) => klassen.has(k));
  const e2e = browserVoll || klassen.has("L") || klassen.has("P");
  return umfang(
    { schnell: true, e2e, browserVoll, liferay625: klassen.has("L62"), liferay72: klassen.has("L72") },
    `Änderungsklassen: ${liste}`,
  );
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
      return umfang({ ...VOLL, liferay625: true, liferay72: true }, "Wochenlauf: alle Konfigurationen (CI-14, CI-35)");
    case "workflow_dispatch":
      if (anlass.auswahl === "klassen") {
        return umfangNachKlassen(dateien);
      }
      return umfang({ ...VOLL, liferay625: true, liferay72: true }, "Start von Hand: alle Konfigurationen (CI-35)");
    case "push":
      return umfang({ schnell: true }, "main nach dem Merge: nur schnelle Prüfung (CI-13)");
    case "pull_request":
      if ((anlass.labels ?? []).includes("volle-pruefung")) {
        return umfang(
          { ...VOLL, liferay625: true, liferay72: true },
          "Label volle-pruefung: alle Konfigurationen (CI-35)",
        );
      }
      if (anlass.entwurf) {
        return umfang({ schnell: true }, "Entwurf: nur schnelle Prüfung (CI-10)");
      }
      return umfangNachKlassen(dateien);
    case "merge_group":
      return umfangNachKlassen(dateien);
    default:
      // Unbekannter Anlass: im Zweifel voll (CI-34).
      return umfang(VOLL, `Unbekannter Anlass ${String(anlass.ereignis)}: alle Konfigurationen`);
  }
}
