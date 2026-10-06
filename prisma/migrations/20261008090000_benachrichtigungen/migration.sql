-- Etappe 6: Benachrichtigungen und Erinnerung.


-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "failed_at" TIMESTAMPTZ(3),
ADD COLUMN     "last_error" TEXT,
ADD COLUMN     "next_attempt_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "teams_dev_message" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_dev_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_dev_message_notification_id_key" ON "teams_dev_message"("notification_id");

-- CreateIndex
CREATE INDEX "teams_dev_message_recipient_id_created_at_idx" ON "teams_dev_message"("recipient_id", "created_at");

-- AddForeignKey
ALTER TABLE "teams_dev_message" ADD CONSTRAINT "teams_dev_message_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams_dev_message" ADD CONSTRAINT "teams_dev_message_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Ergänzungen von Hand (nicht aus schema.prisma erzeugbar)
-- ---------------------------------------------------------------------------

-- Offene Versandaufträge des Workers (E-Mail, Teams) schnell finden.
CREATE INDEX "notification_pending_idx" ON "notification"("next_attempt_at")
  WHERE "sent_at" IS NULL AND "failed_at" IS NULL;

-- Versuche sind nie negativ; der Kanal „App“ hat keinen Versand und gilt beim Anlegen als zugestellt.
ALTER TABLE "notification" ADD CONSTRAINT "notification_attempts_not_negative" CHECK ("attempts" >= 0);
ALTER TABLE "notification" ADD CONSTRAINT "notification_app_delivered"
  CHECK ("channel" <> 'APP' OR "sent_at" IS NOT NULL);
