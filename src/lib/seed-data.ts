/**
 * Testdaten für Seed (prisma/seed.ts) und Keycloak-Realm (keycloak/realm-berichtsheft.json).
 * Die Konto-IDs sind die festen Benutzer-IDs im Keycloak-Realm (Claim `sub`). Für die Testpersonen
 * sind sie im Seed schon gebunden; neu angelegte Personen werden beim ersten Login gebunden.
 * Nur Testdaten, keine echten Personen.
 */
export const seedPersons = {
  bernd: {
    accountId: "6f1c2a10-0b1e-4c55-9a8e-1b2c3d4e5f01",
    email: "bernd@berichtsheft.test",
    name: "Bernd Ausbilder",
    role: "TRAINER",
  },
  clara: {
    accountId: "6f1c2a10-0b1e-4c55-9a8e-1b2c3d4e5f02",
    email: "clara@berichtsheft.test",
    name: "Clara Ausbilderin",
    role: "TRAINER",
  },
  anna: {
    accountId: "6f1c2a10-0b1e-4c55-9a8e-1b2c3d4e5f03",
    email: "anna@berichtsheft.test",
    name: "Anna Azubi",
    role: "TRAINEE",
    trainingStart: "2026-09-01",
  },
} as const;

/**
 * Konto, das im Keycloak-Realm existiert, aber bewusst keinen Eintrag in der App hat
 * (für AK-102).
 */
export const accountWithoutEntry = {
  accountId: "6f1c2a10-0b1e-4c55-9a8e-1b2c3d4e5f09",
  email: "dora@berichtsheft.test",
  name: "Dora Ohnezugang",
} as const;

/**
 * Konto, das im Keycloak-Realm existiert und in der App erst angelegt wird (AK-201): Der Admin
 * legt Emil mit seiner Firmen-E-Mail an, beim ersten Login wird die Konto-ID gebunden.
 */
export const accountToCreate = {
  accountId: "6f1c2a10-0b1e-4c55-9a8e-1b2c3d4e5f05",
  email: "emil@berichtsheft.test",
  name: "Emil Neu",
} as const;

/** Alle Testkonten des Identity Providers (für den Test-Login ohne Keycloak). */
export const testAccounts = [
  seedPersons.anna,
  seedPersons.bernd,
  seedPersons.clara,
  accountWithoutEntry,
  accountToCreate,
] as const;

/** Bundesland der Firma für die Feiertage. */
export const seedFederalState = "NW";

/** Annas Beispielbericht KW 40/2026 (28.09.–02.10.2026) im Status „Entwurf“. */
export const seedReport = {
  isoYear: 2026,
  isoWeek: 40,
  days: [
    { date: "2026-09-28", dayType: "WORK", activities: "Einführung in die Abteilung, Arbeitsplatz eingerichtet." },
    { date: "2026-09-29", dayType: "WORK", activities: "Netzwerkdokumentation gelesen, Patchfeld beschriftet." },
    { date: "2026-09-30", dayType: "SCHOOL", activities: "Berufsschule: Lernfeld 2, Grundlagen Hardware." },
    { date: "2026-10-01", dayType: null, activities: "" },
    { date: "2026-10-02", dayType: null, activities: "" },
  ],
} as const;
