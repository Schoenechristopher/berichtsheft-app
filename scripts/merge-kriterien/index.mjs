/**
 * Job „Merge-Kriterien“ (docs/07-spec-automatisches-mergen.md, AM-S02): sammelt die Eingaben für
 * `entscheideAutomerge` und scheitert, wenn ein Antrag (Label `automerge`) gestellt, der PR aber nicht zulässig ist.
 *
 * Dateien, Zeilen und Inhalte kommen aus dem Checkout (Test-Merge des PRs: `HEAD^1` = Ziel-Branch, `HEAD` = mit PR),
 * Kommentare und der Status von `main` aus der GitHub-API (nur lesend). Setzt nie Labels und mergt nie.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { entscheideAutomerge, prueffallIds, testsJeAk } from "./merge-kriterien.mjs";

/** @param {string[]} args */
function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

/** Inhalt einer Datei in einem Stand oder leer, wenn sie dort fehlt. */
function dateiIn(/** @type {string} */ stand, /** @type {string} */ pfad) {
  try {
    return execFileSync("git", ["show", `${stand}:${pfad}`], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

/** @param {string} pfad */
async function api(pfad) {
  const antwort = await fetch(`${process.env.GITHUB_API_URL ?? "https://api.github.com"}${pfad}`, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!antwort.ok) {
    throw new Error(`GitHub-API ${pfad}: ${antwort.status} ${await antwort.text()}`);
  }
  return antwort.json();
}

/** Geänderte Dateien mit Status, Zeilenzahl und hinzugefügten Zeilen. */
function geaenderteDateien(/** @type {string} */ basis, /** @type {string} */ stand) {
  /** @type {Map<string, import("./merge-kriterien.mjs").Datei>} */
  const dateien = new Map();
  for (const zeile of git("diff", "--name-status", "-M", basis, stand).split("\n").filter(Boolean)) {
    const [status, ...pfade] = zeile.split("\t");
    const art = /** @type {"A" | "M" | "D" | "R"} */ (status[0] === "R" ? "R" : status[0] === "C" ? "A" : status[0]);
    const pfad = pfade.at(-1) ?? "";
    dateien.set(pfad, { pfad, status: art, alterPfad: art === "R" ? pfade[0] : undefined, zeilen: 0, neueZeilen: [] });
  }
  for (const zeile of git("diff", "--numstat", "-M", basis, stand).split("\n").filter(Boolean)) {
    const [plus, minus, ...rest] = zeile.split("\t");
    // Umbenennungen erscheinen als „alt => neu“ bzw. „ordner/{alt => neu}/datei“.
    const roh = rest.join("\t");
    const pfad = roh.includes(" => ")
      ? roh
          .replace(/\{([^{}]*) => ([^{}]*)\}/, "$2")
          .replace(/^.* => /, "")
          .replace("//", "/")
      : roh;
    const datei = dateien.get(pfad);
    if (datei) {
      datei.zeilen = (Number(plus) || 0) + (Number(minus) || 0);
    }
  }
  /** @type {import("./merge-kriterien.mjs").Datei | undefined} */
  let aktuell;
  for (const zeile of git("diff", "-U0", "-M", basis, stand).split("\n")) {
    if (zeile.startsWith("+++ ")) {
      aktuell = dateien.get(zeile.slice(4).replace(/^b\//, ""));
    } else if (zeile.startsWith("+") && aktuell) {
      aktuell.neueZeilen?.push(zeile.slice(1));
    }
  }
  return [...dateien.values()];
}

/** IDs aller Prüffälle unter `specs/pruefung/` in einem Stand. */
function prueffaelle(/** @type {string} */ stand) {
  let liste = "";
  try {
    liste = git("ls-tree", "-r", "--name-only", stand, "specs/pruefung/");
  } catch {
    return [];
  }
  return liste
    .split("\n")
    .filter((pfad) => pfad.endsWith(".json"))
    .flatMap((pfad) => prueffallIds(dateiIn(stand, pfad)));
}

const ereignis = process.env.GITHUB_EVENT_NAME ?? "pull_request";
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH ?? "/dev/null", "utf8") || "{}");
const repo = process.env.GITHUB_REPOSITORY ?? "";

/** @type {import("./merge-kriterien.mjs").PrDaten} */
let daten;
if (ereignis === "merge_group") {
  daten = /** @type {any} */ ({ ereignis: "merge_group", labels: [] });
} else {
  const pr = event.pull_request;
  const labels = (pr.labels ?? []).map((/** @type {{ name: string }} */ label) => label.name);
  const basis = "HEAD^1";
  const stand = "HEAD";
  const kommentare = [];
  if (labels.includes("automerge")) {
    for (let seite = 1; ; seite++) {
      const teil = await api(`/repos/${repo}/issues/${pr.number}/comments?per_page=100&page=${seite}`);
      kommentare.push(...teil);
      if (teil.length < 100) {
        break;
      }
    }
  }
  const laeufe = labels.includes("automerge")
    ? await api(`/repos/${repo}/actions/workflows/ci.yml/runs?branch=main&status=completed&per_page=1`)
    : { workflow_runs: [] };
  const paket = JSON.parse(dateiIn(basis, "package.json") || "{}");
  daten = {
    ereignis: "pull_request",
    labels,
    vonAussen: pr.head?.repo?.full_name !== pr.base?.repo?.full_name,
    autor: pr.user?.login ?? "",
    titel: pr.title ?? "",
    beschreibung: pr.body ?? "",
    headSha: pr.head?.sha ?? "",
    dateien: geaenderteDateien(basis, stand),
    // Schreibrecht: Eigentümer, Mitglied der Organisation oder Mitarbeitender des Repositorys.
    kommentare: kommentare.map((/** @type {any} */ kommentar) => ({
      text: kommentar.body ?? "",
      schreibrecht: ["OWNER", "MEMBER", "COLLABORATOR"].includes(kommentar.author_association),
    })),
    testsVorher: testsJeAk(dateiIn(basis, "docs/03-testabdeckung.md")),
    testsNachher: testsJeAk(dateiIn(stand, "docs/03-testabdeckung.md")),
    prueffaelleVorher: prueffaelle(basis),
    prueffaelleNachher: prueffaelle(stand),
    laufzeitAbhaengigkeiten: Object.keys(paket.dependencies ?? {}),
    mainGruen: laeufe.workflow_runs[0]?.conclusion === "success",
    schalterAn: /^aktiv:\s*true\s*$/m.test(dateiIn(basis, ".github/automerge.yml")),
  };
}

const entscheidung = entscheideAutomerge(daten);
const ja = (/** @type {boolean} */ wert) => (wert ? "ja" : "nein");
const bericht = [
  "### Merge-Kriterien",
  "",
  `Ergebnis: **${entscheidung.hinweis}**`,
  "",
  ...(entscheidung.antrag && ereignis !== "merge_group"
    ? [
        `- Antrag (Label \`automerge\`): ja`,
        `- Zulässig: ${ja(entscheidung.zulaessig)}`,
        `- Zulässig ohne Schalter (Schattenbetrieb, AM-R14): ${ja(entscheidung.zulaessigOhneSchalter)}`,
        "",
        ...(entscheidung.gruende.length > 0
          ? ["Gründe:", "", ...entscheidung.gruende.map((grund) => `- ${grund}`)]
          : []),
      ]
    : []),
  "",
].join("\n");
console.log(bericht);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, bericht);
}
process.exit(entscheidung.zulaessig ? 0 : 1);
