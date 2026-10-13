-- AK-1024: Ein Erinnerungslauf gehört zu einer ISO-Woche; die Wochennummer liegt zwischen 1 und 53.
-- (Ob KW 53 im Jahr vorkommt, prüft die Fachlogik des Stichtags; die Datenhaltung schließt nur
-- unmögliche Nummern aus.)
ALTER TABLE "reminder_run" ADD CONSTRAINT "reminder_run_iso_week_range"
  CHECK ("iso_week" BETWEEN 1 AND 53);
