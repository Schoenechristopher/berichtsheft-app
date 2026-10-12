/**
 * Regeln der Nutzerverwaltung (AK-201 – AK-208, Entscheidung „Ausbilder mit Historie“).
 *
 * Reine Funktionen ohne Abhängigkeit zu UI oder Datenbank. Die Serveraktionen laden den
 * aktuellen Stand aller Personen und prüfen jede Änderung hier, bevor sie schreiben.
 */
import type { Role } from "./access";
import { isFederalState, type FederalState } from "./federal-states";
import { canManagePeople, type Viewer } from "./report-access";

/** Ausschnitt einer Person, den die Regeln brauchen. */
export interface PersonSnapshot {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  trainerId: string | null;
}

/** Eingabefelder des Personen-Formulars. */
export type PersonField = "name" | "email" | "role" | "trainerId" | "trainingStart" | "trainingEnd";

export type FieldErrors = Partial<Record<PersonField, string>>;

/** Rohdaten aus dem Formular, noch ungeprüft. */
export interface PersonInput {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  trainerId?: string | null;
  trainingStart?: string | null;
  trainingEnd?: string | null;
}

/** Geprüfte Daten einer Person. Daten im Format JJJJ-MM-TT. */
export interface ValidPerson {
  name: string;
  email: string;
  role: Role;
  trainerId: string | null;
  trainingStart: string | null;
  trainingEnd: string | null;
}

export type Validation = { ok: true; value: ValidPerson } | { ok: false; fieldErrors: FieldErrors };

/** Bezeichnungen der Felder in der Oberfläche; Fehlermeldungen nennen das Feld (AK-202). */
export const FIELD_LABELS: Record<PersonField, string> = {
  name: "Name",
  email: "Firmen-E-Mail",
  role: "Rolle",
  trainerId: "Zugeordneter Ausbilder",
  trainingStart: "Ausbildungsbeginn",
  trainingEnd: "Ausbildungsende",
};

/** E-Mail-Adressen werden ohne Groß-/Kleinschreibung verglichen und so gespeichert. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Prüft ein Datum im Format JJJJ-MM-TT auf Gültigkeit (z. B. kein 31.02.). */
export function isValidDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function text(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Prüft die Formulardaten einer Person.
 *
 * - AK-202: Ein Azubi braucht einen zugeordneten Ausbilder und einen Ausbildungsbeginn; die
 *   Meldung nennt das fehlende Feld.
 * - Der zugeordnete Ausbilder muss eine Person mit Rolle Ausbilder sein, nicht die Person
 *   selbst, und aktiv – außer die Person selbst ist deaktiviert.
 * - Für Ausbilder werden Zuordnung und Ausbildungszeitraum nicht gespeichert.
 */
export function validatePerson(
  input: PersonInput,
  context: { persons: readonly PersonSnapshot[]; targetId?: string; targetActive?: boolean },
): Validation {
  const errors: FieldErrors = {};
  const name = text(input.name);
  const email = normalizeEmail(text(input.email));
  const role = text(input.role);
  const trainerId = text(input.trainerId);
  const trainingStart = text(input.trainingStart);
  const trainingEnd = text(input.trainingEnd);

  if (!name) {
    errors.name = "Name fehlt.";
  } else if (name.length > 200) {
    errors.name = "Name ist zu lang (höchstens 200 Zeichen).";
  }

  if (!email) {
    errors.email = "Firmen-E-Mail fehlt.";
  } else if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    errors.email = "Firmen-E-Mail ist ungültig.";
  }

  if (role !== "TRAINEE" && role !== "TRAINER") {
    errors.role = "Rolle fehlt.";
  }

  if (role === "TRAINEE") {
    if (!trainerId) {
      errors.trainerId = "Zugeordneter Ausbilder fehlt.";
    } else {
      const trainer = context.persons.find((person) => person.id === trainerId);
      if (!trainer || trainer.role !== "TRAINER" || trainer.id === context.targetId) {
        errors.trainerId = "Zugeordneter Ausbilder muss ein Ausbilder sein.";
      } else if (!trainer.active && context.targetActive !== false) {
        errors.trainerId = `Zugeordneter Ausbilder ${trainer.name} ist deaktiviert. Bitte einen aktiven Ausbilder wählen.`;
      }
    }

    if (!trainingStart) {
      errors.trainingStart = "Ausbildungsbeginn fehlt.";
    } else if (!isValidDate(trainingStart)) {
      errors.trainingStart = "Ausbildungsbeginn ist kein gültiges Datum.";
    }

    if (trainingEnd) {
      if (!isValidDate(trainingEnd)) {
        errors.trainingEnd = "Ausbildungsende ist kein gültiges Datum.";
      } else if (isValidDate(trainingStart) && trainingEnd < trainingStart) {
        errors.trainingEnd = "Ausbildungsende liegt vor dem Ausbildungsbeginn.";
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors };
  }
  const isTrainee = role === "TRAINEE";
  return {
    ok: true,
    value: {
      name,
      email,
      role: role as Role,
      trainerId: isTrainee ? trainerId : null,
      trainingStart: isTrainee ? trainingStart : null,
      trainingEnd: isTrainee && trainingEnd ? trainingEnd : null,
    },
  };
}

/**
 * Grund einer Ablehnung, unabhängig vom Meldungstext (für die neutralen Prüffälle):
 * - `already-inactive` / `already-active`: Person ist schon deaktiviert bzw. aktiv.
 * - `last-active-trainer`: letzter aktiver Ausbilder (AK-207).
 * - `has-trainees`: Ausbilder mit zugeordneten Azubis (AK-208).
 * - `self`: eigene Person (AK-207, Ergänzung „Selbstschutz“).
 * - `foreign-history`: Person kommt in der Historie fremder Berichte vor (AK-206).
 * - `trainer-inactive`: zugeordneter Ausbilder ist deaktiviert (AK-204, Wieder aktivieren).
 */
export type RuleReason =
  | "already-inactive"
  | "already-active"
  | "last-active-trainer"
  | "has-trainees"
  | "self"
  | "foreign-history"
  | "trainer-inactive";

/** Ergebnis einer Regelprüfung: erlaubt oder abgelehnt mit Grund und verständlicher Meldung. */
export type RuleResult =
  { allowed: true } | { allowed: false; reason: RuleReason; message: string; offerDeactivate?: boolean };

const ALLOWED: RuleResult = { allowed: true };

function deny(reason: RuleReason, message: string, offerDeactivate = false): RuleResult {
  return offerDeactivate ? { allowed: false, reason, message, offerDeactivate } : { allowed: false, reason, message };
}

function findTarget(persons: readonly PersonSnapshot[], targetId: string): PersonSnapshot {
  const target = persons.find((person) => person.id === targetId);
  if (!target) {
    throw new Error(`Person ${targetId} nicht im Stand enthalten`);
  }
  return target;
}

/** AK-207: Ist die Person der letzte aktive Ausbilder? */
export function isLastActiveTrainer(persons: readonly PersonSnapshot[], targetId: string): boolean {
  const target = findTarget(persons, targetId);
  if (target.role !== "TRAINER" || !target.active) {
    return false;
  }
  return !persons.some((person) => person.id !== targetId && person.role === "TRAINER" && person.active);
}

/** Azubis, die dem Ausbilder zugeordnet sind (optional nur aktive). */
export function assignedTrainees(
  persons: readonly PersonSnapshot[],
  trainerId: string,
  options: { activeOnly?: boolean } = {},
): PersonSnapshot[] {
  return persons.filter(
    (person) => person.role === "TRAINEE" && person.trainerId === trainerId && (!options.activeOnly || person.active),
  );
}

function names(persons: readonly PersonSnapshot[]): string {
  return persons
    .map((person) => person.name)
    .sort((a, b) => a.localeCompare(b, "de"))
    .join(", ");
}

/**
 * Deaktivieren („Entfernen“, AK-204).
 * - AK-207: nicht der letzte aktive Ausbilder.
 * - AK-208: kein Ausbilder, dem noch aktive Azubis zugeordnet sind.
 * - Niemand deaktiviert sich selbst (sonst sperrt man sich mitten in der Sitzung aus).
 */
export function checkDeactivate(persons: readonly PersonSnapshot[], targetId: string, actorId: string): RuleResult {
  const target = findTarget(persons, targetId);
  if (!target.active) {
    return deny("already-inactive", `${target.name} ist bereits deaktiviert.`);
  }
  if (isLastActiveTrainer(persons, targetId)) {
    return deny(
      "last-active-trainer",
      `${target.name} ist der letzte aktive Ausbilder und kann nicht deaktiviert werden.`,
    );
  }
  if (target.role === "TRAINER") {
    const trainees = assignedTrainees(persons, targetId, { activeOnly: true });
    if (trainees.length > 0) {
      return deny(
        "has-trainees",
        `${target.name} sind noch Azubis zugeordnet (${names(trainees)}). Bitte diese zuerst einem anderen Ausbilder zuordnen.`,
      );
    }
  }
  if (targetId === actorId) {
    return deny("self", "Sie können sich nicht selbst deaktivieren.");
  }
  return ALLOWED;
}

/**
 * Reaktivieren: ein Azubi nur, wenn sein zugeordneter Ausbilder aktiv ist.
 */
export function checkReactivate(persons: readonly PersonSnapshot[], targetId: string): RuleResult {
  const target = findTarget(persons, targetId);
  if (target.active) {
    return deny("already-active", `${target.name} ist bereits aktiv.`);
  }
  if (target.role === "TRAINEE") {
    const trainer = persons.find((person) => person.id === target.trainerId);
    if (!trainer?.active) {
      return deny(
        "trainer-inactive",
        `Der zugeordnete Ausbilder${trainer ? ` ${trainer.name}` : ""} ist deaktiviert. Bitte ${target.name} zuerst einem aktiven Ausbilder zuordnen.`,
      );
    }
  }
  return ALLOWED;
}

/**
 * Endgültiges Löschen (AK-206).
 * - Nur nach Bestätigung durch Eintippen des Namens.
 * - AK-207: nicht der letzte aktive Ausbilder.
 * - Kein Ausbilder, dem noch Azubis zugeordnet sind (auch deaktivierte).
 * - Entscheidung „Ausbilder mit Historie“: Wer in der Historie von Berichten anderer Azubis
 *   vorkommt (Statuswechsel oder Kommentare), lässt sich nur deaktivieren.
 * - Niemand löscht sich selbst.
 */
export function checkDelete(
  persons: readonly PersonSnapshot[],
  targetId: string,
  actorId: string,
  facts: { hasForeignHistory: boolean },
): RuleResult {
  const target = findTarget(persons, targetId);
  if (isLastActiveTrainer(persons, targetId)) {
    return deny(
      "last-active-trainer",
      `${target.name} ist der letzte aktive Ausbilder und kann nicht gelöscht werden.`,
    );
  }
  if (target.role === "TRAINER") {
    const trainees = assignedTrainees(persons, targetId);
    if (trainees.length > 0) {
      return deny(
        "has-trainees",
        `${target.name} sind noch Azubis zugeordnet (${names(trainees)}). Bitte diese zuerst einem anderen Ausbilder zuordnen.`,
      );
    }
  }
  if (targetId === actorId) {
    return deny("self", "Sie können sich nicht selbst löschen.");
  }
  if (facts.hasForeignHistory) {
    return deny("foreign-history", foreignHistoryMessage(target.name, target.active), target.active);
  }
  return ALLOWED;
}

/** Meldung für Entscheidung 1: Person mit Einträgen in fremder Historie. */
export function foreignHistoryMessage(name: string, active: boolean): string {
  return (
    `${name} kommt in der Historie von Berichten anderer Azubis vor (Statuswechsel oder Kommentare). ` +
    "Damit diese Historie vollständig bleibt, lässt sich die Person nicht endgültig löschen" +
    (active ? ", sondern nur deaktivieren." : ". Sie ist bereits deaktiviert.")
  );
}

/** Die Namensbestätigung beim Löschen muss genau dem Namen entsprechen (Leerzeichen am Rand egal). */
export function confirmsName(confirmation: string | null | undefined, name: string): boolean {
  return text(confirmation) === name.trim();
}

/**
 * Änderung einer bestehenden Person (AK-203), insbesondere Rollenwechsel:
 * - Ausbilder → Azubi nur, wenn nicht der letzte aktive Ausbilder (AK-207), keine Azubis mehr
 *   zugeordnet sind und es nicht die eigene Rolle ist.
 * - Azubi → Ausbilder ist immer möglich; Zuordnung und Ausbildungszeitraum entfallen.
 */
export function checkUpdate(
  persons: readonly PersonSnapshot[],
  targetId: string,
  actorId: string,
  next: Pick<ValidPerson, "role">,
): { allowed: true } | { allowed: false; reason: RuleReason; field: PersonField; message: string } {
  const target = findTarget(persons, targetId);
  if (target.role === "TRAINER" && next.role === "TRAINEE") {
    if (isLastActiveTrainer(persons, targetId)) {
      return {
        allowed: false,
        reason: "last-active-trainer",
        field: "role",
        message: `${target.name} ist der letzte aktive Ausbilder und kann nicht zum Azubi herabgestuft werden.`,
      };
    }
    const trainees = assignedTrainees(persons, targetId);
    if (trainees.length > 0) {
      return {
        allowed: false,
        reason: "has-trainees",
        field: "role",
        message: `${target.name} sind noch Azubis zugeordnet (${names(trainees)}). Bitte diese zuerst einem anderen Ausbilder zuordnen.`,
      };
    }
  }
  if (targetId === actorId && next.role !== target.role) {
    return { allowed: false, reason: "self", field: "role", message: "Sie können Ihre eigene Rolle nicht ändern." };
  }
  return { allowed: true };
}

export type FederalStateSetting =
  { ok: true; federalState: FederalState } | { ok: false; reason: "forbidden" | "unknown-federal-state" };

/**
 * AK-209: Bundesland der Firma einstellen – nur ein aktiver Ausbilder (Admin) und nur eines der
 * 16 Bundesländer (AK-1205).
 */
export function checkFederalStateSetting(actor: Viewer | null | undefined, value: unknown): FederalStateSetting {
  if (!canManagePeople(actor)) {
    return { ok: false, reason: "forbidden" };
  }
  if (!isFederalState(value)) {
    return { ok: false, reason: "unknown-federal-state" };
  }
  return { ok: true, federalState: value };
}
