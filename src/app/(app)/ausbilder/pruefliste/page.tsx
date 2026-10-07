import type { Metadata } from "next";
import Link from "next/link";
import { formatDateTime } from "@/domain/report-history";
import { weekRangeLabel } from "@/domain/weeks";
import { Badge } from "@/components/ui";
import { db } from "@/lib/db";
import { listReviewQueue, type ReviewScope } from "@/lib/reports";
import { requirePerson } from "@/lib/session";

export const metadata: Metadata = { title: "Prüfliste" };

/**
 * Prüfliste (AK-601): eingereichte Berichte mit Azubi, Woche und Einreichungsdatum, älteste zuerst.
 * Standardmäßig die eigenen Azubis, mit dem Filter „Alle Azubis“ auch die anderer Ausbilder
 * (Vertretung, AK-602). Nur für Ausbilder (AK-104).
 */
export default async function ReviewQueuePage({ searchParams }: PageProps<"/ausbilder/pruefliste">) {
  const viewer = await requirePerson("TRAINER");
  const scope: ReviewScope = (await searchParams).filter === "alle" ? "all" : "mine";
  const reports = await listReviewQueue(db(), viewer, scope);
  const filterClass = (active: boolean) =>
    `rounded-md border px-3 py-1.5 text-sm font-medium ${
      active ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
    }`;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Prüfliste</h1>
      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        <Link
          href="/ausbilder/pruefliste"
          aria-current={scope === "mine" ? "page" : undefined}
          className={filterClass(scope === "mine")}
        >
          Meine Azubis
        </Link>
        <Link
          href="/ausbilder/pruefliste?filter=alle"
          aria-current={scope === "all" ? "page" : undefined}
          className={filterClass(scope === "all")}
        >
          Alle Azubis
        </Link>
      </nav>
      {reports.length === 0 ? (
        <p className="text-sm text-slate-600" data-testid="review-queue-empty">
          {scope === "mine"
            ? "Keine Berichte Ihrer Azubis zur Prüfung. Berichte anderer Azubis (Vertretung) zeigt der Filter „Alle Azubis“."
            : "Keine Berichte zur Prüfung."}
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Eingereichte Berichte">
          {reports.map((report) => (
            <li key={report.id} data-testid="review-row">
              <Link
                href={`/berichte/${report.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-blue-400"
              >
                <span className="block font-medium break-words text-blue-800">{report.trainee.name}</span>
                <span className="block text-sm text-slate-700">
                  KW {report.isoWeek}/{report.isoYear} · {weekRangeLabel(report.isoYear, report.isoWeek)}
                </span>
                <span className="block text-sm text-slate-600">
                  eingereicht am {formatDateTime(report.submittedAt)}
                </span>
                <span className="mt-1 flex flex-wrap gap-2">
                  {report.assignedToViewer ? null : <Badge tone="slate">Vertretung</Badge>}
                  {report.trainee.active ? null : <Badge tone="slate">deaktiviert</Badge>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
