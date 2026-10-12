import { cookies } from "next/headers";
import { THEME_COOKIE, resolveTheme, type Theme } from "@/domain/theme";
import { getCurrentPerson } from "@/lib/session";

/**
 * Darstellung für das erste Rendern (UI-AK-14, UI-AK-15): angemeldet die Wahl am Konto, sonst das
 * Cookie. Der Server setzt damit `data-theme` am `html`-Element – es blitzt nichts auf.
 */
export async function themeForRequest(): Promise<Theme> {
  const cookie = (await cookies()).get(THEME_COOKIE)?.value;
  let accountTheme: Theme | null = null;
  try {
    accountTheme = (await getCurrentPerson())?.theme ?? null;
  } catch {
    // Ohne Datenbank (z. B. Fehlerseite) reicht das Cookie.
  }
  return resolveTheme(accountTheme, cookie);
}
