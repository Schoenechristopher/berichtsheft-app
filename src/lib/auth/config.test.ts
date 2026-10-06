import { describe, expect, it } from "vitest";
import { SESSION_MAX_AGE_SECONDS, SESSION_STRATEGY, oidcConfig, testLoginEnabled, toInternalUrl } from "./config";

describe("Anmelde-Konfiguration", () => {
  it("liest den OIDC-Adapter aus der Umgebung", () => {
    expect(
      oidcConfig({
        AUTH_OIDC_ISSUER: "http://localhost:8080/realms/berichtsheft/",
        AUTH_OIDC_INTERNAL_ISSUER: "http://keycloak:8080",
        AUTH_OIDC_CLIENT_ID: "berichtsheft-app",
        AUTH_OIDC_CLIENT_SECRET: "geheim",
      }),
    ).toEqual({
      issuer: "http://localhost:8080/realms/berichtsheft",
      internalIssuer: "http://keycloak:8080",
      clientId: "berichtsheft-app",
      clientSecret: "geheim",
      accountIdClaim: "sub",
      emailClaim: "email",
      emailVerifiedClaim: "email_verified",
      name: "Firmenkonto",
    });
  });

  it("Entra ID: Konto-ID aus dem Claim oid", () => {
    expect(
      oidcConfig({
        AUTH_OIDC_ISSUER: "https://login.microsoftonline.com/tenant/v2.0",
        AUTH_OIDC_CLIENT_ID: "app",
        AUTH_OIDC_ACCOUNT_ID_CLAIM: "oid",
      })?.accountIdClaim,
    ).toBe("oid");
  });

  it("AK-201 Entra ID: E-Mail und Bestätigungs-Claim per Konfiguration", () => {
    const config = oidcConfig({
      AUTH_OIDC_ISSUER: "https://login.microsoftonline.com/tenant/v2.0",
      AUTH_OIDC_CLIENT_ID: "app",
      AUTH_OIDC_EMAIL_CLAIM: "email",
      AUTH_OIDC_EMAIL_VERIFIED_CLAIM: "xms_edov",
    });
    expect(config?.emailClaim).toBe("email");
    expect(config?.emailVerifiedClaim).toBe("xms_edov");
  });

  it("AK-204 Sitzungen: signierte JWT-Cookies, 8 Stunden gültig (Entscheidung Sitzungen)", () => {
    expect(SESSION_STRATEGY).toBe("jwt");
    expect(SESSION_MAX_AGE_SECONDS).toBe(8 * 60 * 60);
  });

  it("ohne Aussteller oder Client-ID gibt es keinen OIDC-Provider", () => {
    expect(oidcConfig({ AUTH_OIDC_CLIENT_ID: "app" })).toBeNull();
    expect(oidcConfig({ AUTH_OIDC_ISSUER: "http://idp" })).toBeNull();
  });

  it("Test-Login nur außerhalb von Produktion und nur bei ausdrücklicher Freigabe", () => {
    expect(testLoginEnabled({ NODE_ENV: "development", AUTH_TEST_LOGIN: "true" })).toBe(true);
    expect(testLoginEnabled({ NODE_ENV: "test", AUTH_TEST_LOGIN: "true" })).toBe(true);
    expect(testLoginEnabled({ NODE_ENV: "production", AUTH_TEST_LOGIN: "true" })).toBe(false);
    expect(testLoginEnabled({ NODE_ENV: "development" })).toBe(false);
  });

  it("schreibt nur URLs des öffentlichen Ausstellers auf die interne Adresse um", () => {
    const config = { issuer: "http://localhost:8080/realms/berichtsheft", internalIssuer: "http://keycloak:8080" };
    expect(toInternalUrl("http://localhost:8080/realms/berichtsheft/.well-known/openid-configuration", config)).toBe(
      "http://keycloak:8080/realms/berichtsheft/.well-known/openid-configuration",
    );
    expect(toInternalUrl("https://example.test/x", config)).toBe("https://example.test/x");
    expect(toInternalUrl("http://localhost:8080/x", { issuer: config.issuer })).toBe("http://localhost:8080/x");
  });
});
