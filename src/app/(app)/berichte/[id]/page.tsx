import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ACCESS_DENIED_MESSAGE, canViewReport } from "@/domain/report-access";
import { homePathFor } from "@/domain/access";
import { BackLink } from "@/components/ui";
import { isUuid } from "@/lib/ids";
import { getCurrentPerson, requirePerson } from "@/lib/session";
import { ReportView, loadReport } from "./ReportView";

/**
 * Browser-Titel „KW 41/2026 – Berichtsheft“ (UI-AK-19). Fremde Berichte heißen „Zugriff
 * verweigert“, unbekannte erzeugen die Seite „Seite nicht gefunden“ – der Titel verrät nichts.
 */
export async function generateMetadata({ params }: PageProps<"/berichte/[id]">): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getCurrentPerson();
  const report = viewer && isUuid(id) ? await loadReport(id) : null;
  if (!viewer || !report) {
    return { title: "Wochenbericht" };
  }
  return { title: canViewReport(viewer, report) ? `KW ${report.isoWeek}/${report.isoYear}` : ACCESS_DENIED_MESSAGE };
}

/**
 * Bericht ansehen, erfassen, einreichen und prüfen. Azubis sehen nur eigene Berichte, fremde ergeben
 * „Zugriff verweigert“ (AK-103); Ausbilder sehen alle (AK-105). Unter 1024 px öffnet die Prüfliste
 * diese Seite mit derselben Entscheidungsleiste und „← Prüfliste“ (UI-AK-12).
 */
export default async function ReportPage({ params }: PageProps<"/berichte/[id]">) {
  const viewer = await requirePerson();
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const report = await loadReport(id);
  if (!report) {
    notFound();
  }

  if (!canViewReport(viewer, report)) {
    return (
      <section className="mx-auto max-w-[1120px] space-y-3">
        <h1 className="text-2xl font-semibold">{ACCESS_DENIED_MESSAGE}</h1>
        <p className="text-fg-muted">Sie können nur Ihre eigenen Berichte ansehen.</p>
        <BackLink href={homePathFor(viewer.role)}>Zur Startseite</BackLink>
      </section>
    );
  }

  const back =
    viewer.role === "TRAINEE"
      ? { href: "/azubi/wochen", label: "Zurück zu Meine Wochen" }
      : report.status === "SUBMITTED"
        ? { href: "/ausbilder/pruefliste", label: "Prüfliste" }
        : { href: `/ausbilder/azubis/${report.traineeId}`, label: `Zurück zu ${report.trainee.name}` };

  return (
    <section className="space-y-3">
      <BackLink href={back.href}>{back.label}</BackLink>
      <ReportView report={report} viewer={viewer} />
    </section>
  );
}
