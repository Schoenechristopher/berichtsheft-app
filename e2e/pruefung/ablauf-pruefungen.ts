/**
 * Prüfvokabular des Ablauf-Adapters (`specs/pruefung/format.md`, „Prüfaktionen“, Entscheidung E3, Variante A):
 * wenige generische Prüfungen der Oberfläche, keine Aktion je AK. Elemente heißen neutral (`menue`, `dialog`,
 * `fehlerleiste` …); welcher feste Merker der Seite dahintersteht, steht nur hier in `ELEMENTS`. Sichtbare Texte
 * liest das Vokabular nicht, außer dem Seitentitel (fester Text nach M09-R22).
 */
import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import { isoWeekWorkdays, toDateInput, weekdayShort } from "../../src/domain/weeks";
import { parseWeek } from "../../tests/pruefung/adapter";

type Input = Record<string, unknown>;
type Result = Record<string, unknown>;

/** Wochentage der Elemente mit `tag`. */
export const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr"] as const;
type Weekday = (typeof WEEKDAYS)[number];

/**
 * Neutrale Elemente → fester Merker der Seite. `param`: Das Element lässt sich mit `tag` (ein Tag des geöffneten
 * Berichts) bzw. `woche` (ein Eintrag der Prüfliste) auf einen Treffer eingrenzen; ohne Angabe zählen alle Treffer.
 */
export const ELEMENTS: Record<string, { selector: string; param?: "tag" | "woche" }> = {
  menue: { selector: "nav[data-menue]" },
  menue_knopf: { selector: "[data-menue-knopf]" },
  menue_schliessen: { selector: "[data-drawer-close]" },
  zum_inhalt: { selector: 'a[href="#inhalt"]' },
  hauptbereich: { selector: "main#inhalt" },
  glocke: { selector: "[data-glocke] > a, [data-glocke] > button" },
  glocke_vorschau: { selector: "[data-glocke-vorschau]" },
  platzhalter: { selector: "[data-skeleton]" },
  meldung: { selector: "[data-testid=toast]" },
  offene_woche: { selector: "[data-testid=todo-week]" },
  leer_zu_erledigen: { selector: "[data-testid=todo-empty]" },
  leer_pruefliste: { selector: "[data-testid=review-queue-empty]" },
  leer_benachrichtigungen: {
    selector: "[data-testid=notifications-empty], [data-testid=notifications-preview-empty]",
  },
  tag: { selector: "fieldset[data-datum]", param: "tag" },
  tagesart: { selector: "[data-feld=tagesart]", param: "tag" },
  taetigkeiten: { selector: "[data-feld=taetigkeiten]", param: "tag" },
  speichern: { selector: "form[data-ungespeichert] button[type=submit][value=save]" },
  einreichen: { selector: "[data-oeffnet-dialog=submit]" },
  fussleiste_gespeichert: { selector: "[data-speicherstand=gespeichert]" },
  fussleiste_ungespeichert: { selector: "[data-speicherstand=ungespeichert]" },
  fehlerleiste: { selector: "[data-testid=submission-issues][data-fehler]" },
  sprunglink: { selector: "[data-testid=submission-issues] a[href^='#']", param: "tag" },
  dialog: { selector: "dialog[open]" },
  dialog_feld: { selector: "dialog[open] textarea" },
  dialog_abbrechen: { selector: "dialog[open] button[type=button]" },
  dialog_bestaetigen: { selector: "dialog[open] button[type=submit]" },
  pruefliste: { selector: "[data-bereich=pruefliste]" },
  pruefeintrag: { selector: "[data-testid=review-row]", param: "woche" },
  bericht_ansicht: { selector: "[data-bereich=bericht_ansicht]" },
  entscheidungsleiste: { selector: "[data-testid=decision-bar]" },
  freigeben: { selector: "[data-oeffnet-dialog=APPROVE]" },
  ablehnen: { selector: "[data-oeffnet-dialog=REJECT]" },
  zurueck_zur_pruefliste: { selector: 'main a[href="/ausbilder/pruefliste"]' },
};

/** Tasten für `taste_druecken` → Taste in Playwright. */
export const KEYS: Record<string, string> = {
  Tab: "Tab",
  "Umschalt+Tab": "Shift+Tab",
  Enter: "Enter",
  Escape: "Escape",
  Leertaste: "Space",
  Pfeil_unten: "ArrowDown",
  Pfeil_oben: "ArrowUp",
};

const ELEMENT_STATES = ["sichtbar", "verborgen", "fehlt"] as const;
export type ElementState = (typeof ELEMENT_STATES)[number];

/** Ein Ablauf-Fall, der nicht dem Format folgt (wie `FlowCaseError` im Adapter). */
export class CheckCaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlowCaseError";
  }
}

export function elementName(value: unknown, where: string): string {
  if (typeof value !== "string" || !Object.hasOwn(ELEMENTS, value)) {
    throw new CheckCaseError(`${where}: unbekanntes Element „${String(value)}“.`);
  }
  return value;
}

export function elementState(value: unknown, where: string): ElementState {
  if (typeof value !== "string" || !(ELEMENT_STATES as readonly string[]).includes(value)) {
    throw new CheckCaseError(`${where}: Zustand „${String(value)}“ ist keiner von ${ELEMENT_STATES.join(", ")}.`);
  }
  return value as ElementState;
}

/** Datum des Wochentags im Bericht, den die Seite gerade zeigt (`data-woche` der Überschrift). */
async function dateOfDay(page: Page, day: Weekday, where: string): Promise<string> {
  const week = await page
    .locator("h1[data-woche], h2[data-woche]")
    .first()
    .getAttribute("data-woche", { timeout: 5_000 })
    .catch(() => null);
  if (!week) {
    throw new CheckCaseError(`${where}: „tag“ braucht einen geöffneten Bericht.`);
  }
  const { isoYear, isoWeek } = parseWeek(week);
  return toDateInput(isoWeekWorkdays(isoYear, isoWeek)[WEEKDAYS.indexOf(day)]);
}

/**
 * Locator eines Elements, mit `tag` bzw. `woche` eingegrenzt. Felder des Schritts außer `element`, `tag` und
 * `woche` prüft der Adapter.
 */
export async function locate(page: Page, step: Input, where: string, field = "element"): Promise<Locator> {
  const name = elementName(step[field], where);
  const { selector, param } = ELEMENTS[name];
  for (const other of ["tag", "woche"] as const) {
    if (other in step && param !== other) {
      throw new CheckCaseError(`${where}: Das Element „${name}“ kennt kein „${other}“.`);
    }
  }
  if (param === "woche" && "woche" in step) {
    const week = step.woche;
    if (typeof week !== "string") {
      throw new CheckCaseError(`${where}: „woche“ muss ein Text sein.`);
    }
    return page.locator(`${selector}[data-woche="${week}"]`);
  }
  if (param === "tag" && "tag" in step) {
    const day = step.tag;
    if (typeof day !== "string" || !(WEEKDAYS as readonly string[]).includes(day)) {
      throw new CheckCaseError(`${where}: Tag „${String(day)}“ ist keiner von ${WEEKDAYS.join(", ")}.`);
    }
    const date = await dateOfDay(page, day as Weekday, where);
    if (name === "tag") {
      return page.locator(`fieldset[data-datum="${date}"]`);
    }
    if (name === "sprunglink") {
      // Der Sprunglink führt zu einem Feld dieses Tages.
      const targets = await page.locator(selector).evaluateAll((links) =>
        links.map(
          (link) =>
            document
              .getElementById((link.getAttribute("href") ?? "").slice(1))
              ?.closest("fieldset[data-datum]")
              ?.getAttribute("data-datum") ?? null,
        ),
      );
      const index = targets.indexOf(date);
      return index < 0 ? page.locator(`${selector}[data-ohne-treffer]`) : page.locator(selector).nth(index);
    }
    return page.locator(`fieldset[data-datum="${date}"] ${selector}`);
  }
  return page.locator(selector);
}

/** `sichtbar`, wenn mindestens ein Treffer sichtbar ist; `verborgen`, wenn es nur unsichtbare gibt; sonst `fehlt`. */
export async function stateOf(locator: Locator): Promise<ElementState> {
  const count = await locator.count();
  if (count === 0) {
    return "fehlt";
  }
  for (let index = 0; index < count; index++) {
    if (await locator.nth(index).isVisible()) {
      return "sichtbar";
    }
  }
  return "verborgen";
}

/**
 * Fokus: das innerste benannte Element, in dem der Fokus liegt (auch das fokussierte selbst), sonst `ohne_merker`;
 * `null`, wenn nichts fokussiert ist. Liegt der Fokus in einem Tag des Berichts, kommt `tag` dazu.
 */
export async function focusOf(page: Page): Promise<Result> {
  const entries = Object.entries(ELEMENTS).map(([name, { selector }]) => [name, selector] as const);
  const focus = await page.evaluate((list) => {
    const active = document.activeElement;
    if (!active || active === document.body || active === document.documentElement) {
      return null;
    }
    let best: { name: string; node: Element } | null = null;
    for (const [name, selector] of list) {
      const node = active.closest(selector);
      if (node && (!best || (best.node !== node && best.node.contains(node)))) {
        best = { name, node };
      }
    }
    return {
      name: best?.name ?? "ohne_merker",
      date: active.closest("fieldset[data-datum]")?.getAttribute("data-datum"),
    };
  }, entries);
  if (focus === null) {
    return { fokus: null };
  }
  return focus.date
    ? { fokus: focus.name, tag: weekdayShort(new Date(`${focus.date}T00:00:00Z`)) }
    : { fokus: focus.name };
}

/** Lage der sichtbaren Treffer: alle in einer Zeile, alle in einer Spalte oder keines von beiden. */
export async function arrangementOf(locators: Locator[]): Promise<Result> {
  const boxes: { left: number; top: number }[] = [];
  for (const locator of locators) {
    for (const element of await locator.all()) {
      const box = await element.boundingBox();
      if (box && (await element.isVisible())) {
        boxes.push({ left: Math.round(box.x), top: Math.round(box.y) });
      }
    }
  }
  const increasing = (values: number[]) => values.every((value, index) => index === 0 || value > values[index - 1]);
  const same = (values: number[]) => new Set(values).size === 1;
  const lefts = boxes.map((box) => box.left);
  const tops = boxes.map((box) => box.top);
  const anordnung =
    boxes.length < 2
      ? "einzeln"
      : same(tops) && increasing(lefts)
        ? "nebeneinander"
        : same(lefts) && increasing(tops)
          ? "untereinander"
          : "gemischt";
  return { anordnung, anzahl: boxes.length };
}

/** Wirksames Farbschema der Seite: Helligkeit des Seitenhintergrunds (Token `--bg`). */
export async function schemeOf(page: Page): Promise<"hell" | "dunkel"> {
  const luminance = await page.evaluate(() => {
    const [r, g, b] = (getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g) ?? ["255", "255", "255"])
      .slice(0, 3)
      .map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  });
  return luminance < 0.5 ? "dunkel" : "hell";
}

/**
 * Wartet höchstens 5 s auf den Seitentitel: Next.js streamt ihn nach dem ersten Inhalt nach. Fehlt er danach noch,
 * melden ihn `ansicht_lesen` (Titel) und axe (`document-title`).
 */
async function titleStreamed(page: Page) {
  await page.waitForFunction(() => document.title !== "", undefined, { timeout: 5_000 }).catch(() => undefined);
}

/** Seitentitel, Zahl der Hauptüberschriften, waagerechtes Scrollen, Farbschema und Menü (`ansicht_lesen`). */
export async function viewOf(page: Page, pageName: (url: string) => string): Promise<Result> {
  await titleStreamed(page);
  const raw = await page.evaluate(() => ({
    titel: document.title,
    hauptueberschriften: document.querySelectorAll("h1").length,
    waagerechtes_scrollen: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    menue: document.querySelector("nav[data-menue]")
      ? [...document.querySelectorAll("nav[data-menue] a[href]")].map((link) => ({
          href: (link as HTMLAnchorElement).href,
          aktiv: link.getAttribute("aria-current") === "page",
        }))
      : null,
  }));
  // Das Teams-Postfach der Demo ist ein Werkzeug der Entwicklung, kein Menüpunkt einer Rolle.
  const links = raw.menue?.filter((link) => new URL(link.href).pathname !== "/entwickler-postfach") ?? null;
  return {
    titel: raw.titel,
    hauptueberschriften: raw.hauptueberschriften,
    waagerechtes_scrollen: raw.waagerechtes_scrollen,
    farbschema: await schemeOf(page),
    menue:
      links === null
        ? null
        : {
            punkte: links.map((link) => pageName(link.href)),
            aktiv: links.filter((link) => link.aktiv).map((link) => pageName(link.href)),
          },
  };
}

/** Stufen der automatischen Prüfung (UI-AK-16): WCAG 2.0 bis 2.2, A und AA. */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Verstöße laut axe als `<Regel> <Ziel>`; das Entwicklungs-Overlay von Next.js zählt nicht. */
export async function axeViolations(page: Page): Promise<string[]> {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await titleStreamed(page);
  const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).exclude("nextjs-portal").analyze();
  return result.violations.flatMap((violation) =>
    violation.nodes.slice(0, 3).map((node) => `${violation.id} ${node.target.join(" ")}`),
  );
}

/** Lage des Fokus für `tastatur_bis`: sichtbar umrandet, im Bild und nicht von einer festen Leiste verdeckt. */
export async function focusVisibility(page: Page) {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element || element === document.body) {
      return null;
    }
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const centerX = Math.min(Math.max(box.left + box.width / 2, 0), window.innerWidth - 1);
    const centerY = Math.min(Math.max(box.top + box.height / 2, 0), window.innerHeight - 1);
    const top = document.elementFromPoint(centerX, centerY);
    return {
      sichtbar: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2,
      imBild: box.bottom > 0 && box.top < window.innerHeight,
      verdeckt: !!top && top !== element && !element.contains(top) && !top.contains(element),
    };
  });
}
