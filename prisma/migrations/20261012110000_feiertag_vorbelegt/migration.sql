-- AK-404: Merkt sich, ob ein Tag beim Anlegen (bzw. beim Einbeziehen nach AK-203) als „Feiertag“
-- vorbelegt wurde. Der Hinweis „Feiertag (vorbelegt)“ richtet sich danach, nicht nach dem aktuellen
-- Bundesland. Bestehende Tage: Näherung über die gespeicherte Tagesart.
ALTER TABLE "report_day" ADD COLUMN "holiday_preset" BOOLEAN NOT NULL DEFAULT false;
UPDATE "report_day" SET "holiday_preset" = true WHERE "day_type" = 'HOLIDAY' AND NOT "outside_training";
