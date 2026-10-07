import { expect, test } from "@playwright/test";
import { accounts, login, withDatabase } from "./helpers";

const NO_ACCESS = "Kein Zugang – bitte an den Ausbilder wenden";

test.describe("Abgewiesene Konten", () => {
  test.describe.configure({ mode: "serial" });

  test("AK-102 Firmenkonto ohne Eintrag wird mit Hinweis abgewiesen", async ({ page }) => {
    await login(page, accounts.dora);

    await expect(page).toHaveURL(/\/kein-zugang$/);
    await expect(page.getByRole("heading", { name: NO_ACCESS })).toBeVisible();

    // Es entsteht keine Sitzung.
    expect(await (await page.request.get("/api/auth/session")).json()).toBeNull();
    await page.goto("/azubi");
    await expect(page).toHaveURL(/\/anmelden(\?ziel=[^&]+)?$/);
  });

  test("AK-102 deaktivierte Person wird mit Hinweis abgewiesen", async ({ page }) => {
    const { accountId, email, name } = accounts.dora;
    await withDatabase((db) =>
      db.query(
        `INSERT INTO person (id, account_id, email, name, role, active, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'TRAINER', false, now())`,
        [accountId, email, name],
      ),
    );
    try {
      await login(page, accounts.dora);

      await expect(page).toHaveURL(/\/kein-zugang$/);
      await expect(page.getByRole("heading", { name: NO_ACCESS })).toBeVisible();
      expect(await (await page.request.get("/api/auth/session")).json()).toBeNull();
    } finally {
      await withDatabase((db) => db.query("DELETE FROM person WHERE account_id = $1", [accountId]));
    }
  });

  test("AK-102 Deaktivierung wirkt sofort auch auf eine laufende Sitzung", async ({ page }) => {
    const { accountId, email, name } = accounts.dora;
    await withDatabase((db) =>
      db.query(
        `INSERT INTO person (id, account_id, email, name, role, active, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'TRAINER', true, now())`,
        [accountId, email, name],
      ),
    );
    try {
      await login(page, accounts.dora);
      await expect(page).toHaveURL(/\/ausbilder$/);

      await withDatabase((db) => db.query("UPDATE person SET active = false WHERE account_id = $1", [accountId]));
      await page.goto("/ausbilder");

      await expect(page).toHaveURL(/\/kein-zugang$/);
      await expect(page.getByRole("heading", { name: NO_ACCESS })).toBeVisible();
    } finally {
      await withDatabase((db) => db.query("DELETE FROM person WHERE account_id = $1", [accountId]));
    }
  });
});
