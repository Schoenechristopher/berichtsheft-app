"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { updateOwnChannels } from "@/lib/notifications/service";
import { requirePerson } from "@/lib/session";

export type ChannelsFormState = { ok: true; message: string } | { ok: false; formError: string } | null;

/** Eigene Kanäle speichern (AK-1011). Jede Person ändert nur ihre eigenen; der Server prüft selbst. */
export async function updateChannelsAction(_prev: ChannelsFormState, formData: FormData): Promise<ChannelsFormState> {
  const person = await requirePerson();
  const values = formData.getAll("channels").map(String);
  const result = await updateOwnChannels(db(), person, values);
  if (!result.ok) {
    return result;
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Gespeichert. Die Kanäle gelten ab der nächsten Benachrichtigung." };
}
