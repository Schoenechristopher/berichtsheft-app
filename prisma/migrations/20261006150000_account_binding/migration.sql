-- Etappe 2: Anlegen über die Firmen-E-Mail (Entscheidung 3).
-- Die Konto-ID wird erst beim ersten Login gebunden und ist bis dahin leer.
-- Der eindeutige Index bleibt; PostgreSQL erlaubt mehrere leere Werte.
ALTER TABLE "person" ALTER COLUMN "account_id" DROP NOT NULL;

-- Eine einmal gebundene Konto-ID ist nicht leer.
ALTER TABLE "person" ADD CONSTRAINT "person_account_id_not_blank"
  CHECK ("account_id" IS NULL OR btrim("account_id") <> '');

-- E-Mail-Abgleich ohne Groß-/Kleinschreibung: gespeichert wird immer klein geschrieben
-- und ohne Leerzeichen am Rand. Der bestehende eindeutige Index gilt damit unabhängig
-- von der Schreibweise.
UPDATE "person" SET "email" = lower(btrim("email")) WHERE "email" <> lower(btrim("email"));
ALTER TABLE "person" ADD CONSTRAINT "person_email_normalized"
  CHECK ("email" = lower(btrim("email")) AND "email" <> '');
