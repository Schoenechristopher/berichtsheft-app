import { requirePerson } from "@/lib/session";

/**
 * Bereich nur für Ausbilder (AK-104). Jede Seite und jede Serveraktion prüft die Rolle
 * zusätzlich selbst; dieses Layout ist nur die erste Schranke.
 */
export default async function TrainerLayout({ children }: LayoutProps<"/ausbilder">) {
  await requirePerson("TRAINER");
  return children;
}
