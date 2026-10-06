import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RETURN_PARAM, decideAccess, homePathFor, safeReturnPath, type Role } from "@/domain/access";
import { NO_ACCESS_PATH, auth } from "@/auth";
import { db } from "@/lib/db";
import { PATH_HEADER } from "@/lib/request-path";

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

/** Aufgerufener Pfad der aktuellen Anfrage (vom Proxy gesetzt), z. B. `/berichte/…`. */
export async function currentPath(): Promise<string | null> {
  return (await headers()).get(PATH_HEADER);
}

/**
 * Für geschützte Seiten und Serveraktionen: ohne Sitzung zur Anmeldung – mit dem aufgerufenen
 * Pfad als Rücksprungziel (AK-1003) –, ohne Zugang zum Hinweis (AK-102), mit falscher Rolle zur
 * eigenen Startseite. Gibt die Person zurück.
 */
export async function requirePerson(role?: Role) {
  const session = await auth();
  if (!session?.personId) {
    const target = safeReturnPath(await currentPath());
    redirect(target ? `/anmelden?${RETURN_PARAM}=${encodeURIComponent(target)}` : "/anmelden");
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
