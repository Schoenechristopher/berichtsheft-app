-- Etappe 6, bestätigte Auslegung 11: verpasste Erinnerung einmal nachholen.


-- CreateTable
CREATE TABLE "reminder_run" (
    "iso_year" INTEGER NOT NULL,
    "iso_week" INTEGER NOT NULL,
    "ran_at" TIMESTAMPTZ(3) NOT NULL,
    "created" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "reminder_run_pkey" PRIMARY KEY ("iso_year","iso_week")
);

