/**
 * Statusmodell der Wochenberichte (Spezifikation, Abschnitt „Statusmodell“; AK-501 – AK-508,
 * AK-601 – AK-607, AK-701 – AK-704).
 *
 * Reine Funktionen ohne Abhängigkeit zu UI oder Datenbank. `decideTransition` entscheidet für
 * (aktueller Status, Aktion, handelnde Person, Bericht), ob ein Übergang erlaubt ist, und liefert
 * sonst eine verständliche Meldung. Der Server (`src/lib/report-transitions.ts`) fragt hier vor
 * jedem Statuswechsel nach; die Oberfläche blendet damit Schaltflächen aus.
 */
import type { Role } from "./access";
import type { ReportStatus, Viewer } from "./report-access";

/** Aktionen des Statusmodells. */
export type ReportAction = "SUBMIT" | "WITHDRAW" | "APPROVE" | "REJECT" | "RESUBMIT" | "REVOKE_APPROVAL";

export const REPORT_ACTIONS: readonly ReportAction[] = [
  "SUBMIT",
  "WITHDRAW",
  "APPROVE",
  "REJECT",
  "RESUBMIT",
  "REVOKE_APPROVAL",
];

export const REPORT_STATUSES: readonly ReportStatus[] = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];

/** Anzeigename des Status. */
export const STATUS_LABELS: Record<ReportStatus, string> = {
  DRAFT: "Entwurf",
  SUBMITTED: "Eingereicht",
  APPROVED: "Freigegeben",
  REJECTED: "Abgelehnt",
};

/**
 * „Offen“ laut Spezifikation: Status „Entwurf“ oder „Abgelehnt“. In diesen Status bearbeitet der
 * Azubi den Bericht; sie zählen für Übersicht und Erinnerung als nicht eingereicht. Wochen ganz
 * außerhalb der Ausbildung nimmt `classifyWeek` zusätzlich aus.
 */
export const OPEN_STATUSES: readonly ReportStatus[] = ["DRAFT", "REJECTED"];

export function isOpenStatus(status: ReportStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

/** Die erlaubten Übergänge – genau die Pfeile des Statusdiagramms. */
export const TRANSITIONS: Readonly<Record<ReportAction, { from: ReportStatus; to: ReportStatus; role: Role }>> = {
  SUBMIT: { from: "DRAFT", to: "SUBMITTED", role: "TRAINEE" },
  WITHDRAW: { from: "SUBMITTED", to: "DRAFT", role: "TRAINEE" },
  APPROVE: { from: "SUBMITTED", to: "APPROVED", role: "TRAINER" },
  REJECT: { from: "SUBMITTED", to: "REJECTED", role: "TRAINER" },
  RESUBMIT: { from: "REJECTED", to: "SUBMITTED", role: "TRAINEE" },
  REVOKE_APPROVAL: { from: "APPROVED", to: "REJECTED", role: "TRAINER" },
};

export const ACTION_LABELS: Record<ReportAction, string> = {
  SUBMIT: "Einreichen",
  WITHDRAW: "Zurückziehen",
  APPROVE: "Freigeben",
  REJECT: "Ablehnen",
  RESUBMIT: "Erneut einreichen",
  REVOKE_APPROVAL: "Freigabe zurücknehmen",
};

/** Höchstlänge für Gesamtkommentar, Tageskommentar und Begründung (wie „Tätigkeiten“). */
export const MAX_COMMENT_LENGTH = 5000;

/** Meldungen; die zu AK-508 wörtlich aus der Spezifikation. */
export const TRANSITION_MESSAGES = {
  forbidden: "Zugriff verweigert",
  traineeOnly: "Diese Aktion ist nur für den Azubi des Berichts möglich.",
  trainerOnly: "Prüfen ist nur für Ausbilder möglich.",
  traineeInactive: "Nicht änderbar: Die Person ist deaktiviert.",
  traineeInactiveReview:
    "Der Azubi ist deaktiviert und kann den Bericht nicht mehr überarbeiten. Ablehnen und Zurücknehmen der Freigabe sind deshalb nicht möglich, Freigeben schon.",
  /** AK-508: Ausbilder prüft, der Azubi hat inzwischen zurückgezogen. */
  withdrawnMeanwhile: "Bericht wurde zurückgezogen",
  /** AK-508 umgekehrt: Azubi zieht zurück, ein Ausbilder hat inzwischen geprüft. */
  reviewedMeanwhile: "Bericht wurde bereits geprüft und kann nicht mehr zurückgezogen werden.",
  reviewedByOther: "Bericht wurde inzwischen bereits geprüft.",
  changedMeanwhile: "Der Bericht wurde inzwischen geändert. Bitte die Seite neu laden und erneut prüfen.",
  alreadySubmitted: "Der Bericht ist bereits eingereicht.",
  alreadyWithdrawn: "Der Bericht wurde bereits zurückgezogen.",
  alreadyRevoked: "Die Freigabe wurde bereits zurückgenommen.",
  /** AK-607 */
  draftNotReviewable: "Berichte im Status „Entwurf“ können weder freigegeben noch abgelehnt werden.",
  /** AK-507 */
  notWithdrawable: "Ein freigegebener oder abgelehnter Bericht kann nicht zurückgezogen werden.",
  /** AK-704 */
  approvedLocked:
    "Ein freigegebener Bericht kann nicht geändert werden – nur ein Ausbilder kann die Freigabe zurücknehmen.",
  commentRequired: "Bitte einen Gesamtkommentar eingeben – ohne ihn ist keine Ablehnung möglich.",
  reasonRequired: "Bitte eine Begründung eingeben – ohne sie lässt sich die Freigabe nicht zurücknehmen.",
  tooLong: `Höchstens ${MAX_COMMENT_LENGTH.toLocaleString("de-DE")} Zeichen.`,
} as const;

/** Bericht, soweit die Entscheidung ihn braucht. */
export interface ReportForTransition {
  traineeId: string;
  /** Ist der Azubi, dem der Bericht gehört, aktiv? */
  traineeActive: boolean;
  status: ReportStatus;
  version: number;
}

/** Stand, den die handelnde Person zuletzt gesehen hat (aus dem Formular). */
export interface SeenState {
  status: ReportStatus;
  version: number;
}

export interface TransitionRequest {
  action: ReportAction;
  actor: Viewer;
  report: ReportForTransition;
  /** Fehlt er, wird nur gegen den aktuellen Stand geprüft. */
  seen?: SeenState;
  /** Gesamtkommentar (Ablehnen) bzw. Begründung (Freigabe zurücknehmen). */
  text?: string | null;
}

export type TransitionErrorCode = "FORBIDDEN" | "NOT_ALLOWED" | "CONFLICT" | "TRAINEE_INACTIVE" | "TEXT";

/**
 * Fester Grund einer Ablehnung, unabhängig vom Meldungstext (für die neutralen Prüffälle,
 * `specs/pruefung/format.md`, „Schnittstellen und Aktionen von M05“). Jede Meldung hat genau einen Grund;
 * mehrere Meldungen können denselben Grund haben (z. B. `not-allowed`).
 */
export type TransitionReason =
  | "forbidden"
  | "trainee-inactive"
  | "not-allowed"
  | "withdrawn-meanwhile"
  | "reviewed-meanwhile"
  | "already-submitted"
  | "already-withdrawn"
  | "already-revoked"
  | "changed-meanwhile"
  | "comment-required"
  | "reason-required"
  | "text-too-long";

export type TransitionDecision =
  | { ok: true; from: ReportStatus; to: ReportStatus; text: string | null }
  | {
      ok: false;
      code: TransitionErrorCode;
      reason: TransitionReason;
      message: string;
      field?: "comment" | "reason";
    };

/** Ein Text gilt als leer, wenn er nur aus Leerraum besteht (wie bei „Tätigkeiten“, AK-501). */
export function isBlank(text: string | null | undefined): boolean {
  return !text || text.trim() === "";
}

/**
 * Entscheidet über einen Statuswechsel. Reihenfolge der Prüfungen: Person und Rolle, Besitz,
 * Status und Version (Gleichzeitigkeit, AK-508), deaktivierter Azubi, Pflichttext.
 * Die Pflichtfeld-Prüfung beim Einreichen (AK-501) steht in `report-submission.ts`.
 */
export function decideTransition(request: TransitionRequest): TransitionDecision {
  const { action, actor, report, seen } = request;
  const rule = TRANSITIONS[action];
  if (!actor.active) {
    return fail("FORBIDDEN", "forbidden", TRANSITION_MESSAGES.forbidden);
  }
  if (rule.role === "TRAINEE") {
    if (actor.role !== "TRAINEE") {
      return fail("FORBIDDEN", "forbidden", TRANSITION_MESSAGES.traineeOnly);
    }
    if (report.traineeId !== actor.id) {
      return fail("FORBIDDEN", "forbidden", TRANSITION_MESSAGES.forbidden);
    }
  } else if (actor.role !== "TRAINER") {
    return fail("FORBIDDEN", "forbidden", TRANSITION_MESSAGES.trainerOnly);
  }

  if (report.status !== rule.from) {
    const sawValidState = seen !== undefined && seen.status === rule.from;
    const [reason, message] = sawValidState
      ? conflictMessage(action, report.status)
      : notAllowedMessage(action, report.status);
    return fail(sawValidState ? "CONFLICT" : "NOT_ALLOWED", reason, message);
  }
  if (seen !== undefined && seen.version !== report.version) {
    return fail("CONFLICT", "changed-meanwhile", TRANSITION_MESSAGES.changedMeanwhile);
  }

  if (!report.traineeActive) {
    if (rule.role === "TRAINEE") {
      return fail("TRAINEE_INACTIVE", "trainee-inactive", TRANSITION_MESSAGES.traineeInactive);
    }
    if (action !== "APPROVE") {
      return fail("TRAINEE_INACTIVE", "trainee-inactive", TRANSITION_MESSAGES.traineeInactiveReview);
    }
  }

  let text: string | null = null;
  if (action === "REJECT" || action === "REVOKE_APPROVAL") {
    const field = action === "REJECT" ? "comment" : "reason";
    if (isBlank(request.text)) {
      return {
        ok: false,
        code: "TEXT",
        reason: action === "REJECT" ? "comment-required" : "reason-required",
        field,
        message: action === "REJECT" ? TRANSITION_MESSAGES.commentRequired : TRANSITION_MESSAGES.reasonRequired,
      };
    }
    text = normalizeComment(request.text ?? "");
    if (commentTooLong(text)) {
      return { ok: false, code: "TEXT", reason: "text-too-long", field, message: TRANSITION_MESSAGES.tooLong };
    }
  }
  return { ok: true, from: rule.from, to: rule.to, text };
}

/** Grund und Meldung, wenn jemand einen gültigen Stand gesehen hat, der sich inzwischen geändert hat. */
function conflictMessage(action: ReportAction, current: ReportStatus): [TransitionReason, string] {
  switch (action) {
    case "APPROVE":
    case "REJECT":
      return current === "DRAFT"
        ? ["withdrawn-meanwhile", TRANSITION_MESSAGES.withdrawnMeanwhile]
        : ["reviewed-meanwhile", TRANSITION_MESSAGES.reviewedByOther];
    case "WITHDRAW":
      return current === "DRAFT"
        ? ["already-withdrawn", TRANSITION_MESSAGES.alreadyWithdrawn]
        : ["reviewed-meanwhile", TRANSITION_MESSAGES.reviewedMeanwhile];
    case "SUBMIT":
    case "RESUBMIT":
      return current === "SUBMITTED"
        ? ["already-submitted", TRANSITION_MESSAGES.alreadySubmitted]
        : ["changed-meanwhile", TRANSITION_MESSAGES.changedMeanwhile];
    case "REVOKE_APPROVAL":
      return current === "REJECTED"
        ? ["already-revoked", TRANSITION_MESSAGES.alreadyRevoked]
        : ["changed-meanwhile", TRANSITION_MESSAGES.changedMeanwhile];
  }
}

/** Grund und Meldung, wenn der Übergang im aktuellen Status grundsätzlich nicht vorgesehen ist. */
function notAllowedMessage(action: ReportAction, current: ReportStatus): [TransitionReason, string] {
  const status = STATUS_LABELS[current];
  switch (action) {
    case "APPROVE":
    case "REJECT":
      return [
        "not-allowed",
        current === "DRAFT"
          ? TRANSITION_MESSAGES.draftNotReviewable
          : `Der Bericht ist nicht eingereicht (Status „${status}“) und kann nicht geprüft werden.`,
      ];
    case "WITHDRAW":
      return [
        "not-allowed",
        current === "DRAFT"
          ? "Nur eingereichte Berichte können zurückgezogen werden."
          : TRANSITION_MESSAGES.notWithdrawable,
      ];
    case "SUBMIT":
    case "RESUBMIT":
      if (current === "SUBMITTED") {
        return ["already-submitted", TRANSITION_MESSAGES.alreadySubmitted];
      }
      if (current === "APPROVED") {
        return ["not-allowed", TRANSITION_MESSAGES.approvedLocked];
      }
      return ["not-allowed", `„${ACTION_LABELS[action]}“ ist im Status „${status}“ nicht möglich.`];
    case "REVOKE_APPROVAL":
      return ["not-allowed", `Nur freigegebene Berichte können zurückgenommen werden (Status „${status}“).`];
  }
}

function fail(code: TransitionErrorCode, reason: TransitionReason, message: string): TransitionDecision {
  return { ok: false, code, reason, message };
}

/** Kommentare werden wie „Tätigkeiten“ unverändert gespeichert, nur Zeilenumbrüche einheitlich. */
export function normalizeComment(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

export function commentTooLong(text: string): boolean {
  return Array.from(normalizeComment(text)).length > MAX_COMMENT_LENGTH;
}

/** Welche Aktionen die Person im aktuellen Status hat – für die Schaltflächen der Oberfläche. */
export function availableActions(actor: Viewer, report: ReportForTransition): ReportAction[] {
  return REPORT_ACTIONS.filter((action) => {
    const decision = decideTransition({ action, actor, report, text: "x" });
    return decision.ok;
  });
}

/**
 * Prüfrunde eines neuen Statuswechsels: Jede Einreichung (auch die erneute) beginnt eine neue
 * Runde; alle anderen Wechsel gehören zur laufenden. `submissions` ist die Zahl der bisherigen
 * Einreichungen des Berichts.
 */
export function reviewRoundFor(action: ReportAction, submissions: number): number {
  return TRANSITIONS[action].to === "SUBMITTED" ? submissions + 1 : submissions;
}
