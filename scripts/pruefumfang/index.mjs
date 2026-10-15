/**
 * `npm run pruefumfang`: bestimmt im Workflow den Umfang des CI-Laufs und schreibt ihn nach `$GITHUB_OUTPUT`
 * (`docs/ci-richtlinie.md`, CI-32 bis CI-36).
 *
 * `npm run pruefumfang -- --pruefen` (schnelle Prüfung): scheitert, wenn eine Datei im Repository keiner
 * Änderungsklasse angehört; sie muss dann in `pruefumfang.mjs` und Abschnitt 7 der Richtlinie eingeordnet werden.
 *
 * `npm run pruefumfang -- --auswahl <Datei> …`: zeigt die Auswahl der Ablauf-Fälle nach Modul (CI-37) für diese
 * Dateien, z. B. um das Muster lokal mit `npx playwright test --grep-invert "<Muster>"` auszuprobieren.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, readdirSync } from "node:fs";
import { sectionsByFile } from "../code-landkarte/landkarte.mjs";
import { akModule, auswahlNachModul, waehleAblauf } from "./modulauswahl.mjs";
import { bestimmeUmfang, klassifiziere } from "./pruefumfang.mjs";

/** @param {string[]} args */
function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" })
    .split("\n")
    .map((zeile) => zeile.trim())
    .filter(Boolean);
}

/** Modulgraph, Code-Landkarte und AK-Zuordnung der Fach-Specs für die Auswahl nach Modul (CI-37). */
function modulKontext() {
  const specs = readdirSync("specs")
    .filter((datei) => /^(M\d{2}|Q)-.*\.md$/.test(datei))
    .map((datei) => ({ datei, markdown: readFileSync(`specs/${datei}`, "utf8") }));
  return {
    graph: JSON.parse(readFileSync("specs/modulgraph.json", "utf8")),
    landkarte: sectionsByFile(readFileSync("specs/code-landkarte.md", "utf8")),
    akModul: akModule(specs),
  };
}

if (process.argv.includes("--auswahl")) {
  const dateien = process.argv.slice(process.argv.indexOf("--auswahl") + 1);
  const auswahl = auswahlNachModul(dateien, modulKontext());
  console.log(`Gründe: ${auswahl.gruende.join(", ")}`);
  console.log(`Module: ${auswahl.alle ? "alle" : auswahl.module.join(", ")}`);
  console.log(`--grep-invert: ${auswahl.grepInvert || "(keins, alle Fälle)"}`);
  process.exit(0);
}

if (process.argv.includes("--pruefen")) {
  const ohneKlasse = git("ls-files").filter((datei) => klassifiziere(datei) === "unbekannt");
  if (ohneKlasse.length > 0) {
    console.error(
      "Dateien ohne Änderungsklasse (in scripts/pruefumfang/pruefumfang.mjs und docs/ci-richtlinie.md einordnen):",
    );
    for (const datei of ohneKlasse) {
      console.error(`  ${datei}`);
    }
    process.exit(1);
  }
  console.log("Alle Dateien gehören einer Änderungsklasse an.");
  process.exit(0);
}

const ereignis = process.env.GITHUB_EVENT_NAME ?? "workflow_dispatch";
const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")) : {};

/** @type {import("./pruefumfang.mjs").Anlass} */
const anlass = { ereignis };
if (ereignis === "pull_request") {
  // Der Checkout ist der Test-Merge des PRs: erster Elternteil = aktueller Ziel-Branch (CI-33: ganzer PR).
  anlass.dateien = git("diff", "--name-only", "HEAD^1", "HEAD");
  anlass.entwurf = Boolean(event.pull_request?.draft);
  anlass.labels = (event.pull_request?.labels ?? []).map((/** @type {{ name: string }} */ label) => label.name);
} else if (ereignis === "merge_group") {
  anlass.dateien = git("diff", "--name-only", event.merge_group.base_sha, "HEAD");
} else if (ereignis === "workflow_dispatch") {
  anlass.auswahl = event.inputs?.umfang === "klassen" ? "klassen" : "voll";
  if (anlass.auswahl === "klassen") {
    anlass.dateien = git("diff", "--name-only", "origin/main...HEAD");
  }
} else if (ereignis === "schedule") {
  const [zeitstempel] = git("log", "-1", "--format=%ct");
  anlass.tageSeitLetztemCommit = (Date.now() / 1000 - Number(zeitstempel)) / 86_400;
}

const umfang = bestimmeUmfang(anlass);
const ablauf = waehleAblauf(umfang, anlass.dateien ?? [], modulKontext());
const ablaufModule = ablauf.alle ? "alle" : ablauf.module.join(" ") || "keine";
const ausgabe = [
  `schnell=${umfang.schnell}`,
  `e2e=${umfang.e2e}`,
  `browser_voll=${umfang.browserVoll}`,
  `liferay625=${umfang.liferay625}`,
  `liferay72=${umfang.liferay72}`,
  `ablauf_module=${ablaufModule}`,
  `ablauf_grep_invert=${ablauf.grepInvert}`,
];
console.log(`${umfang.grund}\nAblauf-Fälle (CI-37): ${ablauf.gruende.join(", ")}\n${ausgabe.join("\n")}`);
if (anlass.dateien) {
  console.log(`Geänderte Dateien (${anlass.dateien.length}):`);
  for (const datei of anlass.dateien) {
    console.log(`  ${klassifiziere(datei).padEnd(9)} ${datei}`);
  }
}
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `${ausgabe.join("\n")}\n`);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  const ja = (/** @type {boolean} */ wert) => (wert ? "ja" : "nein");
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      "### Umfang der Prüfung",
      "",
      umfang.grund,
      "",
      "| Prüfung | läuft |",
      "| --- | --- |",
      `| Schnelle Prüfung | ${ja(umfang.schnell)} |`,
      `| Docker Compose + Playwright (Chromium, 375 px) | ${ja(umfang.e2e)} |`,
      `| Firefox, Edge, axe, Screenshots | ${ja(umfang.browserVoll)} |`,
      `| Liferay 6.2.5 | ${ja(umfang.liferay625)} |`,
      `| Liferay 7.2 | ${ja(umfang.liferay72)} |`,
      "",
      "#### Ablauf-Fälle im Browser nach Modul (CI-37)",
      "",
      `Module: ${ablaufModule}`,
      "",
      `Gründe: ${ablauf.gruende.map((grund) => `\`${grund}\``).join(", ")}`,
      "",
      ...(ablauf.grepInvert ? ["Abgewählt mit `--grep-invert`:", "", "```", ablauf.grepInvert, "```", ""] : []),
    ].join("\n"),
  );
}
