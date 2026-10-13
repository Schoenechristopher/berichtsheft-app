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

/** Person mit Schlüssel, wie in `specs/pruefung/testdaten.json` (nur angelegte Personen). */
export interface KeyedPerson {
  schluessel: string;
  name: string;
  email: string;
  konto?: string | null;
  rolle: "azubi" | "ausbilder";
  /** Schlüssel des zugeordneten Ausbilders (nur Azubis). */
  ausbilder?: string;
  ausbildungsbeginn?: string;
  ausbildungsende?: string | null;
}

/**
 * Legt Personen mit Schlüssel an (für den Daten-Runner der Prüffälle): erst die Ausbilder, dann die
 * Azubis mit Zuordnung und Ausbildungszeitraum. Gibt die angelegten Personen je Schlüssel zurück.
 */
export async function createKeyedPersons(prisma: TestDb, persons: readonly KeyedPerson[]) {
  const created = new Map<string, Awaited<ReturnType<TestDb["person"]["create"]>>>();
  const ordered = [...persons].sort((a, b) => Number(a.rolle === "azubi") - Number(b.rolle === "azubi"));
  for (const person of ordered) {
    const trainer = person.ausbilder === undefined ? undefined : created.get(person.ausbilder);
    if (person.ausbilder !== undefined && !trainer) {
      throw new Error(`Ausbilder „${person.ausbilder}“ von „${person.schluessel}“ ist nicht angelegt.`);
    }
    created.set(
      person.schluessel,
      await prisma.person.create({
        data: {
          accountId: person.konto ?? null,
          email: person.email,
          name: person.name,
          role: person.rolle === "azubi" ? "TRAINEE" : "TRAINER",
          trainerId: trainer?.id ?? null,
          trainingStart: person.ausbildungsbeginn ? new Date(`${person.ausbildungsbeginn}T00:00:00Z`) : null,
          trainingEnd: person.ausbildungsende ? new Date(`${person.ausbildungsende}T00:00:00Z`) : null,
        },
      }),
    );
  }
  return created;
}
