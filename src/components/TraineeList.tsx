import { formatDateTime } from "@/domain/report-history";
import { Badge, DataList, DataRow, OverdueChip, RowLink } from "@/components/ui";
import { trainingPeriod } from "@/lib/people/labels";
import type { TraineeWithProgress } from "@/lib/trainee-overview";

const GRID = "md:grid-cols-[minmax(10rem,1.2fr)_minmax(10rem,1fr)_minmax(8rem,auto)_minmax(9rem,auto)]";

/**
 * Azubis mit Fortschritt (UI-Spezifikation „Start Ausbilder“, „Azubis“): Azubi,
 * Ausbildungszeitraum, offene Wochen und letzte Einreichung; die Zeile führt zu den Wochen des
 * Azubis.
 */
export function TraineeList({ trainees }: { trainees: TraineeWithProgress[] }) {
  return (
    <DataList
      label="Azubis"
      grid={GRID}
      columns={[
        { label: "Azubi", sort: "asc" },
        { label: "Ausbildung" },
        { label: "Offene Wochen" },
        { label: "Letzte Einreichung" },
      ]}
    >
      {trainees.map((trainee) => (
        <DataRow
          key={trainee.id}
          grid={GRID}
          highlight={trainee.pastOpen > 0 ? "warning" : undefined}
          data-testid="trainee-row"
        >
          <span className="min-w-0 space-y-1">
            <RowLink href={`/ausbilder/azubis/${trainee.id}`} className="block break-words">
              {trainee.name}
            </RowLink>
            <span className="text-fg-muted block text-sm">
              {trainee.approved} von {trainee.weeks} Wochen freigegeben
              {trainee.trainerName ? ` · zugeordnet ${trainee.trainerName}` : ""}
            </span>
            {trainee.active ? null : <Badge>deaktiviert</Badge>}
          </span>
          <span className="text-sm tabular-nums">
            <span className="text-fg-muted md:hidden">Ausbildung: </span>
            {trainingPeriod(trainee.trainingStart, trainee.trainingEnd)}
          </span>
          <span>
            {trainee.pastOpen > 0 ? (
              <OverdueChip label={trainee.pastOpen === 1 ? "1 überfällig" : `${trainee.pastOpen} überfällig`} />
            ) : (
              <span className="text-fg-muted text-sm">keine</span>
            )}
          </span>
          <span className="text-fg-muted text-sm tabular-nums">
            <span className="md:hidden">Letzte Einreichung: </span>
            {trainee.lastSubmittedAt ? formatDateTime(trainee.lastSubmittedAt) : "–"}
          </span>
        </DataRow>
      ))}
    </DataList>
  );
}
