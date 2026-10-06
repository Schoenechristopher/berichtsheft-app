import { expect, type Page } from "@playwright/test";
import pg from "pg";
import { accountWithoutEntry, seedPersons } from "../src/lib/seed-data";

/** „keycloak“: echter OIDC-Login; „test“: Test-Login-Provider ohne Keycloak. */
export const loginMode = (process.env.E2E_LOGIN_MODE ?? "keycloak") as "keycloak" | "test";

/** Öffentliche Adresse des Identity Providers (Keycloak). */
export const idpOrigin = new URL(process.env.AUTH_OIDC_ISSUER ?? "http://localhost:8080/realms/berichtsheft").origin;

/** Testkonten: Benutzername und Passwort wie im Keycloak-Realm. */
export const accounts = {
  anna: { ...seedPersons.anna, username: "anna", password: "anna" },
  bernd: { ...seedPersons.bernd, username: "bernd", password: "bernd" },
  clara: { ...seedPersons.clara, username: "clara", password: "clara" },
  dora: { ...accountWithoutEntry, username: "dora", password: "dora" },
} as const;

export type TestAccount = (typeof accounts)[keyof typeof accounts];

/** Startet die Anmeldung über das Firmenkonto bzw. den Test-Login, bis zurück in der App. */
export async function login(page: Page, account: TestAccount) {
  await page.goto("/anmelden");
  if (loginMode === "test") {
    await page
      .getByRole("region", { name: "Test-Login (nur Entwicklung)" })
      .getByRole("button", { name: account.name.split(" ")[0], exact: true })
      .click();
  } else {
    await page.getByRole("button", { name: "Mit Firmenkonto anmelden" }).click();
    await submitIdpLogin(page, account);
  }
  await page.waitForURL((url) => url.origin !== idpOrigin && !url.pathname.startsWith("/api/auth"));
}

/** Füllt das Login-Formular von Keycloak aus. */
export async function submitIdpLogin(page: Page, account: TestAccount) {
  await page.waitForURL((url) => url.origin === idpOrigin);
  await page.locator("#username").fill(account.username);
  await page.locator("#password").fill(account.password);
  await page.locator("#kc-login").click();
}

/** Seite enthält kein Passwortfeld (AK-101: kein eigenes Passwort in der App). */
export async function expectNoPasswordField(page: Page) {
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
}

/** Direkter Datenbankzugriff für Testvorbereitung (z. B. deaktivierte Person). */
export async function withDatabase<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const connectionString = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("E2E_DATABASE_URL oder DATABASE_URL muss gesetzt sein.");
  }
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
