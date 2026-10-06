import { reportStatusLabel } from "@/domain/report-access";
import { changeLabel, formatDateTime, type HistoryRound } from "@/domain/report-history";
import { formatDate, weekdayLong } from "@/domain/weeks";

/**
 * Historie eines Berichts (AK-801, AK-802): alle Statuswechsel mit Datum, Uhrzeit, Person, neuem
 * Status und Begründung sowie alle Kommentare, nach Prüfrunde gruppiert (neueste zuerst). Nur
 * Anzeige – bearbeiten oder löschen lässt sich nichts davon (AK-803).
 */
export function ReportHistory({ rounds }: { rounds: HistoryRound[] }) {
  return (
    <section aria-labelledby="history-heading" className="space-y-3">
      <h2 id="history-heading" className="text-lg font-semibold">
        Verlauf
      </h2>
      {rounds.length === 0 ? (
        <p className="text-sm text-slate-600">Noch keine Statuswechsel – der Bericht wurde noch nicht eingereicht.</p>
      ) : (
        <ol className="space-y-3" aria-label="Prüfrunden">
          {rounds.map((round) => (
            <li
              key={round.round}
              data-testid="history-round"
              className="space-y-2 rounded-lg border border-slate-200 bg-white p-3"
            >
              <h3 className="font-medium">
                {round.round === 0 ? "Vor der ersten Einreichung" : `Runde ${round.round}`}
              </h3>
              <ul className="space-y-1 text-sm" aria-label={`Statuswechsel Runde ${round.round}`}>
                {round.changes.map((change) => (
                  <li key={change.id} data-testid="history-change" className="break-words">
                    <span className="text-slate-600">{formatDateTime(change.createdAt)}</span> ·{" "}
                    <span className="font-medium">{changeLabel(change)}</span> von {change.actorName} → Status „
                    {reportStatusLabel(change.toStatus)}“
                    {change.reason ? (
                      <span className="block whitespace-pre-wrap text-slate-700">Begründung: {change.reason}</span>
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
                      className="rounded-md bg-slate-50 p-2 break-words whitespace-pre-wrap"
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
    </section>
  );
}
