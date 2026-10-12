import { CheckIcon, InboxIcon } from "./icons";

/**
 * Leerzustand (UI-AK-20): ein Satz, was hier erscheinen wird, und wenn sinnvoll ein Knopf.
 */
export function EmptyState({
  children,
  action,
  done = false,
  testId,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  /** „Alles erledigt“: Haken statt Ablage. */
  done?: boolean;
  testId?: string;
}) {
  const Icon = done ? CheckIcon : InboxIcon;
  return (
    <div
      data-empty-state=""
      className="rounded-card border-border flex flex-col items-center gap-3 border border-dashed px-4 py-8 text-center"
    >
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${done ? "bg-approved-bg text-approved" : "bg-surface-muted text-fg-muted"}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-fg-muted max-w-prose" data-testid={testId}>
        {children}
      </p>
      {action}
    </div>
  );
}
