/**
 * Seed: legt die Testpersonen Anna, Bernd und Clara sowie die Einstellungen an.
 * Idempotent – kann bei jedem Start laufen, ohne Daten zu verdoppeln.
 */
import "dotenv/config";
import { createPrismaClient } from "../src/lib/db";
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

    // Ein Beispielbericht für die Berichtsansicht (AK-103, AK-105), bis Etappe 3 die Wochen erzeugt.
    const { isoYear, isoWeek, days } = seedReport;
    const existing = await prisma.weeklyReport.findUnique({
      where: { traineeId_isoYear_isoWeek: { traineeId: annaPerson.id, isoYear, isoWeek } },
    });
    if (!existing) {
      await prisma.weeklyReport.create({
        data: {
          traineeId: annaPerson.id,
          isoYear,
          isoWeek,
          days: {
            create: days.map((day) => ({
              date: new Date(`${day.date}T00:00:00Z`),
              dayType: day.dayType,
              activities: day.activities,
            })),
          },
        },
      });
    }

    console.log(
      `Seed: Anna (Azubi, zugeordnet Bernd), Bernd und Clara (Ausbilder), Bundesland NW, Annas Bericht KW ${isoWeek}/${isoYear}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
