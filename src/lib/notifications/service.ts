/**
 * Benachrichtigungen auf dem Server: Outbox schreiben (Statuswechsel und Erinnerung), Glocke und
 * Liste (AK-1015), eigene Kanäle einstellen (AK-1011). Wer was bekommt, entscheiden die reinen
 * Funktionen in `src/domain/notifications.ts`; „jetzt“ übergibt der Aufrufer aus dem Uhr-Modul.
 */
import {
  parseChannels,
  planReminders,
  planTransitionNotifications,
  reminderSchedule,
  type NotificationDraft,
  type ReminderTrainee,
} from "@/domain/notifications";
import type { ReportAction } from "@/domain/report-status";
import { canManagePeople, type Viewer } from "@/domain/report-access";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { isUuid } from "@/lib/ids";
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
    // `about` steckt in Betreff und Text und wird nicht eigens gespeichert.
    data: drafts.map(({ eventKey, recipientId, channel, reportId, subject, body, link }) => ({
      eventKey,
      recipientId,
      channel,
      reportId,
      subject,
      body,
      link,
      createdAt: now,
      nextAttemptAt: now,
      sentAt: channel === "APP" ? now : null,
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
export async function loadReminderTrainees(prisma: Db): Promise<ReminderTrainee[]> {
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

export type DueRemindersResult =
  { ran: true; created: number } | { ran: false; reason: "nicht-faellig" | "schon-erledigt" };

/**
 * Montags-Job mit Nachholen (bestätigte Auslegung 11): läuft nur zwischen Montag 9:00 Uhr und
 * Dienstag 23:59 Uhr Europe/Berlin und nur einmal pro Woche – egal ob pünktlich per Zeitplan,
 * beim Start des Workers oder bei der regelmäßigen Prüfung. Stichtag ist immer der Montag 9:00 Uhr
 * dieser Woche. Die Woche wird in `reminder_run` vermerkt, in derselben Transaktion wie die
 * Benachrichtigungen; ein gleichzeitiger zweiter Lauf wartet auf den Vermerk und tut dann nichts.
 */
export async function runDueReminders(
  prisma: PrismaClient,
  options: { now: Date; baseUrl: string },
): Promise<DueRemindersResult> {
  const schedule = reminderSchedule(options.now);
  if (!schedule.due) {
    return { ran: false, reason: "nicht-faellig" };
  }
  await ensureReportsForAllTrainees(prisma, options.now);
  return prisma.$transaction(async (tx): Promise<DueRemindersResult> => {
    const marked = await tx.reminderRun.createMany({
      data: [{ ...schedule.week, ranAt: options.now }],
      skipDuplicates: true,
    });
    if (marked.count === 0) {
      return { ran: false, reason: "schon-erledigt" };
    }
    const drafts = planReminders({
      now: schedule.dueAt,
      trainees: await loadReminderTrainees(tx),
      baseUrl: options.baseUrl,
    });
    const created = await insertNotifications(tx, drafts, options.now);
    await tx.reminderRun.update({
      where: { isoYear_isoWeek: schedule.week },
      data: { created },
    });
    return { ran: true, created };
  });
}

/** Zahl ungelesener App-Benachrichtigungen für die Glocke (AK-1015). */
export async function countUnread(prisma: PrismaClient, personId: string): Promise<number> {
  return prisma.notification.count({ where: { recipientId: personId, channel: "APP", readAt: null } });
}

/**
 * Vorschau der Glocke (UI-Spezifikation „Glocke“): die letzten App-Benachrichtigungen, neueste
 * zuerst. Markiert nichts als gelesen – das tut erst die Liste (AK-1015).
 */
export async function previewNotifications(prisma: PrismaClient, personId: string, take = 5) {
  const notifications = await prisma.notification.findMany({
    where: { recipientId: personId, channel: "APP" },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take,
    select: { id: true, subject: true, link: true, createdAt: true, readAt: true },
  });
  return notifications.map(({ readAt, ...item }) => ({ ...item, unread: readAt === null }));
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
 * Ausbilder alle – wie sonst auch alle Berichte (`docs/01`, „Teams in der Demo“, Etappe 7).
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

/** Fester Grund, aus dem das Speichern der Kanäle scheitert (unabhängig vom Meldungstext). */
export type ChannelsFailureReason = "forbidden" | "unknown-channel";

export type ChannelsResult = { ok: true } | { ok: false; reason: ChannelsFailureReason; formError: string };

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
    return { ok: false, reason: "forbidden", formError: "Zugriff verweigert" };
  }
  const channels = parseChannels(values);
  if (!channels) {
    return { ok: false, reason: "unknown-channel", formError: "Unbekannter Kanal." };
  }
  await prisma.person.update({ where: { id: viewer.id }, data: { channels } });
  return { ok: true };
}

/** Nur aktive Ausbilder sehen nicht zustellbare Nachrichten (bestätigte Auslegung 12). */
const UNDELIVERABLE = { failedAt: { not: null }, sentAt: null } as const;

/** Zahl nicht zustellbarer Nachrichten für den Hinweis bei Ausbildern; für alle anderen 0. */
export async function countUndeliverable(prisma: PrismaClient, viewer: Viewer): Promise<number> {
  return canManagePeople(viewer) ? prisma.notification.count({ where: UNDELIVERABLE }) : 0;
}

/**
 * Nicht zustellbare Nachrichten (bestätigte Auslegung 12): E-Mail und Teams, die der Worker
 * aufgegeben hat – nach zu vielen Fehlversuchen oder weil der Empfänger deaktiviert ist. Mit
 * Empfänger, Kanal, Anlass, Zeitpunkt des letzten Versuchs und Fehlermeldung. Nur für Ausbilder;
 * sonst null.
 */
export async function listUndeliverable(prisma: PrismaClient, viewer: Viewer, take = 200) {
  if (!canManagePeople(viewer)) {
    return null;
  }
  return prisma.notification.findMany({
    where: UNDELIVERABLE,
    orderBy: [{ failedAt: "desc" }, { id: "asc" }],
    take,
    select: {
      id: true,
      channel: true,
      subject: true,
      link: true,
      attempts: true,
      lastError: true,
      failedAt: true,
      recipient: { select: { name: true, email: true, active: true } },
    },
  });
}

/** Fester Grund, aus dem „Erneut versuchen“ scheitert (unabhängig vom Meldungstext). */
export type RetryFailureReason = "forbidden" | "not-found" | "not-retryable";

export type RetryResult = { ok: true } | { ok: false; reason: RetryFailureReason; formError: string };

/**
 * „Erneut versuchen“: Der Worker nimmt die Nachricht beim nächsten Durchlauf wieder auf, mit neuer
 * Zählung der Versuche. Nur Ausbilder, nur aufgegebene Nachrichten; deaktivierte Empfänger nicht,
 * weil an sie ohnehin nichts versendet wird.
 */
export async function retryUndeliverable(
  prisma: PrismaClient,
  viewer: Viewer,
  notificationId: string,
  now: Date,
): Promise<RetryResult> {
  if (!canManagePeople(viewer)) {
    return { ok: false, reason: "forbidden", formError: "Zugriff verweigert" };
  }
  if (!isUuid(notificationId)) {
    return { ok: false, reason: "not-found", formError: "Nachricht nicht gefunden." };
  }
  const { count } = await prisma.notification.updateMany({
    where: { id: notificationId, ...UNDELIVERABLE, recipient: { active: true } },
    data: { failedAt: null, attempts: 0, nextAttemptAt: now },
  });
  return count === 1
    ? { ok: true }
    : {
        ok: false,
        reason: "not-retryable",
        formError: "Die Nachricht kann nicht erneut versendet werden (bereits erledigt oder Empfänger deaktiviert).",
      };
}
