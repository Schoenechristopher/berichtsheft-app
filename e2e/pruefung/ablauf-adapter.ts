/**
 * Ablauf-Adapter für TypeScript (`specs/pruefung/format.md`, „Aufbau eines Ablauf-Falls“): übersetzt die
 * neutralen Aktionen eines Ablauf-Falls in Klicks im Browser und liest das Ergebnis über feste Merker der
 * Oberfläche (`data-warnung-verlassen`, `data-status`, `data-woche`, `data-fehler`, `data-feld` …), nie über
 * Meldungstexte. Er deutet kein Ergebnis um: Was die Seite zeigt, wird geliefert.
 *
 * Uhr und Bestand stellt der Runner über die Testschnittstelle der App (`src/app/api/test/zustand`), die es nur
 * außerhalb von Produktion mit Test-Login gibt; angemeldet wird deshalb über den Test-Login.
 */
import type { Browser, BrowserContext, BrowserContextOptions, Page } from "@playwright/test";
import { DAY_TYPES, DAY_TYPE_LABELS } from "../../src/domain/report-days";
import type { ReportStatus } from "../../src/domain/report-access";
import { isoWeekWorkdays, toDateInput, weekdayShort } from "../../src/domain/weeks";
import { formatInstant, formatWeek, parseWeek, statusName } from "../../tests/pruefung/adapter";
import type { CheckCase } from "../../tests/pruefung/cases";
import { accounts, reportIdOf } from "../helpers";

type Input = Record<string, unknown>;
type Result = Record<string, unknown>;

/** Ein Ablauf-Fall, der nicht dem Format folgt: Der Test scheitert (kein stilles Überspringen). */
export class FlowCaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlowCaseError";
  }
}

/** Personen mit Schlüssel aus `testdaten.json`; der Seed der App legt dieselben an. */
const PERSONS: Record<string, { name: string; email: string }> = Object.fromEntries(
  Object.entries(accounts).map(([key, account]) => [key, { name: account.name, email: account.email }]),
);
const KEY_BY_NAME = new Map(Object.entries(PERSONS).map(([key, person]) => [person.name, key]));

const PAGES = ["anmelden", "kein_zugang", "start", "wochen", "bericht", "pruefliste"] as const;
type PageName = (typeof PAGES)[number];

const LEAVE_WAYS = ["link", "neu_laden", "zurueck", "vor", "schliessen"] as const;
const DIALOG_ANSWERS = ["abbrechen", "bestaetigen"] as const;
type DialogAnswer = (typeof DIALOG_ANSWERS)[number];

/** Feste Felder je Aktion (`format.md`, „Aktionen der Ablauf-Fälle“). */
const ACTIONS: Record<string, { required: string[]; optional: string[] }> = {
  anmelden: { required: [], optional: [] },
  abmelden: { required: [], optional: ["dialog"] },
  seite_aufrufen: { required: ["seite"], optional: ["azubi", "woche", "dialog"] },
  seite_verlassen: { required: ["weg"], optional: ["ziel", "azubi", "woche", "dialog"] },
  seite_lesen: { required: [], optional: [] },
  tag_erfassen: { required: ["woche", "tag"], optional: ["tagesart", "text"] },
  speichern: { required: [], optional: [] },
  einreichen: { required: [], optional: [] },
};

/** Wie lange auf eine Warnung oder einen Seitenwechsel gewartet wird, wenn nichts geschieht (z. B. „Vor“ ohne Ziel). */
const QUIET_MS = 3_000;
/** Wartezeit auf das Laden einer Seite (der Entwicklungsserver übersetzt Seiten beim ersten Aufruf). */
const LOAD_MS = 30_000;

/** Adresse einer neutral benannten Seite (nur `link`-Ziele und `seite_aufrufen`). */
const PAGE_PATHS: Record<Exclude<PageName, "bericht" | "start">, string> = {
  anmelden: "/anmelden",
  kein_zugang: "/kein-zugang",
  wochen: "/azubi/wochen",
  pruefliste: "/ausbilder/pruefliste",
};

/** Seite der App → neutraler Name; eine unbekannte Adresse lässt den Fall scheitern. */
function pageName(url: string): PageName {
  const { pathname } = new URL(url);
  if (pathname === "/anmelden") return "anmelden";
  if (pathname === "/kein-zugang") return "kein_zugang";
  if (pathname === "/azubi" || pathname === "/ausbilder") return "start";
  if (pathname === "/azubi/wochen") return "wochen";
  if (pathname === "/ausbilder/pruefliste") return "pruefliste";
  if (/^\/berichte\/[^/]+$/.test(pathname)) return "bericht";
  throw new Error(`Die Seite ${pathname} hat keinen neutralen Namen (format.md, „Seiten“).`);
}

/** Adresse einer Seite außer `start`; `bericht` braucht `azubi` und `woche`, die es nur dort gibt. */
async function pagePath(target: Exclude<PageName, "start">, step: Input, where: string): Promise<string> {
  if (target !== "bericht") {
    if ("azubi" in step || "woche" in step) {
      throw new FlowCaseError(`${where}: „azubi“ und „woche“ gibt es nur bei der Seite „bericht“.`);
    }
    return PAGE_PATHS[target];
  }
  const azubi = textField(step, "azubi", where);
  const week = parseWeek(textField(step, "woche", where));
  if (!Object.hasOwn(PERSONS, azubi)) {
    throw new FlowCaseError(`${where}: unbekannter Azubi „${azubi}“.`);
  }
  const id = await reportIdOf(PERSONS[azubi].email, week.isoYear, week.isoWeek).catch(() => {
    throw new FlowCaseError(`${where}: Den Bericht ${formatWeek(week)} von ${azubi} gibt es nicht.`);
  });
  return `/berichte/${id}`;
}

function checkFields(step: Input, where: string) {
  const action = step.aktion;
  if (typeof action !== "string" || !Object.hasOwn(ACTIONS, action)) {
    throw new FlowCaseError(`${where}: unbekannte Aktion „${String(action)}“.`);
  }
  const { required, optional } = ACTIONS[action];
  const allowed = new Set(["als", "aktion", "uhr", ...required, ...optional]);
  for (const name of Object.keys(step)) {
    if (!allowed.has(name)) {
      throw new FlowCaseError(`${where}: Feld „${name}“ gibt es bei „${action}“ nicht.`);
    }
  }
  for (const name of ["als", ...required]) {
    if (!(name in step)) {
      throw new FlowCaseError(`${where}: Pflichtfeld „${name}“ fehlt.`);
    }
  }
}

function textField(step: Input, name: string, where: string): string {
  const value = step[name];
  if (typeof value !== "string") {
    throw new FlowCaseError(`${where}: „${name}“ muss ein Text sein.`);
  }
  return value;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], what: string, where: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new FlowCaseError(`${where}: ${what} „${String(value)}“ ist keiner von ${allowed.join(", ")}.`);
  }
  return value as T;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Wartet, bis die Bedingung gilt, höchstens `ms` Millisekunden. */
async function until(condition: () => boolean, ms: number) {
  const end = Date.now() + ms;
  while (!condition() && Date.now() < end) {
    await sleep(50);
  }
}

/** Stellt Uhr und Bestand der laufenden App über die Testschnittstelle. */
export async function setAppState(baseURL: string, body: { uhr: string | null; bestand?: "testdaten" }) {
  const response = await fetch(new URL("/api/test/zustand", baseURL), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Testschnittstelle antwortet ${response.status}: ${await response.text()}`);
  }
}

interface Person {
  key: string;
  context: BrowserContext;
  page: Page | null;
  /** Antwort auf die nächste Warnung und die Warnungen, die seit dem letzten Schritt kamen. */
  answer: DialogAnswer;
  dialogs: string[];
}

/** Führt die Schritte eines Ablauf-Falls aus; je Person ein eigener Browser-Kontext. */
export class FlowAdapter {
  private persons = new Map<string, Person>();

  constructor(
    private readonly browser: Browser,
    private readonly contextOptions: BrowserContextOptions,
    private readonly baseURL: string,
  ) {}

  async close() {
    for (const person of this.persons.values()) {
      await person.context.close();
    }
    this.persons.clear();
  }

  /** Führt den Fall aus und liefert `{ ergebnisse }` (`format.md`, „Erwartet“). */
  async run(entry: CheckCase): Promise<Result> {
    if (typeof entry.uhr !== "string") {
      throw new FlowCaseError("Ein Ablauf-Fall braucht „uhr“.");
    }
    if (entry.ausgangsbestand !== undefined) {
      // Personen und Berichte im Ausgangsbestand kommen mit den Ablauf-Fällen der Module (Welle 2).
      throw new FlowCaseError("„ausgangsbestand“ unterstützt der TypeScript-Ablauf-Runner noch nicht.");
    }
    if (!Array.isArray(entry.schritte) || entry.schritte.length === 0) {
      throw new FlowCaseError("„schritte“ muss eine nicht leere Liste sein.");
    }
    const steps = entry.schritte as Input[];
    steps.forEach((step, index) => checkFields(step, `Schritt ${index + 1}`));

    await setAppState(this.baseURL, { uhr: entry.uhr, bestand: "testdaten" });
    const ergebnisse: Result[] = [];
    for (const [index, step] of steps.entries()) {
      const where = `Schritt ${index + 1} (${String(step.aktion)})`;
      if (step.uhr !== undefined) {
        await setAppState(this.baseURL, { uhr: textField(step, "uhr", where) });
      }
      ergebnisse.push(await this.step(step, where));
    }
    return { ergebnisse };
  }

  private async person(key: unknown, where: string): Promise<Person> {
    if (typeof key !== "string" || !Object.hasOwn(PERSONS, key)) {
      throw new FlowCaseError(`${where}: unbekannte Person „${String(key)}“.`);
    }
    let person = this.persons.get(key);
    if (!person) {
      const context = await this.browser.newContext({ ...this.contextOptions, baseURL: this.baseURL });
      person = { key, context, page: null, answer: "abbrechen", dialogs: [] };
      this.persons.set(key, person);
    }
    return person;
  }

  /** Die offene Seite der Person; ohne offenes Fenster öffnet sich eines (wie ein neuer Browser-Tab). */
  private async page(person: Person): Promise<Page> {
    if (!person.page || person.page.isClosed()) {
      const page = await person.context.newPage();
      page.on("dialog", async (dialog) => {
        person.dialogs.push(dialog.type());
        await (person.answer === "bestaetigen" ? dialog.accept() : dialog.dismiss());
      });
      person.page = page;
    }
    return person.page;
  }

  private openPage(person: Person, where: string): Page {
    if (!person.page || person.page.isClosed()) {
      throw new FlowCaseError(`${where}: Die Person hat keine Seite offen.`);
    }
    return person.page;
  }

  private async step(step: Input, where: string): Promise<Result> {
    const person = await this.person(step.als, where);
    switch (step.aktion) {
      case "anmelden":
        return this.login(person);
      case "abmelden":
        return this.leave(person, step, where, async (page) => {
          const logout = page.locator("form button[type=submit]", { hasText: "Abmelden" });
          // Das Kontomenü ist nach einer abgebrochenen Rückfrage noch offen.
          if (!(await logout.isVisible())) {
            await page.getByRole("button", { name: /^Konto:/ }).click();
          }
          await logout.click();
        });
      case "seite_aufrufen":
        return this.visit(person, step, where);
      case "seite_verlassen":
        return this.leaveBy(person, step, where);
      case "seite_lesen":
        return this.read(this.openPage(person, where));
      case "tag_erfassen":
        return this.enterDay(person, step, where);
      case "speichern":
        return this.save(this.openPage(person, where));
      case "einreichen":
        return this.submit(this.openPage(person, where));
      default:
        throw new FlowCaseError(`${where}: unbekannte Aktion.`);
    }
  }

  /** Anmelden über den Test-Login (Werkzeug des Runners), bis eine Seite der App erscheint. */
  private async login(person: Person): Promise<Result> {
    const page = await this.page(person);
    await page.goto("/anmelden");
    await page
      .getByRole("region", { name: "Test-Login (nur Entwicklung)" })
      .getByRole("button", { name: PERSONS[person.key].name.split(" ")[0], exact: true })
      .click();
    // Über „/“ leitet die App zur Startseite der Rolle weiter.
    await page.waitForURL(
      (url) => !url.pathname.startsWith("/api/auth") && !["/anmelden", "/"].includes(url.pathname),
      {
        timeout: LOAD_MS,
      },
    );
    return this.pageResult(person, null);
  }

  private async visit(person: Person, step: Input, where: string): Promise<Result> {
    const target = oneOf(step.seite, PAGES, "Seite", where);
    const path = target === "start" ? "/" : await pagePath(target, step, where);
    await this.page(person);
    return this.leave(person, step, where, (page) => page.goto(path, { timeout: LOAD_MS }).then(() => undefined));
  }

  private async leaveBy(person: Person, step: Input, where: string): Promise<Result> {
    const way = oneOf(step.weg, LEAVE_WAYS, "Weg", where);
    if ((way === "link") !== "ziel" in step) {
      throw new FlowCaseError(`${where}: „ziel“ gehört genau zum Weg „link“.`);
    }
    this.openPage(person, where);
    switch (way) {
      case "link": {
        const target = oneOf(step.ziel, PAGES, "Ziel", where);
        if (target === "start") {
          throw new FlowCaseError(`${where}: Das Link-Ziel „start“ kennt der Adapter noch nicht.`);
        }
        const path = await pagePath(target, step, where);
        // Der erste sichtbare Link der App auf diese Seite (am Handy liegt die Navigation in der Schublade).
        return this.leave(person, step, where, (page) => page.locator(`a[href="${path}"]:visible`).first().click());
      }
      case "neu_laden":
        return this.leave(person, step, where, (page) => page.evaluate(() => window.location.reload()));
      case "zurueck":
        return this.leave(person, step, where, (page) => page.evaluate(() => window.history.back()));
      case "vor":
        return this.leave(person, step, where, (page) => page.evaluate(() => window.history.forward()));
      case "schliessen":
        return this.leave(person, step, where, (page) => page.close({ runBeforeUnload: true }));
    }
  }

  /**
   * Löst einen Seitenwechsel aus und wartet, bis er geschehen ist oder die Person nach einer Warnung auf der Seite
   * bleibt. Die Warnung liest der Adapter aus dem Merker `data-warnung-verlassen`, den die Seite trägt, solange sie
   * scharf ist; ein Dialog ohne diesen Merker lässt den Fall scheitern.
   */
  private async leave(
    person: Person,
    step: Input,
    where: string,
    trigger: (page: Page) => Promise<unknown>,
  ): Promise<Result> {
    const answer = step.dialog === undefined ? "abbrechen" : oneOf(step.dialog, DIALOG_ANSWERS, "Dialog", where);
    const page = await this.page(person);
    const armed = page.url().startsWith("http")
      ? await page.evaluate(
          () => document.querySelector("[data-warnung-verlassen]")?.getAttribute("data-warnung-verlassen") ?? null,
        )
      : null;
    const before = page.url();
    person.answer = answer;
    person.dialogs = [];
    let loads = 0;
    const onLoad = () => loads++;
    page.on("load", onLoad);
    const moved = () => page.isClosed() || page.url() !== before || loads > 0;

    // Die Aktion selbst kann an einer Warnung hängen bleiben (z. B. `goto` nach „Abbrechen“); sie läuft weiter.
    void trigger(page).catch(() => undefined);
    await until(() => person.dialogs.length > 0 || moved(), QUIET_MS);
    // „Zurück“ verlässt zuerst den Schutzeintrag; die Rückfrage kommt danach.
    await sleep(300);
    if (person.dialogs.length > 0 && answer === "bestaetigen") {
      await until(moved, LOAD_MS);
    }
    page.off("load", onLoad);
    if (!page.isClosed()) {
      await page.waitForLoadState("load", { timeout: LOAD_MS });
    }

    const dialogs = person.dialogs;
    person.answer = "abbrechen";
    if (dialogs.length > 1) {
      throw new Error(`${where}: ${dialogs.length} Dialoge statt höchstens einem (${dialogs.join(", ")}).`);
    }
    if (dialogs.length === 1 && !armed) {
      throw new Error(`${where}: Dialog „${dialogs[0]}“, obwohl die Seite keine Warnung trug.`);
    }
    return this.pageResult(person, dialogs.length === 1 ? armed : null);
  }

  /** Wartet, bis die Seite fertig geladen und hydriert ist (keine Platzhalter, Eingaben freigegeben). */
  private async settled(page: Page) {
    await page.waitForFunction(
      () =>
        document.querySelector("[data-skeleton]") === null &&
        document.querySelector("textarea[data-feld][readonly]") === null,
      undefined,
      { timeout: LOAD_MS },
    );
  }

  private async pageResult(person: Person, warning: string | null): Promise<Result> {
    const page = person.page;
    if (!page || page.isClosed()) {
      return { warnung: warning, seite: null, angemeldet: null };
    }
    await this.settled(page);
    return { warnung: warning, seite: pageName(page.url()), angemeldet: await this.signedIn(page) };
  }

  /** Person, als die die Seite angemeldet zeigt (Kontomenü der Kopfzeile), sonst `null`. */
  private async signedIn(page: Page): Promise<string | null> {
    const name = await page.evaluate(
      () => document.querySelector("[data-testid=current-person] span")?.textContent?.trim() ?? null,
    );
    if (name === null) {
      return null;
    }
    const key = KEY_BY_NAME.get(name);
    if (!key) {
      throw new Error(`Angemeldet ist eine Person ohne Schlüssel: ${name}`);
    }
    return key;
  }

  /** Seiteninhalt (`format.md`, „Seiteninhalt“) aus den festen Merkern der Seite. */
  private async read(page: Page): Promise<Result> {
    await this.settled(page);
    const seite = pageName(page.url());
    const base: Result = {
      seite,
      angemeldet: await this.signedIn(page),
      passwortfeld: (await page.locator('input[type="password"]').count()) > 0,
    };
    if (seite === "anmelden") {
      const ways = await page
        .locator("[data-anmeldeweg]")
        .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-anmeldeweg")));
      return { ...base, anmeldewege: ways };
    }
    if (seite === "start" && new URL(page.url()).pathname === "/azubi") {
      const week = await page.evaluate(
        () => document.querySelector("[data-testid=current-week]")?.getAttribute("data-woche") ?? null,
      );
      return { ...base, aktuelle_woche: week };
    }
    if (seite === "bericht") {
      return { ...base, ...(await this.readReport(page)) };
    }
    return base;
  }

  private async readReport(page: Page): Promise<Result> {
    const raw = await page.evaluate(() => {
      const controls = "select, textarea, input:not([type=hidden]), [role=radiogroup]";
      const fieldName = (element: Element) =>
        element.closest("[data-feld]")?.getAttribute("data-feld") ?? "ohne_merker";
      const form = document.querySelector("form[data-ungespeichert]");
      const days = form ? [...form.querySelectorAll("fieldset[data-datum]")] : null;
      const inDays = (element: Element) => element.closest("fieldset[data-datum]") !== null;
      return {
        woche: document.querySelector("h1[data-woche], h2[data-woche]")?.getAttribute("data-woche") ?? null,
        status:
          document
            .querySelector("[data-testid=report-status]")
            ?.closest("[data-status]")
            ?.getAttribute("data-status") ?? null,
        ungespeichert: form?.getAttribute("data-ungespeichert") === "true",
        tage:
          days?.map((day) => ({
            datum: day.getAttribute("data-datum") ?? "",
            felder: [...day.querySelectorAll(controls)]
              .filter((element) => !element.closest("[role=radiogroup]") || element.matches("[role=radiogroup]"))
              .map(fieldName),
          })) ?? null,
        weitere_felder: form
          ? [...form.querySelectorAll(controls)].filter((element) => !inDays(element)).map(fieldName)
          : [],
        historie: [...document.querySelectorAll("[data-nach]")].map((change) => ({
          von: change.getAttribute("data-von"),
          nach: change.getAttribute("data-nach") ?? "",
          person: change.getAttribute("data-person") ?? "",
          zeitpunkt: change.getAttribute("data-zeitpunkt") ?? "",
        })),
      };
    });
    if (raw.ungespeichert) {
      // Diagnose ohne Einfluss auf das Ergebnis: Welche Felder weichen ab, und ist es ein frisch geladenes Dokument?
      // Nur Testdaten; erscheint im Testprotokoll, wenn die Seite ungespeicherte Änderungen meldet.
      const detail = await page.evaluate(() => ({
        timeOrigin: performance.timeOrigin,
        readyState: document.readyState,
        felder: [...document.querySelectorAll("fieldset[data-datum]")].map((day) => ({
          datum: day.getAttribute("data-datum"),
          tagesart: day.querySelector<HTMLSelectElement>("select[data-feld=tagesart]")?.value ?? null,
          text: day.querySelector<HTMLTextAreaElement>("textarea[data-feld=taetigkeiten]")?.value ?? null,
        })),
      }));
      console.log(`[ablauf-adapter] Seite meldet ungespeicherte Änderungen: ${JSON.stringify(detail)}`);
    }
    const status = (value: string | null) => (value === null ? null : (statusName(value as ReportStatus) ?? value));
    return {
      woche: raw.woche,
      status: status(raw.status),
      ungespeichert: raw.ungespeichert,
      tage:
        raw.tage?.map((day) => ({ tag: weekdayShort(new Date(`${day.datum}T00:00:00Z`)), felder: day.felder })) ?? null,
      weitere_felder: raw.weitere_felder,
      historie: raw.historie
        .map((change) => ({
          von: status(change.von),
          nach: status(change.nach),
          person: KEY_BY_NAME.get(change.person) ?? change.person,
          zeitpunkt: formatInstant(new Date(change.zeitpunkt)),
        }))
        .sort((a, b) => Date.parse(a.zeitpunkt) - Date.parse(b.zeitpunkt)),
    };
  }

  /** Eingabe eines Tages auf der geöffneten Berichtsseite dieser Woche, ohne zu speichern. */
  private async enterDay(person: Person, step: Input, where: string): Promise<Result> {
    const page = this.openPage(person, where);
    const week = parseWeek(textField(step, "woche", where));
    const day = oneOf(step.tag, ["Mo", "Di", "Mi", "Do", "Fr"] as const, "Tag", where);
    const shown =
      pageName(page.url()) === "bericht" ? await page.locator("[data-woche]").first().getAttribute("data-woche") : null;
    if (shown !== formatWeek(week) || (await page.locator("form[data-ungespeichert]").count()) === 0) {
      throw new FlowCaseError(`${where}: Die Berichtsseite ${formatWeek(week)} ist nicht zum Erfassen geöffnet.`);
    }
    await this.settled(page);
    const date = toDateInput(isoWeekWorkdays(week.isoYear, week.isoWeek)[["Mo", "Di", "Mi", "Do", "Fr"].indexOf(day)]);
    const fieldset = page.locator(`fieldset[data-datum="${date}"]`);
    if ("tagesart" in step) {
      const label = textField(step, "tagesart", where);
      const value = label === "" ? "" : DAY_TYPES.find((type) => DAY_TYPE_LABELS[type] === label);
      if (value === undefined) {
        throw new FlowCaseError(`${where}: unbekannte Tagesart „${label}“.`);
      }
      const select = fieldset.locator("select[data-feld=tagesart]");
      if ((await select.count()) > 0) {
        // Wie eine Person: erst in die Auswahl klicken (Nutzerinteraktion, siehe unten), dann wählen.
        await select.click();
        await select.selectOption(value);
      } else if (value === "") {
        throw new FlowCaseError(`${where}: Die Segment-Auswahl kann die Tagesart nicht leeren.`);
      } else {
        await fieldset.locator(`[data-feld=tagesart] [role=radio][id$="-${value}"]`).click();
      }
    }
    if ("text" in step) {
      // Wie eine Person erst ins Feld klicken, dann tippen: Firefox zeigt den Dialog beim Neuladen oder Schließen
      // (`beforeunload`) nur nach einer echten Nutzerinteraktion mit der Seite, und `fill()` allein zählt dort nicht.
      const textarea = fieldset.locator("textarea[data-feld=taetigkeiten]");
      await textarea.click();
      await textarea.fill(textField(step, "text", where));
    }
    return { erfasst: true };
  }

  /** „Speichern“ auf der geöffneten Berichtsseite. */
  private async save(page: Page): Promise<Result> {
    const form = page.locator("form[data-ungespeichert]");
    await form.locator("button[type=submit][value=save]").click();
    await page.waitForFunction(
      () => {
        const element = document.querySelector("form[data-ungespeichert]");
        return element !== null && !element.hasAttribute("data-ausstehend");
      },
      undefined,
      { timeout: LOAD_MS },
    );
    if ((await form.getAttribute("data-ungespeichert")) !== "false") {
      throw new Error("Speichern ohne Ergebnis: Die Seite zeigt weiter ungespeicherte Änderungen.");
    }
    return { gespeichert: true };
  }

  /** „Einreichen“ auf der geöffneten Berichtsseite, Rückfrage bestätigt. */
  private async submit(page: Page): Promise<Result> {
    const statusOf = () =>
      page.evaluate(
        () =>
          document
            .querySelector("[data-testid=report-status]")
            ?.closest("[data-status]")
            ?.getAttribute("data-status") ?? null,
      );
    const before = await statusOf();
    await page.getByRole("button", { name: /^(Erneut einreichen|Einreichen)/ }).click();
    const issues = page.locator("[data-fehler=pflichtangaben_fehlen]");
    const dialog = page.locator("dialog[open]");
    await issues.or(dialog).first().waitFor({ timeout: LOAD_MS });
    if (await issues.isVisible()) {
      const days = await page
        .locator("fieldset[data-datum][data-fehler]")
        .evaluateAll((elements) =>
          elements.map((element) => [element.getAttribute("data-datum") ?? "", element.getAttribute("data-fehler")]),
        );
      return {
        fehler: "pflichtangaben_fehlen",
        tage: days.map(([date, fehler]) => ({ tag: weekdayShort(new Date(`${date}T00:00:00Z`)), fehler })),
      };
    }
    await dialog.locator("button[type=submit][value=submit]").click();
    await page.waitForFunction(
      (previous) =>
        document.querySelector("[data-testid=report-status]")?.closest("[data-status]")?.getAttribute("data-status") !==
        previous,
      before,
      { timeout: LOAD_MS },
    );
    const after = await statusOf();
    return { status: after === null ? null : (statusName(after as ReportStatus) ?? after) };
  }
}
