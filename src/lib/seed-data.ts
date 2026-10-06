/**
 * Testdaten für Seed (prisma/seed.ts) und Keycloak-Realm (keycloak/realm-berichtsheft.json).
 * Die Konto-IDs sind die festen Benutzer-IDs im Keycloak-Realm (Claim `sub`).
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

/** Bundesland der Firma für die Feiertage. */
export const seedFederalState = "NW";
