import { AlertIcon, CheckIcon, ClockIcon, InfoIcon } from "./icons";

export type NoticeTone = "info" | "warning" | "error" | "success";

const TONES: Record<NoticeTone, { className: string; Icon: (props: { className?: string }) => React.ReactNode }> = {
  info: { className: "border-border bg-surface-muted text-fg", Icon: InfoIcon },
  warning: { className: "border-overdue/40 bg-overdue-bg text-overdue", Icon: ClockIcon },
  error: { className: "border-rejected/40 bg-rejected-bg text-rejected", Icon: AlertIcon },
  success: { className: "border-approved/40 bg-approved-bg text-approved", Icon: CheckIcon },
};

/**
 * Hinweisleiste (Info, Warnung, Fehler, Erfolg) oben im Inhalt, z. B. Ablehnungskommentar,
 * „Schreibgeschützt“, „Keine Kanäle gewählt“. Fehler werden als `alert` vorgelesen, Erfolg als
 * `status`; Warnung und Info sind Teil der Seite (`role` bei Bedarf über `role`).
 */
export function Notice({
  tone,
  title,
  children,
  role,
  action,
  testId,
}: {
  tone: NoticeTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  role?: "alert" | "status" | "note" | null;
  action?: React.ReactNode;
  testId?: string;
}) {
  const { className, Icon } = TONES[tone];
  const ariaRole =
    role === null ? undefined : (role ?? (tone === "error" ? "alert" : tone === "success" ? "status" : undefined));
  return (
    <div
      role={ariaRole}
      data-testid={testId}
      className={`flex flex-wrap items-start gap-x-3 gap-y-2 rounded-md border p-3 text-sm ${className}`}
    >
      <Icon className="mt-0.5 h-5 w-5" />
      <div className="min-w-0 flex-1 space-y-1 break-words">
        {title ? <p className="font-medium">{title}</p> : null}
        {children}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
