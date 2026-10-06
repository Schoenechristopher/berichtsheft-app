/**
 * Seed: legt die Testpersonen Anna, Bernd und Clara sowie die Einstellungen an, dazu Annas
 * Beispielbericht KW 40/2026; alle übrigen Wochen entstehen über die Wochenerzeugung.
 * Idempotent – kann bei jedem Start laufen, ohne Daten zu verdoppeln.
 */
import "dotenv/config";
import { now } from "../src/domain/clock";
import { planReportDays } from "../src/domain/report-generation";
import { toDateInput } from "../src/domain/weeks";
import { createPrismaClient } from "../src/lib/db";
import { getFederalState } from "../src/lib/people/service";
import { ensureReportsForTrainee } from "../src/lib/reports";
import { seedFederalState, seedPersons, seedReport } from "../src/lib/seed-data";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL ist nicht gesetzt.");
  }
  const prisma = createPrismaClient(url);
  try {
    await prisma.setting.upsert({
      where: { id: 1 },
      create: { id: 1, federalState: seedFederalState },
      update: {},
    });

    const trainers = [seedPersons.bernd, seedPersons.clara];
    for (const trainer of trainers) {
      await prisma.person.upsert({
        where: { accountId: trainer.accountId },
        create: { ...trainer },
        update: {},
      });
    }

    const bernd = await prisma.person.findUniqueOrThrow({ where: { accountId: seedPersons.bernd.accountId } });
    const { trainingStart, ...anna } = seedPersons.anna;
    const annaPerson = await prisma.person.upsert({
      where: { accountId: anna.accountId },
      create: { ...anna, trainingStart: new Date(`${trainingStart}T00:00:00Z`), trainerId: bernd.id },
      update: {},
    });

    // Annas Beispielbericht KW 40/2026 mit Inhalt; angelegt wie von der Wochenerzeugung
    // (Tage außerhalb der Ausbildung, Feiertage), nur mit vorausgefülltem Inhalt.
    const { isoYear, isoWeek, days } = seedReport;
    const existing = await prisma.weeklyReport.findUnique({
      where: { traineeId_isoYear_isoWeek: { traineeId: annaPerson.id, isoYear, isoWeek } },
    });
    if (!existing && annaPerson.trainingStart) {
      const federalState = await getFederalState(prisma);
      const planned = planReportDays(
        { isoYear, isoWeek },
        { start: annaPerson.trainingStart, end: annaPerson.trainingEnd },
        federalState,
      );
      await prisma.weeklyReport.create({
        data: {
          traineeId: annaPerson.id,
          isoYear,
          isoWeek,
          days: {
            create: planned.map((day) => {
              const content = days.find((seedDay) => seedDay.date === toDateInput(day.date));
              return {
                ...day,
                dayType: day.outsideTraining ? day.dayType : (content?.dayType ?? day.dayType),
                activities: day.outsideTraining ? "" : (content?.activities ?? ""),
              };
            }),
          },
        },
      });
    }

    // Alle übrigen Wochen bis heute entstehen über die normale Wochenerzeugung (Uhr-Modul).
    const generated = await ensureReportsForTrainee(prisma, annaPerson.id, now());

    console.log(
      `Seed: Anna (Azubi, zugeordnet Bernd), Bernd und Clara (Ausbilder), Bundesland NW, Annas Bericht KW ${isoWeek}/${isoYear}; ${generated.createdReports} weitere Wochen erzeugt.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
