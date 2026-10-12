-- Darstellung der Oberfläche (Etappe 8, UI-Spezifikation): System, Hell oder Dunkel je Person.
CREATE TYPE "Theme" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');

ALTER TABLE "person" ADD COLUMN "theme" "Theme" NOT NULL DEFAULT 'SYSTEM';
