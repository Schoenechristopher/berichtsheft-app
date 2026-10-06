/**
 * Benachrichtigungen auf dem Server: Outbox schreiben (Statuswechsel und Erinnerung), Glocke und
 * Liste (AK-1015), eigene Kanäle einstellen (AK-1011). Wer was bekommt, entscheiden die reinen
 * Funktionen in `src/domain/notifications.ts`; „jetzt“ übergibt der Aufrufer aus dem Uhr-Modul.
 */
import {
  parseChannels,
  planReminders,
  planTransitionNotifications,
  type NotificationDraft,
  type ReminderTrainee,
} from "@/domain/notifications";
import type { ReportAction } from "@/domain/report-status";
import type { Viewer } from "@/domain/report-access";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { ensureReportsForAllTrainees } from "@/lib/reports";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Schreibt Entwürfe in die Outbox. Doppelte (gleiches Ereignis, Empfänger und Kanal) überspringt
 * die Datenbank (AK-1004). App-Benachrichtigungen haben keinen Versand und gelten sofort als zugestellt.
 */
export async function insertNotifications(db: Db, drafts: readonly NotificationDraft[], now: Date): Promise<number> {
  if (drafts.length === 0) {
    return 0;
  }
  const { count } = await db.notification.createMany({
    data: drafts.map((draft) => ({
      ...draft,
      createdAt: now,
      nextAttemptAt: now,
      sentAt: draft.channel === "APP" ? now : null,
    })),
    skipDuplicates: true,
  });
  return count;
}

const recipientSelect = { id: true, name: true, active: true, channels: true } as const;

/** Ereignis eines Statuswechsels, wie `transitionReport` es meldet. */
export interface StatusChangeEvent {
  statusChangeId: string;
  action: ReportAction;
  reportId: string;
  actorId: string;
}

/**
 * Benachrichtigungen zu einem Statuswechsel, in derselben Transaktion wie der Wechsel: Scheitert
 * er, entsteht auch keine Nachricht. Kanäle und Aktivität der Empfänger gelten wie zum Zeitpunkt
 * des Ereignisses (AK-1014).
 */
export async function recordTransitionNotifications(
  tx: Prisma.TransactionClient,
  event: StatusChangeEvent,
  options: { now: Date; baseUrl: string },
): Promise<number> {
  const report = await tx.weeklyReport.findUniqueOrThrow({
    where: { id: event.reportId },
    select: {
      id: true,
      isoYear: true,
      isoWeek: true,
      trainee: { select: { ...recipientSelect, trainer: { select: recipientSelect } } },
    },
  });
  const actor = await tx.person.findUniqueOrThrow({ where: { id: event.actorId }, select: { name: true } });
  const drafts = planTransitionNotifications({
    statusChangeId: event.statusChangeId,
    action: event.action,
    report,
    trainee: report.trainee,
    actor,
    baseUrl: options.baseUrl,
  });
  return insertNotifications(tx, drafts, options.now);
}

/**
 * Wochen aller aktiven Azubis für die Erinnerung, so eingeordnet wie in der Übersicht (AK-306).
 * Deaktivierte Azubis sind nie dabei (AK-205).
 */
export async function loadReminderTrainees(prisma: PrismaClient): Promise<ReminderTrainee[]> {
  const trainees = await prisma.person.findMany({
    where: { role: "TRAINEE", active: true, trainingStart: { not: null } },
    select: {
      ...recipientSelect,
      trainingStart: true,
      trainingEnd: true,
      trainer: { select: recipientSelect },
      reports: {
        select: {
          id: true,
          isoYear: true,
          isoWeek: true,
          status: true,
          days: { select: { dayType: true, activities: true } },
          _count: { select: { statusChanges: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
  return trainees.map(({ reports, trainingStart, ...trainee }) => ({
    ...trainee,
    trainingStart: trainingStart as Date,
    weeks: reports.map(({ id, days, _count, ...week }) => ({
      ...week,
      reportId: id,
      hasContent: days.some((day) => day.dayType !== null || day.activities !== ""),
      hasHistory: _count.statusChanges > 0,
    })),
  }));
}

/**
 * Montags-Job (AK-1021 – AK-1025): fehlende Wochen ergänzen, dann Erinnerungen und Informationen
 * in die Outbox schreiben. Ein zweiter Lauf am selben Montag erzeugt nichts doppelt.
 */
export async function runWeeklyReminders(
  prisma: PrismaClient,
  options: { now: Date; baseUrl: string },
): Promise<{ created: number }> {
  await ensureReportsForAllTrainees(prisma, options.now);
  const drafts = planReminders({
    now: options.now,
    trainees: await loadReminderTrainees(prisma),
    baseUrl: options.baseUrl,
  });
  return { created: await insertNotifications(prisma, drafts, options.now) };
}

/** Zahl ungelesener App-Benachrichtigungen für die Glocke (AK-1015). */
export async function countUnread(prisma: PrismaClient, personId: string): Promise<number> {
  return prisma.notification.count({ where: { recipientId: personId, channel: "APP", readAt: null } });
}

/**
 * Eigene App-Benachrichtigungen, neueste zuerst (AK-1015). Das Öffnen der Liste markiert alle
 * ungelesenen als gelesen; `unread` sagt, welche der angezeigten bis eben ungelesen waren.
 */
export async function openNotifications(prisma: PrismaClient, personId: string, now: Date, take = 50) {
  const notifications = await prisma.notification.findMany({
    where: { recipientId: personId, channel: "APP" },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take,
    select: { id: true, subject: true, body: true, link: true, createdAt: true, readAt: true },
  });
  await prisma.notification.updateMany({
    where: { recipientId: personId, channel: "APP", readAt: null },
    data: { readAt: now },
  });
  return notifications.map(({ readAt, ...item }) => ({ ...item, unread: readAt === null }));
}

/**
 * Entwickler-Postfach (simulierter Kanal „Teams“): Azubis sehen ihre eigenen Nachrichten,
 * Ausbilder alle – wie sonst auch alle Berichte (Vorschlag zur Bestätigung).
 */
export async function listDevMailbox(prisma: PrismaClient, viewer: Viewer, take = 100) {
  if (!viewer.active) {
    return [];
  }
  return prisma.teamsDevMessage.findMany({
    where: viewer.role === "TRAINER" ? {} : { recipientId: viewer.id },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take,
    include: { recipient: { select: { name: true } } },
  });
}

export type ChannelsResult = { ok: true } | { ok: false; formError: string };

/**
 * Eigene Kanäle speichern (AK-1011): jede Kombination aus E-Mail, Teams und App, auch keine.
 * Jede Person ändert nur ihre eigenen; sie gelten ab dem nächsten Ereignis (AK-1014).
 */
export async function updateOwnChannels(
  prisma: PrismaClient,
  viewer: Viewer,
  values: readonly string[],
): Promise<ChannelsResult> {
  if (!viewer.active) {
    return { ok: false, formError: "Zugriff verweigert" };
  }
  const channels = parseChannels(values);
  if (!channels) {
    return { ok: false, formError: "Unbekannter Kanal." };
  }
  await prisma.person.update({ where: { id: viewer.id }, data: { channels } });
  return { ok: true };
}
