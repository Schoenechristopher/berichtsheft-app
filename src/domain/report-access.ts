/**
 * Zugriffsregeln für Wochenberichte (AK-103, AK-104, AK-105, AK-204).
 *
 * Reine Funktionen ohne Abhängigkeit zu UI oder Datenbank. Jede Seite und jede Serveraktion,
 * die einen Bericht liest oder ändert, fragt hier nach; ausgeblendete Schaltflächen sind kein Schutz.
 */
import type { Role } from "./access";

export type ReportStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

/** Angemeldete Person, die zugreifen will. */
export interface Viewer {
  id: string;
  role: Role;
  active: boolean;
}

/** Ausschnitt eines Berichts, den die Zugriffsprüfung braucht. */
export interface ReportForAccess {
  traineeId: string;
  status: ReportStatus;
  /** Ist der Azubi, dem der Bericht gehört, aktiv? */
  traineeActive: boolean;
}

/** Status, in denen der Azubi seinen Bericht bearbeiten darf: „offen“ laut Spezifikation. */
const EDITABLE_STATUSES: readonly ReportStatus[] = ["DRAFT", "REJECTED"];

/**
 * Ansehen: Ein Azubi sieht nur eigene Berichte (AK-103); jeder Ausbilder sieht die Berichte
 * aller Azubis, auch deaktivierter (AK-105, AK-204). Deaktivierte Personen sehen nichts.
 */
export function canViewReport(viewer: Viewer, report: Pick<ReportForAccess, "traineeId">): boolean {
  if (!viewer.active) {
    return false;
  }
  return viewer.role === "TRAINER" || report.traineeId === viewer.id;
}

/**
 * Inhalt ändern: nur der Azubi selbst, solange er aktiv ist und der Bericht offen ist
 * (Entwurf oder Abgelehnt). Berichte deaktivierter Azubis sind nicht mehr änderbar (AK-204).
 * Ausbilder ändern keine Inhalte; Prüfen ist eine eigene Aktion (Etappe 4).
 */
export function canEditReport(viewer: Viewer, report: ReportForAccess): boolean {
  return (
    viewer.active &&
    viewer.role === "TRAINEE" &&
    report.traineeId === viewer.id &&
    report.traineeActive &&
    EDITABLE_STATUSES.includes(report.status)
  );
}

/** Admin-Funktionen (Nutzerverwaltung, Einstellungen) und Prüfen: nur aktive Ausbilder (AK-104). */
export function canManagePeople(viewer: Viewer | null | undefined): boolean {
  return !!viewer && viewer.active && viewer.role === "TRAINER";
}

/** Hinweis bei fremdem Bericht (AK-103). */
export const ACCESS_DENIED_MESSAGE = "Zugriff verweigert";

/** Anzeigename des Status. */
export function reportStatusLabel(status: ReportStatus): string {
  switch (status) {
    case "DRAFT":
      return "Entwurf";
    case "SUBMITTED":
      return "Eingereicht";
    case "APPROVED":
      return "Freigegeben";
    case "REJECTED":
      return "Abgelehnt";
  }
}
