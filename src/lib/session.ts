import { cache } from "react";
import { redirect } from "next/navigation";
import { decideAccess, homePathFor, type Role } from "@/domain/access";
import { NO_ACCESS_PATH, auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Angemeldete Person oder null. Prüft bei jeder Anfrage gegen die Datenbank, ob die
 * Person noch existiert und aktiv ist – eine Deaktivierung wirkt sofort.
 */
export const getCurrentPerson = cache(async () => {
  const session = await auth();
  if (!session?.personId) {
    return null;
  }
  const person = await db().person.findUnique({ where: { id: session.personId } });
  return decideAccess(person).allowed ? person : null;
});

/**
 * Für geschützte Seiten und Serveraktionen: ohne Sitzung zur Anmeldung, ohne Zugang zum
 * Hinweis (AK-102), mit falscher Rolle zur eigenen Startseite. Gibt die Person zurück.
 */
export async function requirePerson(role?: Role) {
  const session = await auth();
  if (!session?.personId) {
    redirect("/anmelden");
  }
  const person = await getCurrentPerson();
  if (!person) {
    redirect(NO_ACCESS_PATH);
  }
  if (role && person.role !== role) {
    redirect(homePathFor(person.role));
  }
  return person;
}
