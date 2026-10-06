/**
 * Layout des Berichtsheft-PDF (AK-901 – AK-907) mit @react-pdf/renderer.
 *
 * Daten rein, Dokument raus: Die Komponente kennt weder Datenbank noch Routen. Was gedruckt wird
 * (Vermerk, Kennzeichnung, Tagesart), entscheidet `src/domain/report-pdf.ts`. Jede Woche ist eine
 * eigene `Page` und beginnt damit auf einer neuen Seite; lange Wochen laufen über mehrere Seiten.
 * Kopf- und Fußzeile wiederholen sich auf jeder Seite der Woche.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PdfDocument, PdfWeek } from "@/domain/report-pdf";
import { PDF_FONT_FAMILY } from "./fonts";

const colors = {
  text: "#0f172a",
  muted: "#475569",
  border: "#cbd5e1",
  outside: "#f1f5f9",
  approved: "#166534",
  approvedBg: "#f0fdf4",
  notApproved: "#b91c1c",
  notApprovedBg: "#fef2f2",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 10,
    color: colors.text,
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },
  header: {
    position: "absolute",
    top: 22,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: colors.muted,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingBottom: 4,
  },
  headerNotApproved: { color: colors.notApproved, fontWeight: "bold" },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: colors.muted,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 4,
  },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 6 },
  facts: { marginBottom: 8 },
  factRow: { flexDirection: "row" },
  factLabel: { width: 110, color: colors.muted },
  factValue: { flex: 1 },
  marking: { borderWidth: 1.5, borderRadius: 3, padding: 8, marginBottom: 10 },
  markingApproved: { borderColor: colors.approved, backgroundColor: colors.approvedBg, color: colors.approved },
  markingNotApproved: {
    borderColor: colors.notApproved,
    backgroundColor: colors.notApprovedBg,
    color: colors.notApproved,
  },
  markingTitle: { fontSize: 12, fontWeight: "bold" },
  note: { fontSize: 9, marginTop: 2 },
  outsideWeek: { backgroundColor: colors.outside, padding: 6, marginBottom: 10, color: colors.muted },
  day: { borderTopWidth: 0.5, borderTopColor: colors.border, paddingVertical: 6 },
  dayOutside: { backgroundColor: colors.outside, color: colors.muted, paddingHorizontal: 4 },
  dayHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  dayLabel: { fontWeight: "bold" },
  dayType: { textAlign: "right", marginLeft: 8 },
  empty: { color: colors.muted },
});

/** Kopf- und Fußzeile, auf jeder Seite (fixed). */
function PageFrame({
  left,
  right,
  notApproved,
  createdAt,
}: {
  left: string;
  right: string;
  notApproved: boolean;
  createdAt: string;
}) {
  return (
    <>
      <View style={styles.header} fixed>
        <Text>{left}</Text>
        <Text style={notApproved ? styles.headerNotApproved : undefined}>{right}</Text>
      </View>
      <View style={styles.footer} fixed>
        <Text>Erstellt am {createdAt}</Text>
        <Text render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`} />
      </View>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function WeekPage({ week, createdAt }: { week: PdfWeek; createdAt: string }) {
  const approved = week.marking.kind === "APPROVED";
  return (
    <Page size="A4" style={styles.page}>
      <PageFrame
        left={`Berichtsheft · ${week.traineeName}`}
        right={`${week.title} · ${week.marking.short}`}
        notApproved={!approved}
        createdAt={createdAt}
      />
      <Text style={styles.title}>Wochenbericht {week.title}</Text>
      <View style={styles.facts}>
        <Fact label="Azubi" value={week.traineeName} />
        <Fact label="Kalenderwoche" value={week.title} />
        <Fact label="Zeitraum" value={`${week.range} (Montag bis Freitag)`} />
        <Fact label="Status" value={week.statusLabel} />
      </View>
      <View style={[styles.marking, approved ? styles.markingApproved : styles.markingNotApproved]} wrap={false}>
        <Text style={styles.markingTitle}>{approved ? "Freigabevermerk" : week.marking.text}</Text>
        <Text style={styles.note}>
          {approved
            ? week.marking.text
            : "Dieser Wochenbericht ist nicht vom Ausbilder freigegeben und gilt nicht als Nachweis."}
        </Text>
      </View>
      {week.outsideTraining ? (
        <Text style={styles.outsideWeek}>Diese Woche liegt ganz außerhalb der Ausbildung.</Text>
      ) : null}
      {week.days.map((day) => (
        <View key={day.label} style={[styles.day, day.outsideTraining ? styles.dayOutside : {}]}>
          <View style={styles.dayHead} wrap={false}>
            <Text style={styles.dayLabel}>{day.label}</Text>
            <Text style={styles.dayType}>{day.dayTypeLabel}</Text>
          </View>
          {day.activities.trim() === "" ? (
            <Text style={styles.empty}>Keine Tätigkeiten eingetragen.</Text>
          ) : (
            <Text>{day.activities}</Text>
          )}
        </View>
      ))}
    </Page>
  );
}

function EmptyPage({ data }: { data: PdfDocument }) {
  return (
    <Page size="A4" style={styles.page}>
      <PageFrame left={`Berichtsheft · ${data.traineeName}`} right="" notApproved={false} createdAt={data.createdAt} />
      <Text style={styles.title}>Berichtsheft {data.traineeName}</Text>
      <Text>Im Zeitraum {data.rangeLabel ?? ""} gibt es keine Wochenberichte.</Text>
    </Page>
  );
}

/** Das ganze Dokument: eine Woche oder alle Wochen eines Zeitraums, jede ab einer neuen Seite. */
export function ReportPdf({ data }: { data: PdfDocument }) {
  return (
    <Document
      title={data.title}
      author="Berichtsheft-App"
      creator="Berichtsheft-App"
      producer="Berichtsheft-App"
      language="de-DE"
    >
      {data.weeks.length === 0 ? (
        <EmptyPage data={data} />
      ) : (
        data.weeks.map((week) => (
          <WeekPage key={`${week.isoYear}-${week.isoWeek}`} week={week} createdAt={data.createdAt} />
        ))
      )}
    </Document>
  );
}
