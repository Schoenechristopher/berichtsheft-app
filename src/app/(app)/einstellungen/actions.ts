"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE_SECONDS, themeAttribute } from "@/domain/theme";
import { db } from "@/lib/db";
import { updateOwnChannels } from "@/lib/notifications/service";
import { updateOwnTheme } from "@/lib/people/service";
import { requirePerson } from "@/lib/session";

export type ChannelsFormState = { ok: true; message: string } | { ok: false; formError: string } | null;

/** Eigene Kanäle speichern (AK-1011). Jede Person ändert nur ihre eigenen; der Server prüft selbst. */
export async function updateChannelsAction(_prev: ChannelsFormState, formData: FormData): Promise<ChannelsFormState> {
  const person = await requirePerson();
  const values = formData.getAll("channels").map(String);
  const result = await updateOwnChannels(db(), person, values);
  if (!result.ok) {
    return { ok: false, formError: result.formError };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Gespeichert. Die Kanäle gelten ab der nächsten Benachrichtigung." };
}

/**
 * Darstellung speichern (UI-AK-14): am Konto (geräteübergreifend) und im Cookie, damit schon das
 * erste Rendern jeder Seite passt (UI-AK-15).
 */
export async function updateThemeAction(theme: string): Promise<{ ok: boolean }> {
  const person = await requirePerson();
  const result = await updateOwnTheme(db(), person, theme);
  if (!result.ok) {
    return { ok: false };
  }
  (await cookies()).set(THEME_COOKIE, themeAttribute(result.theme), {
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
  });
  return { ok: true };
}
