import { expect, type Page } from "@playwright/test";
import pg from "pg";
import { isoWeekWorkdays, toDateInput } from "../src/domain/weeks";
import { accountToCreate, accountWithoutEntry, seedPersons, seedReport } from "../src/lib/seed-data";

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
  emil: { ...accountToCreate, username: "emil", password: "emil" },
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
  // Fertig, sobald die App eine Seite nach der Anmeldung zeigt (Startseite oder „Kein Zugang“).
  await page.waitForURL(
    (url) => url.origin !== idpOrigin && !url.pathname.startsWith("/api/auth") && url.pathname !== "/anmelden",
  );
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

/** Eine Zeile aus der Datenbank lesen (oder null). */
export async function queryOne<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  return withDatabase(async (db) => ((await db.query(sql, params)).rows[0] as T | undefined) ?? null);
}

/** ID einer Person anhand ihrer E-Mail. */
export async function personId(email: string): Promise<string> {
  const row = await queryOne<{ id: string }>("SELECT id FROM person WHERE email = $1", [email]);
  if (!row) {
    throw new Error(`Person ${email} nicht gefunden`);
  }
  return row.id;
}

/** ID eines Wochenberichts einer Person (per E-Mail) oder Fehler, falls er fehlt. */
export async function reportIdOf(email: string, isoYear: number, isoWeek: number): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `SELECT r.id FROM weekly_report r JOIN person p ON p.id = r.trainee_id
     WHERE p.email = $1 AND r.iso_year = $2 AND r.iso_week = $3`,
    [email, isoYear, isoWeek],
  );
  if (!row) {
    throw new Error(`Bericht KW ${isoWeek}/${isoYear} von ${email} fehlt.`);
  }
  return row.id;
}

/** ID von Annas Beispielbericht aus dem Seed (KW 40/2026). */
export async function annasSeedReportId(): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `SELECT r.id FROM weekly_report r JOIN person p ON p.id = r.trainee_id
     WHERE p.email = $1 AND r.iso_year = $2 AND r.iso_week = $3`,
    [seedPersons.anna.email, seedReport.isoYear, seedReport.isoWeek],
  );
  if (!row) {
    throw new Error("Annas Seed-Bericht fehlt – Seed ausführen (npm run db:seed).");
  }
  return row.id;
}

/**
 * Legt einen Azubi direkt in der Datenbank an (Testvorbereitung), optional mit Konto-ID und
 * einem Bericht KW 40/2026. Gibt die IDs zurück.
 */
export async function insertTrainee(options: {
  name: string;
  email: string;
  trainerEmail?: string;
  accountId?: string | null;
  withReport?: boolean;
  /** Ausbildungsbeginn JJJJ-MM-TT, Voreinstellung 2026-09-01. */
  trainingStart?: string;
}): Promise<{ id: string; reportId: string | null }> {
  return withDatabase(async (db) => {
    const { rows } = await db.query(
      `INSERT INTO person (id, account_id, email, name, role, trainer_id, training_start, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'TRAINEE', (SELECT id FROM person WHERE email = $4), $5, now())
       RETURNING id`,
      [
        options.accountId ?? null,
        options.email,
        options.name,
        options.trainerEmail ?? seedPersons.bernd.email,
        options.trainingStart ?? "2026-09-01",
      ],
    );
    const id = rows[0].id as string;
    let reportId: string | null = null;
    if (options.withReport) {
      const report = await db.query(
        `INSERT INTO weekly_report (id, trainee_id, iso_year, iso_week, updated_at)
         VALUES (gen_random_uuid(), $1, 2026, 40, now()) RETURNING id`,
        [id],
      );
      reportId = report.rows[0].id as string;
      await db.query(
        `INSERT INTO report_day (id, report_id, date, day_type, activities)
         VALUES (gen_random_uuid(), $1, '2026-09-28', 'WORK', 'Testtätigkeit')`,
        [reportId],
      );
    }
    return { id, reportId };
  });
}

/** Entfernt Testpersonen (Azubis zuerst, damit die Kaskade ihre Berichte und Historie mitnimmt). */
export async function deletePersons(...emails: string[]) {
  await withDatabase(async (db) => {
    await db.query("DELETE FROM person WHERE email = ANY($1) AND role = 'TRAINEE'", [emails]);
    await db.query("DELETE FROM person WHERE email = ANY($1)", [emails]);
  });
}

/** Stellt den Seed-Zustand von Anna, Bernd, Clara und dem Bundesland wieder her. */
export async function restoreSeedState() {
  await withDatabase(async (db) => {
    await db.query("UPDATE person SET active = true WHERE email = ANY($1)", [
      [seedPersons.anna.email, seedPersons.bernd.email, seedPersons.clara.email],
    ]);
    await db.query(
      `UPDATE person SET trainer_id = (SELECT id FROM person WHERE email = $2), training_start = '2026-09-01',
       training_end = NULL, role = 'TRAINEE', name = $3 WHERE email = $1`,
      [seedPersons.anna.email, seedPersons.bernd.email, seedPersons.anna.name],
    );
    await db.query("UPDATE setting SET federal_state = 'NW' WHERE id = 1");
    // Wochen, die nur durch einen vorübergehend früheren Ausbildungsbeginn entstanden sind
    // (die App löscht Berichte nie automatisch), wieder entfernen.
    await db.query(
      `DELETE FROM weekly_report WHERE trainee_id = (SELECT id FROM person WHERE email = $1)
       AND (iso_year, iso_week) < (2026, 36)`,
      [seedPersons.anna.email],
    );
  });
}

export type DayContent = { dayType: "WORK" | "SCHOOL" | "VACATION" | "SICK" | "HOLIDAY" | null; activities: string };

/**
 * Legt einen Wochenbericht mit fünf Tagen an bzw. überschreibt dessen Tage (Testvorbereitung).
 * `days` sind Mo–Fr; Tage außerhalb der Ausbildung gibt es hier nicht. Gibt die Bericht-ID zurück.
 */
export async function prepareWeek(
  email: string,
  isoYear: number,
  isoWeek: number,
  days: readonly DayContent[],
): Promise<string> {
  const dates = isoWeekWorkdays(isoYear, isoWeek).map(toDateInput);
  return withDatabase(async (db) => {
    await db.query(
      `INSERT INTO weekly_report (id, trainee_id, iso_year, iso_week, updated_at)
       VALUES (gen_random_uuid(), (SELECT id FROM person WHERE email = $1), $2, $3, now())
       ON CONFLICT (trainee_id, iso_year, iso_week) DO NOTHING`,
      [email, isoYear, isoWeek],
    );
    const reportId = await reportIdOf(email, isoYear, isoWeek);
    for (const [index, date] of dates.entries()) {
      await db.query(
        `INSERT INTO report_day (id, report_id, date, day_type, activities)
         VALUES (gen_random_uuid(), $1, $2, $3, $4)
         ON CONFLICT (report_id, date) DO UPDATE SET day_type = EXCLUDED.day_type, activities = EXCLUDED.activities`,
        [reportId, date, days[index]?.dayType ?? null, days[index]?.activities ?? ""],
      );
    }
    return reportId;
  });
}

/** Löscht einen Bericht ohne Historie (z. B. eine nur für einen Test angelegte Woche). */
export async function deleteReportWithoutHistory(email: string, isoYear: number, isoWeek: number) {
  await withDatabase((db) =>
    db.query(
      `DELETE FROM weekly_report WHERE trainee_id = (SELECT id FROM person WHERE email = $1)
       AND iso_year = $2 AND iso_week = $3`,
      [email, isoYear, isoWeek],
    ),
  );
}
