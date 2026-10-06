import Link from "next/link";
import { reportStatusLabel, type ReportStatus } from "@/domain/report-access";
import { isPastOpen } from "@/domain/report-generation";
import { compareWeeks, weekRangeLabel, type IsoWeek } from "@/domain/weeks";
import { Badge } from "@/components/ui";

const STATUS_TONES: Record<ReportStatus, "slate" | "blue" | "green" | "amber"> = {
  DRAFT: "slate",
  SUBMITTED: "blue",
  APPROVED: "green",
  REJECTED: "amber",
};

/**
 * Übersicht aller Wochen eines Azubis (AK-306): neueste zuerst, mit KW, Zeitraum und Status.
 * Offene Wochen in der Vergangenheit („Entwurf“ oder „Abgelehnt“ vor der aktuellen Woche) sind
 * deutlich hervorgehoben.
 */
export function WeekOverview({
  reports,
  currentWeek,
}: {
  reports: (IsoWeek & { id: string; status: ReportStatus })[];
  currentWeek: IsoWeek;
}) {
  if (reports.length === 0) {
    return <p className="text-sm text-slate-600">Noch keine Wochenberichte – sie entstehen ab Ausbildungsbeginn.</p>;
  }
  const pastOpen = reports.filter((report) => isPastOpen(report, currentWeek)).length;

  return (
    <div className="space-y-3">
      {pastOpen > 0 ? (
        <p role="status" className="rounded-md bg-amber-50 p-3 text-sm font-medium text-amber-900">
          {pastOpen === 1 ? "1 vergangene Woche ist noch offen." : `${pastOpen} vergangene Wochen sind noch offen.`}
        </p>
      ) : null}
      <ul className="space-y-2" aria-label="Wochenberichte">
        {reports.map((report) => {
          const highlight = isPastOpen(report, currentWeek);
          const current = compareWeeks(report, currentWeek) === 0;
          return (
            <li key={report.id} data-testid="week-row" data-past-open={highlight ? "true" : undefined}>
              <Link
                href={`/berichte/${report.id}`}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 hover:border-blue-400 ${
                  highlight ? "border-l-8 border-amber-400 bg-amber-50" : "border-slate-200 bg-white"
                }`}
              >
                <span className="min-w-0">
                  <span className="block font-medium text-blue-800">
                    KW {report.isoWeek}/{report.isoYear}
                    {current ? <span className="ml-2 text-sm font-normal text-slate-600">aktuelle Woche</span> : null}
                  </span>
                  <span className="block text-sm text-slate-600">{weekRangeLabel(report.isoYear, report.isoWeek)}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  {highlight ? <Badge tone="amber">noch offen</Badge> : null}
                  <Badge tone={STATUS_TONES[report.status]}>{reportStatusLabel(report.status)}</Badge>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
