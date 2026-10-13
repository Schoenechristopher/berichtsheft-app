import type { ReportStatus } from "@/domain/report-access";
import { isoWeekCode, type IsoWeek } from "@/domain/weeks";
import { progressLabel, type WeekProgress } from "@/domain/week-progress";
import { ButtonLink, type ButtonVariant } from "./button";
import { Card } from "./card";
import { OverdueChip, StatusChip } from "./status-chip";

/**
 * Wochen-Kachel (aktuelle oder offene Woche): KW, Zeitraum, Status-Chip, fünf Tagesmarken,
 * Fortschritt „3 von 5 Tagen ausgefüllt“ und genau ein Knopf.
 */
export function WeekTile({
  eyebrow,
  title,
  range,
  status,
  overdue,
  progress,
  href,
  actionLabel,
  actionVariant = "primary",
  note,
  large = false,
  headingLevel = 2,
  testId,
  week,
}: {
  eyebrow?: string;
  /** „KW 41/2026“ */
  title: string;
  /** „05.10.–09.10.“ */
  range: string;
  status: ReportStatus;
  overdue?: boolean;
  progress: WeekProgress;
  href: string;
  actionLabel: string;
  actionVariant?: ButtonVariant;
  /** z. B. erste Zeile des Ablehnungskommentars */
  note?: React.ReactNode;
  large?: boolean;
  headingLevel?: 2 | 3;
  testId?: string;
  /** Woche als fester Merker `data-woche` (`JJJJ-Www`) für die Prüffälle. */
  week?: IsoWeek;
}) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  return (
    <Card
      as="article"
      highlight={status === "REJECTED" ? "danger" : overdue ? "warning" : large ? "accent" : undefined}
      className="space-y-4"
      data-testid={testId}
      data-woche={week ? isoWeekCode(week.isoYear, week.isoWeek) : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="text-fg-muted text-sm font-medium">{eyebrow}</p> : null}
          <Heading className={`font-semibold tabular-nums ${large ? "text-3xl" : "text-lg"}`}>
            {title}
            <span className="sr-only">, </span>
            <span className={`text-fg-muted block font-normal ${large ? "text-base" : "text-sm"}`}>{range}</span>
          </Heading>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusChip status={status} />
          {overdue ? <OverdueChip /> : null}
        </div>
      </div>
      {note ? <div className="text-sm break-words">{note}</div> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <ol className="flex gap-1.5" aria-label="Tage">
            {progress.days.map((day) => (
              <li
                key={day.date.toISOString()}
                className={`flex h-9 w-9 items-center justify-center rounded-md border text-xs font-medium ${
                  day.mark === "filled"
                    ? "border-accent bg-accent text-on-accent"
                    : day.mark === "outside"
                      ? "border-border bg-surface-muted text-fg-muted border-dashed"
                      : "border-border-strong bg-surface text-fg"
                }`}
              >
                <span aria-hidden="true">{day.weekday}</span>
                <span className="sr-only">
                  {day.weekday}:{" "}
                  {day.mark === "filled" ? "ausgefüllt" : day.mark === "outside" ? "außerhalb der Ausbildung" : "leer"}
                </span>
              </li>
            ))}
          </ol>
          <p className="text-fg-muted text-sm tabular-nums" data-testid="week-progress">
            {progressLabel(progress)}
          </p>
        </div>
        <ButtonLink href={href} variant={actionVariant}>
          {actionLabel}
          <span className="sr-only"> – {title}</span>
        </ButtonLink>
      </div>
    </Card>
  );
}
