/**
 * Historie eines Berichts (AK-801 – AK-803): Statuswechsel und Kommentare, nach Prüfrunde gruppiert.
 *
 * Reine Funktionen ohne Abhängigkeit zu UI oder Datenbank. Jede Einreichung beginnt eine neue
 * Prüfrunde (`reviewRoundFor`); Ablehnung, Freigabe, Rücknahme und Kommentare gehören zur Runde,
 * in der sie entstanden sind. Runde 0 gibt es nur, falls vor der ersten Einreichung etwas geschah.
 */
import type { ReportStatus } from "./report-access";
import { APP_TIME_ZONE } from "./weeks";

export interface HistoryChange {
  id: string;
  reviewRound: number;
  /** Reihenfolge der Einträge, auch bei gleichem Zeitpunkt. */
  seq: number;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  actorName: string;
  reason: string | null;
  createdAt: Date;
}

export interface HistoryComment {
  id: string;
  reviewRound: number;
  /** Leer = Gesamtkommentar. */
  dayId: string | null;
  /** Kalendertag des Tageskommentars (für Reihenfolge und Beschriftung). */
  dayDate: Date | null;
  authorName: string;
  text: string;
  createdAt: Date;
}

export interface HistoryRound {
  round: number;
  changes: HistoryChange[];
  /** Gesamtkommentare der Runde. */
  overall: HistoryComment[];
  /** Tageskommentare der Runde, Mo–Fr. */
  days: HistoryComment[];
}

/** Gruppiert Statuswechsel und Kommentare nach Runde, neueste Runde zuerst. */
export function groupHistory(changes: readonly HistoryChange[], comments: readonly HistoryComment[]): HistoryRound[] {
  const rounds = new Map<number, HistoryRound>();
  const roundOf = (round: number) => {
    let entry = rounds.get(round);
    if (!entry) {
      entry = { round, changes: [], overall: [], days: [] };
      rounds.set(round, entry);
    }
    return entry;
  };
  for (const change of [...changes].sort((a, b) => a.seq - b.seq)) {
    roundOf(change.reviewRound).changes.push(change);
  }
  for (const comment of comments) {
    const round = roundOf(comment.reviewRound);
    (comment.dayId === null ? round.overall : round.days).push(comment);
  }
  for (const round of rounds.values()) {
    round.days.sort((a, b) => (a.dayDate?.getTime() ?? 0) - (b.dayDate?.getTime() ?? 0));
  }
  return [...rounds.values()].sort((a, b) => b.round - a.round);
}

/**
 * Kommentare der letzten Ablehnung bzw. Begründung der Rücknahme, solange der Bericht
 * „Abgelehnt“ ist (AK-606, AK-703): Das zeigt die Berichtsseite oben und bei den Tagen.
 */
export interface CurrentFeedback {
  kind: "REJECTED" | "REVOKED";
  actorName: string;
  at: Date;
  /** Gesamtkommentar bzw. Begründung der Rücknahme. */
  text: string;
  /** Tageskommentare je Tag (nur bei Ablehnung). */
  dayComments: Map<string, string[]>;
}

export function currentFeedback(
  status: ReportStatus,
  changes: readonly HistoryChange[],
  comments: readonly HistoryComment[],
): CurrentFeedback | null {
  if (status !== "REJECTED") {
    return null;
  }
  const last = [...changes].sort((a, b) => b.seq - a.seq).find((change) => change.toStatus === "REJECTED");
  if (!last) {
    return null;
  }
  if (last.fromStatus === "APPROVED") {
    return {
      kind: "REVOKED",
      actorName: last.actorName,
      at: last.createdAt,
      text: last.reason ?? "",
      dayComments: new Map(),
    };
  }
  const roundComments = comments.filter((comment) => comment.reviewRound === last.reviewRound);
  const dayComments = new Map<string, string[]>();
  for (const comment of roundComments) {
    if (comment.dayId !== null) {
      dayComments.set(comment.dayId, [...(dayComments.get(comment.dayId) ?? []), comment.text]);
    }
  }
  return {
    kind: "REJECTED",
    actorName: last.actorName,
    at: last.createdAt,
    text: roundComments
      .filter((comment) => comment.dayId === null)
      .map((comment) => comment.text)
      .join("\n\n"),
    dayComments,
  };
}

/** Letzte Freigabe, solange der Bericht freigegeben ist (AK-603): Person und Zeitpunkt. */
export function currentApproval(
  status: ReportStatus,
  changes: readonly HistoryChange[],
): { actorName: string; at: Date } | null {
  if (status !== "APPROVED") {
    return null;
  }
  const last = [...changes].sort((a, b) => b.seq - a.seq).find((change) => change.toStatus === "APPROVED");
  return last ? { actorName: last.actorName, at: last.createdAt } : null;
}

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Zeitpunkt als „07.10.2026, 14:05 Uhr“ in Europe/Berlin. */
export function formatDateTime(instant: Date): string {
  return `${dateTimeFormat.format(instant)} Uhr`;
}

/** Bezeichnung eines Statuswechsels in der Historie (AK-801). */
export function changeLabel(change: Pick<HistoryChange, "fromStatus" | "toStatus">): string {
  const { fromStatus: from, toStatus: to } = change;
  if (to === "SUBMITTED") {
    return from === "REJECTED" ? "Erneut eingereicht" : "Eingereicht";
  }
  if (to === "DRAFT") {
    return from === "SUBMITTED" ? "Zurückgezogen" : "Entwurf";
  }
  if (to === "APPROVED") {
    return "Freigegeben";
  }
  return from === "APPROVED" ? "Freigabe zurückgenommen" : "Abgelehnt";
}
