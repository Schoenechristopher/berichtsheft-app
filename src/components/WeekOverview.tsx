import type { ReportStatus } from "@/domain/report-access";
import { OPEN_STATUSES } from "@/domain/report-status";
import { compareWeeks, weekRangeLabel, type IsoWeek } from "@/domain/weeks";
import {
  Badge,
  DataList,
  DataRow,
  EmptyState,
  Notice,
  OverdueChip,
  RowLink,
  SegmentLinks,
  StatusChip,
} from "@/components/ui";

/** Filter von Meine Wochen (UI-Spezifikation): Alle / Offen / Eingereicht / Freigegeben. */
export type WeekFilter = "alle" | "offen" | "eingereicht" | "freigegeben";

export const WEEK_FILTERS: { value: WeekFilter; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "offen", label: "Offen" },
  { value: "eingereicht", label: "Eingereicht" },
  { value: "freigegeben", label: "Freigegeben" },
];

export function parseWeekFilter(value: unknown): WeekFilter {
  return WEEK_FILTERS.some((filter) => filter.value === value) ? (value as WeekFilter) : "alle";
}

function matchesFilter(status: ReportStatus, filter: WeekFilter): boolean {
  switch (filter) {
    case "offen":
      return OPEN_STATUSES.includes(status);
    case "eingereicht":
      return status === "SUBMITTED";
    case "freigegeben":
      return status === "APPROVED";
    default:
      return true;
  }
}

const GRID = "md:grid-cols-[minmax(9rem,12rem)_1fr_auto]";

/**
 * Wochenliste eines Azubis (AK-306, UI-Spezifikation „Meine Wochen“): neueste zuerst, mit KW,
 * Zeitraum und Status; offene Wochen in der Vergangenheit („Entwurf“ oder „Abgelehnt“ vor der
 * aktuellen Woche) sind mit linker Kante und „Überfällig“ hervorgehoben. Wochen ganz außerhalb der
 * Ausbildung sind markiert und zählen nicht als offen; die Einordnung kommt aus `classifyWeek`
 * (Service `listTraineeWeeks`). Filter als Segment-Auswahl über die Adresse (`?status=`).
 */
export function WeekOverview({
  reports,
  currentWeek,
  filter,
  basePath,
}: {
  reports: (IsoWeek & { id: string; status: ReportStatus; pastOpen: boolean; outsideTraining: boolean })[];
  currentWeek: IsoWeek;
  filter: WeekFilter;
  basePath: string;
}) {
  if (reports.length === 0) {
    return <EmptyState>Noch keine Wochenberichte – sie entstehen ab Ausbildungsbeginn.</EmptyState>;
  }
  const pastOpen = reports.filter((report) => report.pastOpen).length;
  const shown = reports.filter((report) => matchesFilter(report.status, filter));

  return (
    <div className="space-y-4">
      {pastOpen > 0 ? (
        <Notice tone="warning" role="status">
          <p className="font-medium">
            {pastOpen === 1 ? "1 vergangene Woche ist noch offen." : `${pastOpen} vergangene Wochen sind noch offen.`}
          </p>
        </Notice>
      ) : null}
      <SegmentLinks
        label="Filter"
        items={WEEK_FILTERS.map((item) => ({
          href: item.value === "alle" ? basePath : `${basePath}?status=${item.value}`,
          label: item.label,
          active: item.value === filter,
        }))}
      />
      {shown.length === 0 ? (
        <EmptyState>Keine Wochen mit diesem Status.</EmptyState>
      ) : (
        <DataList
          label="Wochenberichte"
          grid={GRID}
          columns={[
            { label: "KW", sort: "desc" },
            { label: "Zeitraum" },
            { label: "Status", className: "md:text-right" },
          ]}
        >
          {shown.map((report) => {
            const current = compareWeeks(report, currentWeek) === 0;
            return (
              <DataRow
                key={report.id}
                grid={GRID}
                highlight={report.pastOpen ? "warning" : undefined}
                data-testid="week-row"
                data-past-open={report.pastOpen ? "true" : undefined}
                data-outside-training={report.outsideTraining ? "true" : undefined}
              >
                <span className="min-w-0 tabular-nums">
                  <RowLink href={`/berichte/${report.id}`}>
                    KW {report.isoWeek}/{report.isoYear}
                  </RowLink>
                  {current ? <span className="text-fg-muted ml-2 text-sm">aktuelle Woche</span> : null}
                </span>
                <span className="text-fg-muted text-sm tabular-nums">
                  {weekRangeLabel(report.isoYear, report.isoWeek)}
                </span>
                <span className="flex flex-wrap items-center gap-2 md:justify-end">
                  {report.pastOpen ? <OverdueChip /> : null}
                  {report.outsideTraining ? <Badge>außerhalb der Ausbildung</Badge> : null}
                  <StatusChip status={report.status} />
                </span>
              </DataRow>
            );
          })}
        </DataList>
      )}
    </div>
  );
}
