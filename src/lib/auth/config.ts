/**
 * Konfiguration der Anmeldung aus Umgebungsvariablen (siehe .env.example).
 * Der Identity Provider wird nur hierüber angebunden: Demo Keycloak, später Entra ID.
 */

export const OIDC_PROVIDER_ID = "firmenkonto";
export const TEST_PROVIDER_ID = "test-login";

/**
 * Sitzungen (Entscheidung „Sitzungen“): signierte JWT-Cookies, 8 Stunden gültig, kein
 * serverseitiger Widerruf. Eine Deaktivierung wirkt trotzdem sofort, weil jede Anfrage die
 * Person in der Datenbank prüft (src/lib/session.ts).
 */
export const SESSION_STRATEGY = "jwt";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export interface OidcConfig {
  /** Aussteller-URL, wie der Browser den IdP erreicht (steht auch im Token als `iss`). */
  issuer: string;
  /** Optionale interne Adresse für Server-zu-Server-Aufrufe (z. B. http://keycloak:8080). */
  internalIssuer?: string;
  clientId: string;
  clientSecret: string;
  /** Claim mit der stabilen Konto-ID: `sub` (Keycloak) oder `oid` (Entra ID). */
  accountIdClaim: string;
  /** Claim mit der E-Mail für die Zuordnung beim ersten Login (Standard `email`). */
  emailClaim: string;
  /**
   * Claim, der die E-Mail als bestätigt ausweist; nur dann wird über die E-Mail zugeordnet.
   * Keycloak: `email_verified`; Entra ID: z. B. das optionale Claim `xms_edov`.
   */
  emailVerifiedClaim: string;
  /** Anzeigename auf dem Login-Knopf. */
  name: string;
}

export function oidcConfig(env: Record<string, string | undefined> = process.env): OidcConfig | null {
  const issuer = env.AUTH_OIDC_ISSUER?.trim();
  const clientId = env.AUTH_OIDC_CLIENT_ID?.trim();
  if (!issuer || !clientId) {
    return null;
  }
  return {
    issuer: issuer.replace(/\/+$/, ""),
    internalIssuer: env.AUTH_OIDC_INTERNAL_ISSUER?.trim().replace(/\/+$/, "") || undefined,
    clientId,
    clientSecret: env.AUTH_OIDC_CLIENT_SECRET ?? "",
    accountIdClaim: env.AUTH_OIDC_ACCOUNT_ID_CLAIM?.trim() || "sub",
    emailClaim: env.AUTH_OIDC_EMAIL_CLAIM?.trim() || "email",
    emailVerifiedClaim: env.AUTH_OIDC_EMAIL_VERIFIED_CLAIM?.trim() || "email_verified",
    name: env.AUTH_OIDC_NAME?.trim() || "Firmenkonto",
  };
}

/**
 * Test-Login ohne Identity Provider – nur für Entwicklung und Tests, wenn Keycloak nicht
 * verfügbar ist. In Produktion (NODE_ENV=production) ist er immer aus.
 */
export function testLoginEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV !== "production" && env.AUTH_TEST_LOGIN === "true";
}

/**
 * Schreibt URLs des öffentlichen Ausstellers auf die interne Adresse um. Damit erreicht der
 * Server den IdP im Docker-Netz (keycloak:8080), während Browser und Token weiterhin die
 * öffentliche Adresse (localhost:8080) verwenden.
 */
export function toInternalUrl(url: string, config: Pick<OidcConfig, "issuer" | "internalIssuer">): string {
  if (!config.internalIssuer) {
    return url;
  }
  const publicOrigin = new URL(config.issuer).origin;
  const internalOrigin = new URL(config.internalIssuer).origin;
  return url.startsWith(publicOrigin) ? internalOrigin + url.slice(publicOrigin.length) : url;
}
