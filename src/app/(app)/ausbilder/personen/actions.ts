"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { now } from "@/domain/clock";
import type { PersonInput } from "@/domain/people";
import { db } from "@/lib/db";
import {
  createPerson,
  deactivatePerson,
  deletePerson,
  reactivatePerson,
  updateFederalState,
  updatePerson,
  type ActionResult,
} from "@/lib/people/service";
import { ensureReportsForTrainee } from "@/lib/reports";
import { requirePerson } from "@/lib/session";

/**
 * Serveraktionen der Nutzerverwaltung. Jede Aktion prüft selbst die Rolle (AK-104):
 * `requirePerson("TRAINER")` leitet alle anderen weg, und der Service prüft noch einmal.
 */

/** Zustand eines Formulars nach dem Absenden: Ergebnis plus eingegebene Werte. */
export type FormState = (ActionResult & { values?: PersonInput; attempt: number }) | null;

function personInput(formData: FormData): PersonInput {
  const field = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : null;
  };
  return {
    name: field("name"),
    email: field("email"),
    role: field("role"),
    trainerId: field("trainerId"),
    trainingStart: field("trainingStart"),
    trainingEnd: field("trainingEnd"),
  };
}

function next(prev: FormState, result: ActionResult, values?: PersonInput): FormState {
  return { ...result, values, attempt: (prev?.attempt ?? 0) + 1 };
}

function done(path: string): never {
  revalidatePath("/ausbilder", "layout");
  redirect(path);
}

export async function createPersonAction(prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePerson("TRAINER");
  const values = personInput(formData);
  const result = await createPerson(db(), actor, values);
  if (result.ok) {
    done(`/ausbilder/personen/${result.personId}?meldung=angelegt`);
  }
  return next(prev, result, values);
}

export async function updatePersonAction(personId: string, prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePerson("TRAINER");
  const values = personInput(formData);
  const result = await updatePerson(db(), actor, personId, values);
  if (result.ok) {
    // AK-203: geänderten Ausbildungszeitraum sofort auf die Wochenberichte anwenden.
    await ensureReportsForTrainee(db(), personId, now());
    done(`/ausbilder/personen/${personId}?meldung=gespeichert`);
  }
  return next(prev, result, values);
}

export async function deactivatePersonAction(personId: string, prev: FormState): Promise<FormState> {
  const actor = await requirePerson("TRAINER");
  const result = await deactivatePerson(db(), actor, personId);
  if (result.ok) {
    done(`/ausbilder/personen/${personId}?meldung=deaktiviert`);
  }
  return next(prev, result);
}

export async function reactivatePersonAction(personId: string, prev: FormState): Promise<FormState> {
  const actor = await requirePerson("TRAINER");
  const result = await reactivatePerson(db(), actor, personId);
  if (result.ok) {
    done(`/ausbilder/personen/${personId}?meldung=aktiviert`);
  }
  return next(prev, result);
}

export async function deletePersonAction(personId: string, prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePerson("TRAINER");
  const confirmation = formData.get("confirmName");
  const result = await deletePerson(db(), actor, personId, typeof confirmation === "string" ? confirmation : null);
  if (result.ok) {
    done("/ausbilder/personen?meldung=geloescht");
  }
  return next(prev, result);
}

export async function updateSettingsAction(prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePerson("TRAINER");
  const federalState = formData.get("federalState");
  const result = await updateFederalState(db(), actor, typeof federalState === "string" ? federalState : null);
  if (result.ok) {
    done("/ausbilder/einstellungen?meldung=gespeichert");
  }
  return next(prev, result);
}
