import { createPrismaClient } from "@/lib/db";

export function testDb() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL ist nicht gesetzt.");
  }
  return createPrismaClient(url);
}

export type TestDb = ReturnType<typeof testDb>;

/** Leert die Test-Datenbank. Azubis zuerst, damit die Kaskade ihre Berichte und Historie entfernt. */
export async function resetDatabase(prisma: TestDb) {
  await prisma.person.deleteMany({ where: { role: "TRAINEE" } });
  await prisma.person.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.reminderRun.deleteMany();
}

/** Legt Bernd (Ausbilder), Clara (Vertretung) und Anna (Azubi, zugeordnet Bernd) an. */
export async function createPersons(prisma: TestDb) {
  const bernd = await prisma.person.create({
    data: { accountId: "test-bernd", email: "bernd@test.invalid", name: "Bernd", role: "TRAINER" },
  });
  const clara = await prisma.person.create({
    data: { accountId: "test-clara", email: "clara@test.invalid", name: "Clara", role: "TRAINER" },
  });
  const anna = await prisma.person.create({
    data: {
      accountId: "test-anna",
      email: "anna@test.invalid",
      name: "Anna",
      role: "TRAINEE",
      trainerId: bernd.id,
      trainingStart: new Date("2026-09-01T00:00:00Z"),
    },
  });
  return { bernd, clara, anna };
}
