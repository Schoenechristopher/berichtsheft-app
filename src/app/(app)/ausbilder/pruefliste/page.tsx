import type { Metadata } from "next";
import { canViewReport } from "@/domain/report-access";
import { formatDateTime } from "@/domain/report-history";
import { isoWeekCode, weekRangeLabel } from "@/domain/weeks";
import { EmptyState, SegmentLinks } from "@/components/ui";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { listReviewQueue, type ReviewScope } from "@/lib/reports";
import { requirePerson } from "@/lib/session";
import { ReportView, loadReport } from "../../berichte/[id]/ReportView";
import { ReviewQueueList } from "./ReviewQueueList";

export const metadata: Metadata = { title: "Prüfliste" };

/**
 * Prüfansicht (AK-601, UI-Spezifikation „Prüfansicht“): eingereichte Berichte mit Azubi, Woche und
 * Einreichungsdatum, älteste zuerst. Standardmäßig die eigenen Azubis, mit dem Filter „Alle Azubis“
 * auch die anderer Ausbilder (Vertretung, AK-602). Ab 1024 px geteilt: links die Liste (360 px,
 * eigener Bildlauf), rechts der ausgewählte Bericht aus der Adresse (`?bericht=<id>`, UI-AK-10).
 * Nach Freigeben oder Ablehnen geht es automatisch zum nächsten Bericht der Liste (UI-AK-11).
 * Nur für Ausbilder (AK-104).
 */
export default async function ReviewQueuePage({ searchParams }: PageProps<"/ausbilder/pruefliste">) {
  const viewer = await requirePerson("TRAINER");
  const params = await searchParams;
  const scope: ReviewScope = params.filter === "alle" ? "all" : "mine";
  const reports = await listReviewQueue(db(), viewer, scope);
  const filterQuery = scope === "all" ? "filter=alle&" : "";
  const requested = typeof params.bericht === "string" && isUuid(params.bericht) ? params.bericht : null;
  const selected = requested ? await loadReport(requested) : null;
  const index = reports.findIndex((report) => report.id === requested);
  const next = index >= 0 ? (reports[index + 1] ?? reports[index - 1] ?? null) : null;
  const listHref = `/ausbilder/pruefliste${scope === "all" ? "?filter=alle" : ""}`;
  const nextHref = next ? `/ausbilder/pruefliste?${filterQuery}bericht=${next.id}` : listHref;

  return (
    <div className="space-y-4 lg:-mx-8 lg:-my-8 lg:grid lg:h-[calc(100dvh-var(--header-height))] lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-0 lg:space-y-0">
      <section
        aria-label="Prüfliste"
        data-bereich="pruefliste"
        className="lg:border-border lg:bg-surface min-h-0 space-y-4 lg:overflow-y-auto lg:border-r lg:py-6"
      >
        <div className="space-y-4 lg:px-4">
          <h1 className="text-2xl font-semibold">Prüfliste</h1>
          <SegmentLinks
            label="Filter"
            items={[
              { href: "/ausbilder/pruefliste", label: "Meine Azubis", active: scope === "mine" },
              { href: "/ausbilder/pruefliste?filter=alle", label: "Alle Azubis", active: scope === "all" },
            ]}
          />
        </div>
        {reports.length === 0 ? (
          <div className="lg:px-4">
            <EmptyState testId="review-queue-empty">
              {scope === "mine"
                ? "Keine Berichte Ihrer Azubis zur Prüfung. Berichte anderer Azubis (Vertretung) zeigt der Filter „Alle Azubis“."
                : "Keine Berichte zur Prüfung."}
            </EmptyState>
          </div>
        ) : (
          <ReviewQueueList
            selectedId={requested}
            filterQuery={filterQuery}
            items={reports.map((report) => ({
              id: report.id,
              traineeName: report.trainee.name,
              week: `KW ${report.isoWeek}/${report.isoYear}`,
              isoWeek: isoWeekCode(report.isoYear, report.isoWeek),
              range: weekRangeLabel(report.isoYear, report.isoWeek),
              submittedAt: formatDateTime(report.submittedAt),
              resubmitted: report.resubmitted,
              substitute: !report.assignedToViewer,
              traineeInactive: !report.trainee.active,
            }))}
          />
        )}
      </section>
      <section
        aria-label="Ausgewählter Bericht"
        data-bereich="bericht_ansicht"
        className="hidden min-h-0 lg:block lg:overflow-y-auto lg:px-8 lg:pt-6"
      >
        {selected && canViewReport(viewer, selected) ? (
          <ReportView key={selected.id} report={selected} viewer={viewer} headingLevel={2} nextHref={nextHref} />
        ) : requested ? (
          <p className="text-fg-muted py-8">Bericht nicht gefunden.</p>
        ) : reports.length > 0 ? (
          <p className="text-fg-muted py-8">Bericht in der Liste auswählen.</p>
        ) : null}
      </section>
    </div>
  );
}
