import { redirect } from "next/navigation";
import { requirePerson } from "@/lib/session";

/**
 * Bisherige Einstellungen der Ausbilder: zusammengeführt in `/einstellungen` (UI-Spezifikation).
 * Azubis leitet die Rollenprüfung wie bei jeder Ausbilder-Seite zur eigenen Startseite (AK-104).
 */
export default async function TrainerSettingsRedirect({ searchParams }: PageProps<"/ausbilder/einstellungen">) {
  await requirePerson("TRAINER");
  const { meldung } = await searchParams;
  redirect(typeof meldung === "string" ? `/einstellungen?meldung=${encodeURIComponent(meldung)}` : "/einstellungen");
}
