"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { now } from "@/domain/clock";
import { db } from "@/lib/db";
import { retryUndeliverable } from "@/lib/notifications/service";
import { requirePerson } from "@/lib/session";

/** „Erneut versuchen“ für eine nicht zustellbare Nachricht; der Server prüft die Rolle selbst. */
export async function retryAction(notificationId: string) {
  const person = await requirePerson("TRAINER");
  const result = await retryUndeliverable(db(), person, notificationId, now());
  revalidatePath("/", "layout");
  redirect(`/ausbilder/nicht-zustellbar?meldung=${result.ok ? "erneut" : "fehler"}`);
}
