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

/** Für die Zuordnung beim Login relevante Angaben des Identity Providers. */
export interface LoginClaims {
  /** Stabile Konto-ID (`sub` bzw. `oid`). */
  accountId: string | null;
  /** E-Mail laut Identity Provider, normalisiert (klein geschrieben). */
  email: string | null;
  /** Hat der Identity Provider die E-Mail bestätigt? Nur dann wird über sie zugeordnet. */
  emailVerified: boolean;
}

/** Welche Claims gelesen werden; per Konfiguration einstellbar (Keycloak vs. Entra ID). */
export interface ClaimNames {
  accountIdClaim?: string;
  emailClaim?: string;
  emailVerifiedClaim?: string;
}

/**
 * Liest Konto-ID, E-Mail und Bestätigung der E-Mail aus den Claims.
 * Als bestätigt gilt eine E-Mail nur, wenn der konfigurierte Claim `true` ist
 * (Keycloak: `email_verified`; Entra ID z. B. das optionale Claim `xms_edov`).
 */
export function extractLoginClaims(
  claims: Record<string, unknown> | null | undefined,
  names: ClaimNames = {},
): LoginClaims {
  const rawEmail = claims?.[names.emailClaim ?? "email"];
  const email = typeof rawEmail === "string" && rawEmail.trim() !== "" ? rawEmail.trim().toLowerCase() : null;
  const verified = claims?.[names.emailVerifiedClaim ?? "email_verified"];
  return {
    accountId: extractAccountId(claims, names.accountIdClaim),
    email,
    emailVerified: email !== null && (verified === true || verified === "true"),
  };
}

/** Kandidat für die Zuordnung beim Login. */
export interface LoginCandidate {
  id: string;
  accountId: string | null;
  active: boolean;
}

export type LoginMatch =
  { kind: "known"; personId: string } | { kind: "bind"; personId: string; accountId: string } | { kind: "none" };

/**
 * Ordnet ein Firmenkonto beim Login einer Person zu (Entscheidung „Anlegen über die Firmen-E-Mail“):
 *
 * 1. Gibt es eine Person mit dieser Konto-ID, ist sie es – egal, welche E-Mail das Konto
 *    inzwischen hat.
 * 2. Sonst, nur bei bestätigter E-Mail: Eine aktive Person mit dieser E-Mail, die noch an kein
 *    Konto gebunden ist, wird an diese Konto-ID gebunden.
 * 3. Sonst keine Zuordnung (AK-102). Eine Person, die schon an ein anderes Konto gebunden ist,
 *    wird nie über die E-Mail umgebunden.
 */
export function matchLogin(
  claims: LoginClaims,
  byAccountId: LoginCandidate | null | undefined,
  byEmail: LoginCandidate | null | undefined,
): LoginMatch {
  if (!claims.accountId) {
    return { kind: "none" };
  }
  if (byAccountId) {
    return { kind: "known", personId: byAccountId.id };
  }
  if (claims.emailVerified && byEmail && byEmail.accountId === null && byEmail.active) {
    return { kind: "bind", personId: byEmail.id, accountId: claims.accountId };
  }
  return { kind: "none" };
}

/** Name des Parameters für den Rücksprung nach der Anmeldung (AK-1003), z. B. `/anmelden?ziel=/berichte/…`. */
export const RETURN_PARAM = "ziel";

/**
 * Rücksprungziel nach der Anmeldung (AK-1003: Der Link einer Benachrichtigung führt nach der
 * Anmeldung direkt zum Bericht). Erlaubt sind nur Pfade innerhalb der App – keine fremden
 * Adressen (`//host`, `https://…`), keine Steuerzeichen, nicht die Anmeldung selbst und nicht die
 * Auth-Schnittstelle. Sonst null (dann geht es zur Startseite).
 */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) {
    return null;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }
  // Steuerzeichen (z. B. Zeilenumbrüche) sind in einem Rücksprungziel nie gültig.
  if (/[\u0000-\u001f\u007f\\]/.test(value)) {
    return null;
  }
  const path = value.split(/[?#]/)[0];
  if (path === "/" || path === "/anmelden" || path === "/kein-zugang" || path.startsWith("/api/")) {
    return null;
  }
  return value;
}
