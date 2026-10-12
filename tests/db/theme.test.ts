/**
 * Darstellung am Konto (UI-AK-14): Die Wahl „System / Hell / Dunkel“ steht an der Person und gilt
 * damit nach erneuter Anmeldung und auf jedem Gerät. Jede Person ändert nur ihre eigene.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { updateOwnTheme } from "@/lib/people/service";
import { createPersons, resetDatabase, testDb } from "./helpers";

const prisma = testDb();

afterAll(async () => {
  await resetDatabase(prisma);
  await prisma.$disconnect();
});

describe("Darstellung am Konto", () => {
  let persons: Awaited<ReturnType<typeof createPersons>>;

  beforeEach(async () => {
    await resetDatabase(prisma);
    persons = await createPersons(prisma);
  });

  it("UI-AK-14 neue Personen starten mit „System“; die Wahl wird an der eigenen Person gespeichert", async () => {
    expect(persons.anna.theme).toBe("SYSTEM");
    expect(await updateOwnTheme(prisma, persons.anna, "DARK")).toEqual({ ok: true, theme: "DARK" });
    const stored = await prisma.person.findMany({ select: { name: true, theme: true }, orderBy: { name: "asc" } });
    expect(stored).toEqual([
      { name: "Anna", theme: "DARK" },
      { name: "Bernd", theme: "SYSTEM" },
      { name: "Clara", theme: "SYSTEM" },
    ]);
    expect(await updateOwnTheme(prisma, persons.anna, "LIGHT")).toEqual({ ok: true, theme: "LIGHT" });
    expect((await prisma.person.findUniqueOrThrow({ where: { id: persons.anna.id } })).theme).toBe("LIGHT");
  });

  it("UI-AK-14 unbekannte Werte und deaktivierte Personen ändern nichts", async () => {
    expect(await updateOwnTheme(prisma, persons.anna, "lila")).toEqual({
      ok: false,
      formError: "Unbekannte Darstellung.",
    });
    expect(await updateOwnTheme(prisma, { ...persons.anna, active: false }, "DARK")).toEqual({
      ok: false,
      formError: "Zugriff verweigert",
    });
    expect((await prisma.person.findUniqueOrThrow({ where: { id: persons.anna.id } })).theme).toBe("SYSTEM");
  });
});
