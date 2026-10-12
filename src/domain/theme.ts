/**
 * Darstellung der Oberfläche (UI-Spezifikation, „Dunkelmodus“): „System“ folgt
 * `prefers-color-scheme`, „Hell“ und „Dunkel“ überschreiben das. Gespeichert wird die Wahl am
 * Konto (geräteübergreifend) und zusätzlich in einem Cookie, damit der Server schon die
 * Anmeldeseite im richtigen Farbschema ausliefert. Reine Funktionen ohne Abhängigkeit zu UI oder
 * Datenbank.
 */

/** Werte wie im Datenmodell (`enum Theme`). */
export type Theme = "SYSTEM" | "LIGHT" | "DARK";

export const THEMES: readonly Theme[] = ["SYSTEM", "LIGHT", "DARK"];

export const THEME_LABELS: Record<Theme, string> = {
  SYSTEM: "System",
  LIGHT: "Hell",
  DARK: "Dunkel",
};

/** Name des Cookies für das erste Rendern (vor der Anmeldung und auf neuen Seiten). */
export const THEME_COOKIE = "berichtsheft-darstellung";

/** Ein Jahr; die Wahl am Konto gilt ohnehin, sobald jemand angemeldet ist. */
export const THEME_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/** Wert des Attributs `data-theme` am `html`-Element. */
export type ThemeAttribute = "system" | "light" | "dark";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/** Attributwert für `data-theme`. */
export function themeAttribute(theme: Theme): ThemeAttribute {
  return theme.toLowerCase() as ThemeAttribute;
}

/** Cookie-Wert lesen; Unbekanntes oder Fehlendes ergibt null. */
export function themeFromCookie(value: string | null | undefined): Theme | null {
  const upper = value?.toUpperCase();
  return isTheme(upper) ? upper : null;
}

/**
 * Darstellung für das erste Rendern: Die Wahl am Konto gilt vor dem Cookie (zweites Gerät,
 * UI-AK-14); ohne Anmeldung zählt das Cookie, sonst „System“.
 */
export function resolveTheme(accountTheme: Theme | null | undefined, cookieValue: string | null | undefined): Theme {
  return accountTheme ?? themeFromCookie(cookieValue) ?? "SYSTEM";
}
