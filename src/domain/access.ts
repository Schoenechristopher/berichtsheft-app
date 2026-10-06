/**
 * Zugangsregeln für die Anmeldung (AK-101, AK-102).
 *
 * Reine Funktionen ohne Abhängigkeit zu UI, Datenbank oder Auth-Bibliothek.
 */

export type Role = "TRAINEE" | "TRAINER";

/** Ausschnitt einer Person, den die Zugangsprüfung braucht. */
export interface PersonForAccess {
  role: Role;
  active: boolean;
}

export type AccessDecision = { allowed: true } | { allowed: false; reason: "unknown-account" | "inactive" };

/** Hinweis bei abgewiesener Anmeldung (AK-102), wörtlich aus der Spezifikation. */
export const NO_ACCESS_MESSAGE = "Kein Zugang – bitte an den Ausbilder wenden";

/**
 * Entscheidet, ob ein Firmenkonto Zugang zur App bekommt: nur mit Eintrag als Person
 * und nur, wenn die Person aktiv ist.
 */
export function decideAccess(person: PersonForAccess | null | undefined): AccessDecision {
  if (!person) {
    return { allowed: false, reason: "unknown-account" };
  }
  if (!person.active) {
    return { allowed: false, reason: "inactive" };
  }
  return { allowed: true };
}

/**
 * Liest die stabile Konto-ID aus den Claims des Identity Providers.
 * Keycloak liefert sie in `sub`, Microsoft Entra ID in `oid`. Namen oder E-Mail-Adressen
 * werden bewusst nicht verwendet, weil sie sich ändern können.
 */
export function extractAccountId(claims: Record<string, unknown> | null | undefined, claim = "sub"): string | null {
  const value = claims?.[claim];
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Startseite je Rolle. */
export function homePathFor(role: Role): string {
  return role === "TRAINER" ? "/ausbilder" : "/azubi";
}

/** Anzeigename der Rolle in der Oberfläche. */
export function roleLabel(role: Role): string {
  return role === "TRAINER" ? "Ausbilder" : "Azubi";
}
