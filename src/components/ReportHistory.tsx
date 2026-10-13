import { reportStatusLabel } from "@/domain/report-access";
import { changeLabel, formatDateTime, type HistoryRound } from "@/domain/report-history";
import { formatDate, weekdayLong } from "@/domain/weeks";
import { ChevronDownIcon } from "@/components/ui/icons";

/**
 * Verlauf eines Berichts (AK-801, AK-802): alle Statuswechsel mit Datum, Uhrzeit, Person, neuem
 * Status und Begründung sowie alle Kommentare, nach Prüfrunde gruppiert (neueste zuerst). Unter den
 * Tagen ausklappbar „Verlauf (4 Einträge)“. Nur Anzeige – bearbeiten oder löschen lässt sich nichts
 * davon (AK-803).
 */
export function ReportHistory({ rounds }: { rounds: HistoryRound[] }) {
  const entries = rounds.reduce(
    (sum, round) => sum + round.changes.length + round.overall.length + round.days.length,
    0,
  );
  return (
    <section aria-label="Verlauf" className="rounded-card border-border bg-surface border">
      <details className="group">
        <summary className="rounded-card hover:bg-surface-muted flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
          <h2 className="text-lg">Verlauf ({entries === 1 ? "1 Eintrag" : `${entries} Einträge`})</h2>
          <ChevronDownIcon className="h-5 w-5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-border border-t p-4">
          {rounds.length === 0 ? (
            <p className="text-fg-muted text-sm">
              Noch keine Statuswechsel – der Bericht wurde noch nicht eingereicht.
            </p>
          ) : (
            <ol className="space-y-4" aria-label="Prüfrunden">
              {rounds.map((round) => (
                <li key={round.round} data-testid="history-round" className="space-y-2">
                  <h3 className="font-medium">
                    {round.round === 0 ? "Vor der ersten Einreichung" : `Runde ${round.round}`}
                  </h3>
                  <ul className="space-y-1 text-sm" aria-label={`Statuswechsel Runde ${round.round}`}>
                    {round.changes.map((change) => (
                      <li
                        key={change.id}
                        data-testid="history-change"
                        data-von={change.fromStatus ?? undefined}
                        data-nach={change.toStatus}
                        data-zeitpunkt={change.createdAt.toISOString()}
                        data-person={change.actorName}
                        className="break-words"
                      >
                        <span className="text-fg-muted tabular-nums">{formatDateTime(change.createdAt)}</span> ·{" "}
                        <span className="font-medium">{changeLabel(change)}</span> von {change.actorName} → Status „
                        {reportStatusLabel(change.toStatus)}“
                        {change.reason ? (
                          <span className="text-fg-muted block whitespace-pre-wrap">Begründung: {change.reason}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {round.overall.length + round.days.length > 0 ? (
                    <ul className="space-y-1 text-sm" aria-label={`Kommentare Runde ${round.round}`}>
                      {[...round.overall, ...round.days].map((comment) => (
                        <li
                          key={comment.id}
                          data-testid="history-comment"
                          className="bg-surface-muted rounded-md p-2 break-words whitespace-pre-wrap"
                        >
                          <span className="font-medium">
                            {comment.dayDate
                              ? `Kommentar zu ${weekdayLong(comment.dayDate)}, ${formatDate(comment.dayDate)}`
                              : "Gesamtkommentar"}{" "}
                            ({comment.authorName}):
                          </span>{" "}
                          {comment.text}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </details>
    </section>
  );
}
