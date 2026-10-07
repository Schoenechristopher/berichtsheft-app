/**
 * Zeitstempel bei einem Datenbank-Server in Europe/Berlin (wie im Compose-Stack): Die App liest
 * Zeitstempel richtig, egal ob Prisma, `now()` oder Roh-SQL sie geschrieben hat – im Verlauf
 * (AK-801), beim Freigabevermerk im PDF (AK-903) und bei nicht zustellbaren Nachrichten.
 * Ohne feste Verbindungszeitzone UTC (`createPrismaClient`) wären sie um zwei Stunden verschoben.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { now, resetClock, setFixedNow } from "@/domain/clock";
import { formatDateTime } from "@/domain/report-history";
import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/lib/db";
import { listUndeliverable } from "@/lib/notifications/service";
import { loadWeekExport } from "@/lib/report-export";
import { transitionReport } from "@/lib/report-transitions";
import { ensureReportsForTrainee, loadReportHistory } from "@/lib/reports";
import { renderReportPdf } from "@/pdf/render";
import { extractPdfText } from "../pdf-text";
import { createPersons, resetDatabase } from "./helpers";

const url = process.env.TEST_DATABASE_URL as string;

/** Stellt die Zeitzone der Test-Datenbank für neue Verbindungen um (wie TZ im Server-Container). */
async function setDatabaseTimeZone(zone: string | null) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(
      zone
        ? `DO $$ BEGIN EXECUTE format('ALTER DATABASE %I SET timezone = %L', current_database(), '${zone}'); END $$`
        : `DO $$ BEGIN EXECUTE format('ALTER DATABASE %I RESET timezone', current_database()); END $$`,
    );
  } finally {
    await client.end();
  }
}

/** Roh-SQL über eine eigene Verbindung, deren Sitzung in der Server-Zeitzone läuft. */
async function rawQuery<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return (await client.query(sql, params)).rows as T[];
  } finally {
    await client.end();
  }
}

let prisma: PrismaClient;
type Persons = Awaited<ReturnType<typeof createPersons>>;
let persons: Persons;

beforeAll(async () => {
  await setDatabaseTimeZone("Europe/Berlin");
  // Erst danach verbinden: neue Verbindungen bekommen die Server-Zeitzone Europe/Berlin.
  prisma = createPrismaClient(url);
});

afterAll(async () => {
  resetClock();
  await resetDatabase(prisma);
  await prisma.$disconnect();
  await setDatabaseTimeZone(null);
});

beforeEach(async () => {
  resetClock();
  await resetDatabase(prisma);
  await prisma.setting.create({ data: { id: 1, federalState: "NW" } });
  setFixedNow("2026-10-06T10:00:00+02:00");
  persons = await createPersons(prisma);
  await ensureReportsForTrainee(prisma, persons.anna.id, now());
});

/** Annas Bericht KW 40/2026 einreichen und von Bernd am 07.10.2026 um 14:05 Uhr freigeben lassen. */
async function submitAndApprove() {
  const report = await prisma.weeklyReport.findFirstOrThrow({ where: { traineeId: persons.anna.id, isoWeek: 40 } });
  await prisma.reportDay.updateMany({
    where: { reportId: report.id, outsideTraining: false },
    data: { dayType: "WORK", activities: "Netzwerk geplant" },
  });
  expect((await transitionReport(prisma, persons.anna, report.id, { action: "SUBMIT" })).ok).toBe(true);
  setFixedNow("2026-10-07T14:05:00+02:00");
  expect((await transitionReport(prisma, persons.bernd, report.id, { action: "APPROVE" })).ok).toBe(true);
  return report;
}

describe("Zeitstempel bei Datenbank-Server in Europe/Berlin", () => {
  it("Voraussetzung: Der Server läuft in Europe/Berlin, die Verbindungen der App in UTC", async () => {
    expect(await rawQuery("SHOW timezone")).toEqual([{ TimeZone: "Europe/Berlin" }]);
    expect(await prisma.$queryRaw`SHOW timezone`).toEqual([{ TimeZone: "UTC" }]);
  });

  it("AK-801 AK-603 Freigabe: in der Datenbank der richtige Zeitpunkt, im Verlauf 14:05 Uhr", async () => {
    const report = await submitAndApprove();
    const [stored] = await rawQuery<{ utc: string }>(
      "SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') AS utc FROM status_change WHERE to_status = 'APPROVED'",
    );
    expect(stored.utc).toBe("2026-10-07 12:05");

    const { changes } = await loadReportHistory(prisma, report.id);
    const approval = changes.find((change) => change.toStatus === "APPROVED");
    expect(approval?.createdAt.toISOString()).toBe("2026-10-07T12:05:00.000Z");
    expect(formatDateTime(approval!.createdAt)).toBe("07.10.2026, 14:05 Uhr");
  });

  it("AK-903 Freigabevermerk im PDF mit der richtigen Uhrzeit", async () => {
    const report = await submitAndApprove();
    const result = await loadWeekExport(prisma, persons.anna, report.id, now());
    if (!result.ok) throw new Error(result.message);
    const pdf = await extractPdfText(await renderReportPdf(result.document));
    expect(pdf.text).toContain("Freigegeben von Bernd am 07.10.2026, 14:05 Uhr");
  });

  it("AK-801 Ablehnung per Roh-SQL und mit now() geschrieben: im Verlauf richtig gelesen", async () => {
    const report = await prisma.weeklyReport.findFirstOrThrow({ where: { traineeId: persons.anna.id, isoWeek: 40 } });
    // Roh-SQL mit Zeitpunkt samt Zeitzone, dann eine Ablehnung mit dem Datenbank-Default now().
    await rawQuery(
      `INSERT INTO status_change (id, report_id, from_status, to_status, actor_id, review_round, created_at)
       VALUES (gen_random_uuid(), $1, 'DRAFT', 'SUBMITTED', $2, 1, '2026-10-07T09:30:00+02:00')`,
      [report.id, persons.anna.id],
    );
    const [inserted] = await rawQuery<{ epoch: string }>(
      `INSERT INTO status_change (id, report_id, from_status, to_status, actor_id, review_round, reason)
       VALUES (gen_random_uuid(), $1, 'SUBMITTED', 'REJECTED', $2, 1, NULL)
       RETURNING extract(epoch FROM created_at)::text AS epoch`,
      [report.id, persons.bernd.id],
    );

    const { changes } = await loadReportHistory(prisma, report.id);
    expect(changes.map((change) => change.toStatus)).toEqual(["SUBMITTED", "REJECTED"]);
    expect(changes[0].createdAt.toISOString()).toBe("2026-10-07T07:30:00.000Z");
    expect(formatDateTime(changes[0].createdAt)).toBe("07.10.2026, 09:30 Uhr");
    expect(changes[1].createdAt.getTime()).toBe(Math.round(Number(inserted.epoch) * 1000));
  });

  it("Nicht zustellbare Nachrichten: per Roh-SQL gesetzter letzter Versuch richtig gelesen", async () => {
    await rawQuery(
      `INSERT INTO notification (id, event_key, recipient_id, channel, subject, body, attempts, last_error, failed_at)
       VALUES (gen_random_uuid(), 'tz-test', $1, 'EMAIL', 'Betreff', 'Text', 8, 'Fehler', '2026-10-06T10:00:00+02:00')`,
      [persons.bernd.id],
    );
    const [item] = (await listUndeliverable(prisma, persons.clara)) ?? [];
    expect(item.failedAt?.toISOString()).toBe("2026-10-06T08:00:00.000Z");
    expect(formatDateTime(item.failedAt!)).toBe("06.10.2026, 10:00 Uhr");
  });

  it("Gegenprobe: Ohne Verbindungszeitzone UTC läse der Adapter um zwei Stunden verschoben", async () => {
    await rawQuery(
      `INSERT INTO reminder_run (iso_year, iso_week, ran_at) VALUES (1999, 1, '2026-10-06T10:00:00+02:00')`,
    );
    const unprotected = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
    try {
      const read = await unprotected.reminderRun.findFirstOrThrow({ where: { isoYear: 1999 } });
      expect(read.ranAt.toISOString()).toBe("2026-10-06T10:00:00.000Z");
    } finally {
      await unprotected.$disconnect();
    }
    const correct = await prisma.reminderRun.findFirstOrThrow({ where: { isoYear: 1999 } });
    expect(correct.ranAt.toISOString()).toBe("2026-10-06T08:00:00.000Z");
  });
});
