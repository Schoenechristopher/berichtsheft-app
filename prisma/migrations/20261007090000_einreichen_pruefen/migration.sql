-- Etappe 4: Einreichen und Prüfen.

-- AlterTable: Prüfrunde und feste Reihenfolge der Statuswechsel (AK-801, AK-802).
ALTER TABLE "status_change" ADD COLUMN     "review_round" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "seq" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "status_change_seq_key" ON "status_change"("seq");

-- ---------------------------------------------------------------------------
-- Ergänzungen von Hand (nicht aus schema.prisma erzeugbar)
-- ---------------------------------------------------------------------------

-- Prüfrunden und Kommentare sind nie negativ, Kommentare nie leer.
ALTER TABLE "status_change" ADD CONSTRAINT "status_change_review_round_not_negative" CHECK ("review_round" >= 0);
ALTER TABLE "comment" ADD CONSTRAINT "comment_review_round_positive" CHECK ("review_round" >= 1);
ALTER TABLE "comment" ADD CONSTRAINT "comment_text_not_blank" CHECK (btrim("text") <> '');

-- AK-803: Kommentare sind wie Statuswechsel unveränderlich; nur das endgültige Löschen der
-- Person (AK-206) entfernt sie – als Kaskade aus dem Löschen des Wochenberichts (direkt oder
-- über dessen Tage), wenn der Bericht nicht mehr existiert.
CREATE FUNCTION "comment_immutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND pg_trigger_depth() > 1
     AND NOT EXISTS (SELECT 1 FROM "weekly_report" WHERE "id" = OLD."report_id") THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Kommentare sind unveränderlich (AK-803): % abgewiesen', TG_OP;
END;
$$;

CREATE TRIGGER "comment_no_update"
  BEFORE UPDATE ON "comment"
  FOR EACH ROW EXECUTE FUNCTION "comment_immutable"();

CREATE TRIGGER "comment_no_delete"
  BEFORE DELETE ON "comment"
  FOR EACH ROW EXECUTE FUNCTION "comment_immutable"();

-- AK-505, AK-704: Eingereichte und freigegebene Berichte sind inhaltlich schreibgeschützt.
-- Zweite Schranke neben der Prüfung im Server: Tage solcher Berichte lassen sich nicht ändern.
CREATE FUNCTION "report_day_locked"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "weekly_report"
    WHERE "id" = OLD."report_id" AND "status" IN ('SUBMITTED', 'APPROVED')
  ) THEN
    RAISE EXCEPTION 'Eingereichte und freigegebene Berichte sind schreibgeschützt (AK-505, AK-704): % abgewiesen', TG_OP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "report_day_locked"
  BEFORE UPDATE ON "report_day"
  FOR EACH ROW EXECUTE FUNCTION "report_day_locked"();
