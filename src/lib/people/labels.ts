/** Anzeige-Texte der Nutzerverwaltung. */
import { formatDate } from "@/domain/weeks";

/** Ausbildungszeitraum, z. B. „01.09.2026 – offen“. */
export function trainingPeriod(start: Date | null, end: Date | null): string {
  if (!start) {
    return "–";
  }
  return `${formatDate(start)} – ${end ? formatDate(end) : "offen"}`;
}

/** Meldungen nach erfolgreicher Aktion (per Parameter `meldung` in der Adresse). */
export const SUCCESS_MESSAGES: Record<string, string> = {
  angelegt: "Person angelegt. Sie kann sich jetzt mit ihrem Firmenkonto anmelden.",
  gespeichert: "Änderungen gespeichert.",
  deaktiviert: "Person deaktiviert. Sie kann sich nicht mehr anmelden; ihre Berichte bleiben lesbar.",
  aktiviert: "Person wieder aktiviert.",
  geloescht: "Person und alle ihre Berichte wurden endgültig gelöscht.",
};
