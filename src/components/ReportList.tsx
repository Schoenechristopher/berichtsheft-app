import Link from "next/link";
import { reportStatusLabel, type ReportStatus } from "@/domain/report-access";
import { weekLabel } from "@/domain/weeks";

/** Einfache Liste von Berichten mit Link zur Berichtsansicht. */
export function ReportList({
  reports,
  showTrainee,
}: {
  reports: {
    id: string;
    isoYear: number;
    isoWeek: number;
    status: ReportStatus;
    trainee: { name: string; active: boolean };
  }[];
  showTrainee: boolean;
}) {
  if (reports.length === 0) {
    return <p className="text-sm text-slate-600">Noch keine Berichte.</p>;
  }
  return (
    <ul className="space-y-2" aria-label="Berichte">
      {reports.map((report) => (
        <li key={report.id}>
          <Link
            href={`/berichte/${report.id}`}
            className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-blue-400"
          >
            {showTrainee ? (
              <span className="block text-sm text-slate-600">
                {report.trainee.name}
                {report.trainee.active ? "" : " (deaktiviert)"}
              </span>
            ) : null}
            <span className="font-medium text-blue-800">{weekLabel(report.isoYear, report.isoWeek)}</span>
            <span className="block text-sm text-slate-600">{reportStatusLabel(report.status)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
