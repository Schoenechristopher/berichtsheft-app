-- AK-803: Die Schranken der unveränderlichen Historie melden einen festen Fehlercode (SQLSTATE
-- „BH803“) statt des allgemeinen „P0001“. So erkennt die App (und der Daten-Adapter der Prüffälle)
-- den Grund ohne den Meldungstext. Verhalten und Meldungstexte bleiben unverändert.
CREATE OR REPLACE FUNCTION "status_change_immutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND pg_trigger_depth() > 1
     AND NOT EXISTS (SELECT 1 FROM "weekly_report" WHERE "id" = OLD."report_id") THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Statuswechsel sind unveränderlich (AK-803): % abgewiesen', TG_OP
    USING ERRCODE = 'BH803';
END;
$$;

CREATE OR REPLACE FUNCTION "comment_immutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND pg_trigger_depth() > 1
     AND NOT EXISTS (SELECT 1 FROM "weekly_report" WHERE "id" = OLD."report_id") THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Kommentare sind unveränderlich (AK-803): % abgewiesen', TG_OP
    USING ERRCODE = 'BH803';
END;
$$;

CREATE OR REPLACE FUNCTION "weekly_report_delete_guard"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "status_change" WHERE "report_id" = OLD."id")
     AND EXISTS (SELECT 1 FROM "person" WHERE "id" = OLD."trainee_id") THEN
    RAISE EXCEPTION 'Wochenberichte mit Historie werden nur zusammen mit der Person gelöscht (AK-803)'
      USING ERRCODE = 'BH803';
  END IF;
  RETURN OLD;
END;
$$;
