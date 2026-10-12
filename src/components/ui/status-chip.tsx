import { STATUS_LABELS } from "@/domain/report-status";
import type { ReportStatus } from "@/domain/report-access";
import { ArrowUpIcon, CheckIcon, ClockIcon, PencilIcon, XCircleIcon } from "./icons";

/**
 * Status-Chip (UI-AK-13): jeder Status mit Symbol und Text, Farben aus den Status-Tokens. Kein
 * Status ist allein an der Farbe zu erkennen.
 */
export const STATUS_STYLES: Record<
  ReportStatus,
  { className: string; Icon: (props: { className?: string }) => React.ReactNode }
> = {
  DRAFT: { className: "bg-draft-bg text-draft", Icon: PencilIcon },
  SUBMITTED: { className: "bg-submitted-bg text-submitted", Icon: ArrowUpIcon },
  APPROVED: { className: "bg-approved-bg text-approved", Icon: CheckIcon },
  REJECTED: { className: "bg-rejected-bg text-rejected", Icon: XCircleIcon },
};

const CHIP = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium whitespace-nowrap";

/**
 * `prefix` steht nur für Screenreader vor dem Text (z. B. „Status: “), damit der Chip auch ohne
 * Umgebung verständlich ist.
 */
export function StatusChip({ status, prefix, testId }: { status: ReportStatus; prefix?: string; testId?: string }) {
  const { className, Icon } = STATUS_STYLES[status];
  return (
    <span className={`${CHIP} ${className}`} data-status={status}>
      <Icon className="h-4 w-4" />
      <span data-testid={testId}>
        {prefix ? <span className="sr-only">{prefix}</span> : null}
        {STATUS_LABELS[status]}
      </span>
    </span>
  );
}

/** Hinweis-Chip „Überfällig“ (kein Status): offene Woche in der Vergangenheit. */
export function OverdueChip({ label = "Überfällig" }: { label?: string }) {
  return (
    <span className={`${CHIP} bg-overdue-bg text-overdue`}>
      <ClockIcon className="h-4 w-4" />
      {label}
    </span>
  );
}

/** Neutrales Etikett, z. B. Rolle, „deaktiviert“, „Vertretung“. */
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  children: React.ReactNode;
}) {
  const styles = {
    neutral: "bg-surface-muted text-fg",
    accent: "bg-accent-soft text-fg",
    success: "bg-approved-bg text-approved",
    warning: "bg-overdue-bg text-overdue",
    danger: "bg-rejected-bg text-rejected",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${styles}`}>
      {children}
    </span>
  );
}
