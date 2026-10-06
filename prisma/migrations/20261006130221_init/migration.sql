-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TRAINEE', 'TRAINER');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('EMAIL', 'TEAMS', 'APP');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DayType" AS ENUM ('WORK', 'SCHOOL', 'VACATION', 'SICK', 'HOLIDAY');

-- CreateTable
CREATE TABLE "person" (
    "id" UUID NOT NULL,
    "account_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "trainer_id" UUID,
    "training_start" DATE,
    "training_end" DATE,
    "channels" "Channel"[] DEFAULT ARRAY['EMAIL', 'APP']::"Channel"[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "federal_state" TEXT NOT NULL DEFAULT 'NW',
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_report" (
    "id" UUID NOT NULL,
    "trainee_id" UUID NOT NULL,
    "iso_year" INTEGER NOT NULL,
    "iso_week" INTEGER NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "weekly_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_day" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "day_type" "DayType",
    "activities" TEXT NOT NULL DEFAULT '',
    "outside_training" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "report_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "review_round" INTEGER NOT NULL,
    "day_id" UUID,
    "author_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_change" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "from_status" "ReportStatus",
    "to_status" "ReportStatus" NOT NULL,
    "actor_id" UUID NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL,
    "event_key" TEXT NOT NULL,
    "recipient_id" UUID NOT NULL,
    "channel" "Channel" NOT NULL,
    "report_id" UUID,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(3),
    "read_at" TIMESTAMPTZ(3),

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "person_account_id_key" ON "person"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "person_email_key" ON "person"("email");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_report_trainee_id_iso_year_iso_week_key" ON "weekly_report"("trainee_id", "iso_year", "iso_week");

-- CreateIndex
CREATE UNIQUE INDEX "report_day_report_id_date_key" ON "report_day"("report_id", "date");

-- CreateIndex
CREATE INDEX "comment_report_id_idx" ON "comment"("report_id");

-- CreateIndex
CREATE INDEX "status_change_report_id_idx" ON "status_change"("report_id");

-- CreateIndex
CREATE INDEX "notification_recipient_id_read_at_idx" ON "notification"("recipient_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_event_key_recipient_id_channel_key" ON "notification"("event_key", "recipient_id", "channel");

-- AddForeignKey
ALTER TABLE "person" ADD CONSTRAINT "person_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_report" ADD CONSTRAINT "weekly_report_trainee_id_fkey" FOREIGN KEY ("trainee_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_day" ADD CONSTRAINT "report_day_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "weekly_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "weekly_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "report_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_change" ADD CONSTRAINT "status_change_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "weekly_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_change" ADD CONSTRAINT "status_change_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "weekly_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Ergänzungen von Hand (nicht aus schema.prisma erzeugbar)
-- ---------------------------------------------------------------------------

-- AK-202: Ein Azubi braucht einen zugeordneten Ausbilder und einen Ausbildungsbeginn.
ALTER TABLE "person" ADD CONSTRAINT "person_trainee_requires_trainer_and_start"
  CHECK ("role" <> 'TRAINEE' OR ("trainer_id" IS NOT NULL AND "training_start" IS NOT NULL));

-- Ausbildungsende liegt nicht vor dem Beginn.
ALTER TABLE "person" ADD CONSTRAINT "person_training_end_after_start"
  CHECK ("training_end" IS NULL OR "training_start" IS NULL OR "training_end" >= "training_start");

-- Niemand ist sein eigener Ausbilder.
ALTER TABLE "person" ADD CONSTRAINT "person_trainer_not_self"
  CHECK ("trainer_id" IS NULL OR "trainer_id" <> "id");

-- Einstellungen: genau eine Zeile.
ALTER TABLE "setting" ADD CONSTRAINT "setting_single_row" CHECK ("id" = 1);

-- ISO-Woche im gültigen Bereich.
ALTER TABLE "weekly_report" ADD CONSTRAINT "weekly_report_iso_week_range"
  CHECK ("iso_week" BETWEEN 1 AND 53);

-- Verweise auf die handelnde Person (Statuswechsel, Kommentare) werden erst beim
-- Commit geprüft. So entfernt das endgültige Löschen einer Person (AK-206) per
-- Kaskade auch die Einträge, die sie selbst an ihren eigenen Berichten erzeugt hat.
-- Einträge an Berichten anderer Personen bleiben geschützt; deren Löschen scheitert.
ALTER TABLE "status_change" ALTER CONSTRAINT "status_change_actor_id_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "comment" ALTER CONSTRAINT "comment_author_id_fkey" DEFERRABLE INITIALLY DEFERRED;

-- AK-803: Historieneinträge (Statuswechsel) sind unveränderlich; nur das
-- endgültige Löschen der Person (AK-206) entfernt sie.
-- UPDATE wird immer abgewiesen. DELETE nur als Kaskade aus dem Löschen des
-- Wochenberichts (pg_trigger_depth() > 1 und der Bericht existiert nicht mehr).
-- Ein Wochenbericht mit Historie lässt sich wiederum nur löschen, wenn seine
-- Person bereits gelöscht ist, also als Kaskade aus dem Löschen der Person.
CREATE FUNCTION "status_change_immutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND pg_trigger_depth() > 1
     AND NOT EXISTS (SELECT 1 FROM "weekly_report" WHERE "id" = OLD."report_id") THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Statuswechsel sind unveränderlich (AK-803): % abgewiesen', TG_OP;
END;
$$;

CREATE TRIGGER "status_change_no_update"
  BEFORE UPDATE ON "status_change"
  FOR EACH ROW EXECUTE FUNCTION "status_change_immutable"();

CREATE TRIGGER "status_change_no_delete"
  BEFORE DELETE ON "status_change"
  FOR EACH ROW EXECUTE FUNCTION "status_change_immutable"();

CREATE FUNCTION "weekly_report_delete_guard"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "status_change" WHERE "report_id" = OLD."id")
     AND EXISTS (SELECT 1 FROM "person" WHERE "id" = OLD."trainee_id") THEN
    RAISE EXCEPTION 'Wochenberichte mit Historie werden nur zusammen mit der Person gelöscht (AK-803)';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER "weekly_report_delete_guard"
  BEFORE DELETE ON "weekly_report"
  FOR EACH ROW EXECUTE FUNCTION "weekly_report_delete_guard"();
