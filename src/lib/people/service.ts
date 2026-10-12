/**
 * Nutzerverwaltung auf dem Server (AK-201 – AK-209).
 *
 * Jede Operation prüft selbst, ob die handelnde Person Admin-Rechte hat, lädt den aktuellen
 * Stand und wendet die Regeln aus `src/domain/people.ts` an – unabhängig davon, was die
 * Oberfläche anzeigt. Geschrieben wird in einer serialisierbaren Transaktion, damit zwei
 * gleichzeitige Änderungen nicht gemeinsam eine Regel umgehen (z. B. den letzten Ausbilder).
 */
import { isTheme, type Theme } from "@/domain/theme";
import {
  checkDeactivate,
  checkDelete,
  checkFederalStateSetting,
  checkReactivate,
  checkUpdate,
  confirmsName,
  foreignHistoryMessage,
  validatePerson,
  type FieldErrors,
  type PersonInput,
  type PersonSnapshot,
  type ValidPerson,
} from "@/domain/people";
import { canManagePeople, type Viewer } from "@/domain/report-access";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";

/** Ergebnis einer Aktion der Nutzerverwaltung, so wie die Oberfläche es anzeigt. */
export type ActionResult =
  | { ok: true; personId?: string }
  | {
      ok: false;
      /** Meldung zur ganzen Aktion. */
      formError?: string;
      /** Meldungen je Feld (AK-202). */
      fieldErrors?: FieldErrors & { confirmName?: string };
      /** Statt Löschen „Deaktivieren“ anbieten (Entscheidung „Ausbilder mit Historie“). */
      offerDeactivate?: boolean;
    };

export const FORBIDDEN: ActionResult = { ok: false, formError: "Zugriff verweigert" };
const NOT_FOUND: ActionResult = { ok: false, formError: "Person nicht gefunden." };
const RETRY: ActionResult = {
  ok: false,
  formError: "Gleichzeitige Änderung – bitte die Seite neu laden und erneut versuchen.",
};

type Tx = Prisma.TransactionClient;

async function snapshot(tx: Tx): Promise<PersonSnapshot[]> {
  return tx.person.findMany({ select: { id: true, name: true, role: true, active: true, trainerId: true } });
}

const MAX_ATTEMPTS = 5;

/** Führt `work` serialisierbar aus; bei Konflikt mit kurzer, zufälliger Pause bis zu fünfmal. */
async function serializable(prisma: PrismaClient, work: (tx: Tx) => Promise<ActionResult>): Promise<ActionResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!isSerializationFailure(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 20 * attempt));
    }
  }
  return RETRY;
}

/**
 * Konflikt zweier serialisierbarer Transaktionen (SQLSTATE 40001, Deadlock 40P01). Prisma meldet
 * ihn je nach Stelle als P2034 oder – über den Treiber-Adapter – als `TransactionWriteConflict`
 * mit dem ursprünglichen Code in `cause`.
 */
function isSerializationFailure(error: unknown): boolean {
  for (let current = error, depth = 0; current && depth < 5; depth++) {
    if (current instanceof Prisma.PrismaClientKnownRequestError && current.code === "P2034") {
      return true;
    }
    const details = current as { message?: unknown; code?: unknown; originalCode?: unknown; kind?: unknown };
    const text = [details.message, details.code, details.originalCode, details.kind].map(String).join(" ");
    if (/TransactionWriteConflict|could not serialize|40001|40P01|deadlock/i.test(text)) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

function isUniqueViolation(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  return JSON.stringify(error.meta ?? {}).includes(field) || error.message.includes(field);
}

const EMAIL_TAKEN: ActionResult = {
  ok: false,
  fieldErrors: { email: "Diese Firmen-E-Mail gehört bereits zu einer anderen Person." },
};

function toDate(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00Z`) : null;
}

function personData(value: ValidPerson) {
  return {
    name: value.name,
    email: value.email,
    role: value.role,
    trainerId: value.trainerId,
    trainingStart: toDate(value.trainingStart),
    trainingEnd: toDate(value.trainingEnd),
  };
}

/** AK-201: Person mit Firmen-E-Mail, Name und Rolle anlegen. Die Konto-ID bindet der erste Login. */
export async function createPerson(prisma: PrismaClient, actor: Viewer, input: PersonInput): Promise<ActionResult> {
  if (!canManagePeople(actor)) {
    return FORBIDDEN;
  }
  try {
    return await serializable(prisma, async (tx) => {
      const validation = validatePerson(input, { persons: await snapshot(tx) });
      if (!validation.ok) {
        return { ok: false, fieldErrors: validation.fieldErrors };
      }
      if (await tx.person.findUnique({ where: { email: validation.value.email } })) {
        return EMAIL_TAKEN;
      }
      const person = await tx.person.create({ data: personData(validation.value) });
      return { ok: true, personId: person.id };
    });
  } catch (error) {
    if (isUniqueViolation(error, "email")) {
      return EMAIL_TAKEN;
    }
    throw error;
  }
}

/** AK-203: Name, E-Mail, Rolle, Zuordnung und Ausbildungszeitraum ändern. */
export async function updatePerson(
  prisma: PrismaClient,
  actor: Viewer,
  personId: string,
  input: PersonInput,
): Promise<ActionResult> {
  if (!canManagePeople(actor)) {
    return FORBIDDEN;
  }
  try {
    return await serializable(prisma, async (tx) => {
      const persons = await snapshot(tx);
      const target = persons.find((person) => person.id === personId);
      if (!target) {
        return NOT_FOUND;
      }
      const validation = validatePerson(input, { persons, targetId: personId, targetActive: target.active });
      // Regeln zum Rollenwechsel (AK-207, AK-208) auch dann melden, wenn andere Felder fehlerhaft sind.
      const role = input.role === "TRAINEE" || input.role === "TRAINER" ? input.role : target.role;
      const rule = checkUpdate(persons, personId, actor.id, { role });
      const fieldErrors = {
        ...(validation.ok ? {} : validation.fieldErrors),
        ...(rule.allowed ? {} : { [rule.field]: rule.message }),
      };
      if (!validation.ok || !rule.allowed) {
        return { ok: false, fieldErrors };
      }
      const sameEmail = await tx.person.findUnique({ where: { email: validation.value.email } });
      if (sameEmail && sameEmail.id !== personId) {
        return EMAIL_TAKEN;
      }
      await tx.person.update({ where: { id: personId }, data: personData(validation.value) });
      return { ok: true, personId };
    });
  } catch (error) {
    if (isUniqueViolation(error, "email")) {
      return EMAIL_TAKEN;
    }
    throw error;
  }
}

/** AK-204, AK-207, AK-208: Person deaktivieren („Entfernen“). */
export async function deactivatePerson(prisma: PrismaClient, actor: Viewer, personId: string): Promise<ActionResult> {
  if (!canManagePeople(actor)) {
    return FORBIDDEN;
  }
  return serializable(prisma, async (tx) => {
    const persons = await snapshot(tx);
    if (!persons.some((person) => person.id === personId)) {
      return NOT_FOUND;
    }
    const rule = checkDeactivate(persons, personId, actor.id);
    if (!rule.allowed) {
      return { ok: false, formError: rule.message };
    }
    await tx.person.update({ where: { id: personId }, data: { active: false } });
    return { ok: true, personId };
  });
}

/** Deaktivierte Person wieder aktivieren. */
export async function reactivatePerson(prisma: PrismaClient, actor: Viewer, personId: string): Promise<ActionResult> {
  if (!canManagePeople(actor)) {
    return FORBIDDEN;
  }
  return serializable(prisma, async (tx) => {
    const persons = await snapshot(tx);
    if (!persons.some((person) => person.id === personId)) {
      return NOT_FOUND;
    }
    const rule = checkReactivate(persons, personId);
    if (!rule.allowed) {
      return { ok: false, formError: rule.message };
    }
    await tx.person.update({ where: { id: personId }, data: { active: true } });
    return { ok: true, personId };
  });
}

/**
 * Kommt die Person in der Historie von Berichten anderer Azubis vor (Statuswechsel oder
 * Kommentare)? Dann lässt sie sich nur deaktivieren (Entscheidung „Ausbilder mit Historie“).
 */
export async function hasForeignHistory(prisma: PrismaClient | Tx, personId: string): Promise<boolean> {
  const foreignReport = { traineeId: { not: personId } };
  const [statusChanges, comments] = await Promise.all([
    prisma.statusChange.count({ where: { actorId: personId, report: foreignReport } }),
    prisma.comment.count({ where: { authorId: personId, report: foreignReport } }),
  ]);
  return statusChanges + comments > 0;
}

/**
 * AK-206: Person und alle ihre Berichte endgültig löschen – nur nach Eintippen des Namens.
 * Danach ist kein Bericht der Person mehr auffindbar (Kaskade in der Datenbank).
 */
export async function deletePerson(
  prisma: PrismaClient,
  actor: Viewer,
  personId: string,
  confirmation: string | null | undefined,
): Promise<ActionResult> {
  if (!canManagePeople(actor)) {
    return FORBIDDEN;
  }
  try {
    return await serializable(prisma, async (tx) => {
      const persons = await snapshot(tx);
      const target = persons.find((person) => person.id === personId);
      if (!target) {
        return NOT_FOUND;
      }
      const rule = checkDelete(persons, personId, actor.id, {
        hasForeignHistory: await hasForeignHistory(tx, personId),
      });
      if (!rule.allowed) {
        return { ok: false, formError: rule.message, offerDeactivate: rule.offerDeactivate };
      }
      if (!confirmsName(confirmation, target.name)) {
        return {
          ok: false,
          fieldErrors: { confirmName: `Zur Bestätigung bitte genau „${target.name}“ eintippen.` },
        };
      }
      await tx.person.delete({ where: { id: personId } });
      return { ok: true, personId };
    });
  } catch (error) {
    // Rückfallebene: Verweise aus fremder Historie weist die Datenbank ab (Fremdschlüssel).
    if (error instanceof Prisma.PrismaClientKnownRequestError || /foreign key|23503/i.test(String(error))) {
      const target = await prisma.person.findUnique({ where: { id: personId } });
      if (target && (await hasForeignHistory(prisma, personId))) {
        return {
          ok: false,
          formError: foreignHistoryMessage(target.name, target.active),
          offerDeactivate: target.active,
        };
      }
    }
    throw error;
  }
}

/** AK-209: Bundesland der Firma für die Feiertage einstellen. */
export async function updateFederalState(
  prisma: PrismaClient,
  actor: Viewer,
  federalState: string | null | undefined,
): Promise<ActionResult> {
  const setting = checkFederalStateSetting(actor, federalState);
  if (!setting.ok) {
    return setting.reason === "forbidden" ? FORBIDDEN : { ok: false, formError: "Bitte ein Bundesland auswählen." };
  }
  await prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1, federalState: setting.federalState },
    update: { federalState: setting.federalState },
  });
  return { ok: true };
}

/** Eingestelltes Bundesland (Voreinstellung NW, falls noch keine Einstellung existiert). */
export async function getFederalState(prisma: PrismaClient): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  return setting?.federalState ?? "NW";
}

/** Alle Personen für die Liste der Nutzerverwaltung, mit zugeordnetem Ausbilder. */
export async function listPeople(prisma: PrismaClient) {
  return prisma.person.findMany({
    include: { trainer: { select: { id: true, name: true } } },
    orderBy: [{ active: "desc" }, { role: "desc" }, { name: "asc" }],
  });
}

/**
 * Aktive Azubis (AK-205): Nur für sie entstehen neue Wochenberichte (Etappe 3) und gehen
 * Erinnerungen raus (Etappe 6). Deaktivierte Azubis sind nie dabei.
 */
export async function listActiveTrainees(prisma: PrismaClient) {
  return prisma.person.findMany({
    where: { role: "TRAINEE", active: true },
    include: { trainer: { select: { id: true, name: true, active: true } } },
    orderBy: { name: "asc" },
  });
}

export type ThemeResult = { ok: true; theme: Theme } | { ok: false; formError: string };

/**
 * Eigene Darstellung speichern (UI-AK-14): System, Hell oder Dunkel, am Konto und damit auf jedem
 * Gerät. Jede Person ändert nur ihre eigene.
 */
export async function updateOwnTheme(prisma: PrismaClient, viewer: Viewer, value: unknown): Promise<ThemeResult> {
  if (!viewer.active) {
    return { ok: false, formError: "Zugriff verweigert" };
  }
  if (!isTheme(value)) {
    return { ok: false, formError: "Unbekannte Darstellung." };
  }
  await prisma.person.update({ where: { id: viewer.id }, data: { theme: value } });
  return { ok: true, theme: value };
}
