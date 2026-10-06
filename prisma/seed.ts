/**
 * Seed: legt die Testpersonen Anna, Bernd und Clara sowie die Einstellungen an.
 * Idempotent – kann bei jedem Start laufen, ohne Daten zu verdoppeln.
 */
import "dotenv/config";
import { createPrismaClient } from "../src/lib/db";
import { seedFederalState, seedPersons } from "../src/lib/seed-data";

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
    await prisma.person.upsert({
      where: { accountId: anna.accountId },
      create: { ...anna, trainingStart: new Date(`${trainingStart}T00:00:00Z`), trainerId: bernd.id },
      update: {},
    });

    console.log("Seed: Anna (Azubi, zugeordnet Bernd), Bernd und Clara (Ausbilder), Bundesland NW.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
