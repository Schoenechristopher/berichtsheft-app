/**
 * Benachrichtigungen und Erinnerung (AK-1001 – AK-1004, AK-1011 – AK-1015, AK-1021 – AK-1025, AK-205).
 *
 * Reine Funktionen ohne Abhängigkeit zu UI oder Datenbank: Wer bei welchem Ereignis welche
 * Nachricht über welchen Kanal bekommt, entscheidet allein dieses Modul. Der Server schreibt das
 * Ergebnis in die Outbox (Tabelle `notification`), der Worker versendet es.
 *
 * - Statuswechsel: `planTransitionNotifications` (Einreichen → zugeordneter Ausbilder; Freigabe,
 *   Ablehnung, Rücknahme → Azubi).
 * - Montags 9:00 Uhr: `planReminders` (Erinnerung an den Azubi, Information an den Ausbilder).
 * - Pro Ereignis, Empfänger und Kanal genau eine Zeile; der Ereignisschlüssel macht sie eindeutig.
 */
import type { ReportAction } from "./report-status";
import {
  APP_TIME_ZONE,
  classifyWeek,
  currentIsoWeek,
  today,
  type TrainingPeriod,
  type WeekForOverview,
} from "./report-generation";
import { compareWeeks, formatDate, isoWeekMonday, isoWeekOf, weekRangeLabel, type IsoWeek } from "./weeks";

/** Kanal einer Benachrichtigung (wie `Channel` im Datenmodell). */
export type Channel = "EMAIL" | "TEAMS" | "APP";

/** Alle Kanäle in fester Reihenfolge für Anzeige und Speicherung. */
export const CHANNELS: readonly Channel[] = ["EMAIL", "TEAMS", "APP"];

export const CHANNEL_LABELS: Record<Channel, string> = {
  EMAIL: "E-Mail",
  TEAMS: "Teams",
  APP: "App",
};

/** Voreinstellung für neue Personen (AK-1012). */
export const DEFAULT_CHANNELS: readonly Channel[] = ["EMAIL", "APP"];

/** Hinweis, wenn eine Person alle Kanäle abwählt (AK-1011, AK-1013). */
export const NO_CHANNEL_WARNING =
  "Ohne Kanal erhalten Sie keine Benachrichtigungen und auch keine Erinnerungen. Der Status Ihrer Berichte bleibt in der App sichtbar.";

/**
 * Kanäle aus einem Formular (AK-1011): jede Kombination ist erlaubt, auch keine. Doppelte werden
 * zusammengefasst; ein unbekannter Wert ergibt null (manipuliertes Formular).
 */
export function parseChannels(values: readonly string[]): Channel[] | null {
  if (values.some((value) => !(CHANNELS as readonly string[]).includes(value))) {
    return null;
  }
  return CHANNELS.filter((channel) => values.includes(channel));
}

/** Empfänger, soweit die Entscheidung ihn braucht. Kanäle zum Zeitpunkt des Ereignisses (AK-1014). */
export interface Recipient {
  id: string;
  name: string;
  active: boolean;
  channels: readonly Channel[];
}

/** Eine Zeile für die Outbox. */
export interface NotificationDraft {
  /** Fachlicher Schlüssel des Ereignisses; mit Empfänger und Kanal eindeutig (AK-1004). */
  eventKey: string;
  recipientId: string;
  channel: Channel;
  reportId: string | null;
  subject: string;
  /** Fertiger Text für E-Mail und Teams, mit vollständigen Links. */
  body: string;
  /** Pfad in der App (z. B. `/berichte/<id>`), Ziel des Links in der App. */
  link: string;
}

/** Inhalt einer Nachricht, bevor sie je Kanal vervielfältigt wird. */
interface Message {
  eventKey: string;
  reportId: string | null;
  subject: string;
  body: string;
  link: string;
}

/**
 * Eine Zeile pro gewähltem Kanal (AK-1013): ohne Kanal keine Zeile, deaktivierte Empfänger
 * bekommen nichts. Die Kanäle gelten so, wie sie beim Ereignis eingestellt sind (AK-1014).
 */
export function fanOut(recipient: Recipient | null | undefined, message: Message): NotificationDraft[] {
  if (!recipient || !recipient.active) {
    return [];
  }
  return CHANNELS.filter((channel) => recipient.channels.includes(channel)).map((channel) => ({
    ...message,
    recipientId: recipient.id,
    channel,
  }));
}

// ---------------------------------------------------------------------------
// Links und Text
// ---------------------------------------------------------------------------

/** Pfad der Berichtsseite. */
export function reportPath(reportId: string): string {
  return `/berichte/${reportId}`;
}

/** Vollständige Adresse aus Basis-URL (APP_URL) und Pfad. */
export function absoluteUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

/** Kurzer Text der Woche, z. B. „KW 41/2026“. */
export function shortWeek(week: IsoWeek): string {
  return `KW ${week.isoWeek}/${week.isoYear}`;
}

/** Woche mit Zeitraum, z. B. „KW 41/2026 (05.10.2026 – 09.10.2026)“. */
export function longWeek(week: IsoWeek): string {
  return `${shortWeek(week)} (${weekRangeLabel(week.isoYear, week.isoWeek)})`;
}

const FOOTER =
  "Diese Nachricht wurde automatisch von der Berichtsheft-App versendet. Ihre Kanäle für Benachrichtigungen stellen Sie in der App unter „Einstellungen“ ein.";

function composeBody(parts: { greeting: string; lines: string[]; facts: [string, string][]; links: string[] }) {
  const facts = parts.facts.map(([label, value]) => `${label}: ${value}`);
  return [`Hallo ${parts.greeting},`, "", ...parts.lines, "", ...facts, "", ...parts.links, "", FOOTER].join("\n");
}

// ---------------------------------------------------------------------------
// Statuswechsel (AK-1001 – AK-1003)
// ---------------------------------------------------------------------------

/** Anlass einer Benachrichtigung zu einem Statuswechsel. */
export type TransitionNotice = "SUBMITTED" | "RESUBMITTED" | "APPROVED" | "REJECTED" | "APPROVAL_REVOKED";

export const NOTICE_LABELS: Record<TransitionNotice, string> = {
  SUBMITTED: "Bericht eingereicht",
  RESUBMITTED: "Bericht erneut eingereicht",
  APPROVED: "Bericht freigegeben",
  REJECTED: "Bericht abgelehnt",
  APPROVAL_REVOKED: "Freigabe zurückgenommen",
};

/**
 * Welcher Statuswechsel eine Benachrichtigung auslöst. Zurückziehen nicht: Die Spezifikation nennt
 * es nicht als Anlass, und der Bericht verschwindet ohnehin aus der Prüfliste (Vorschlag zur Bestätigung).
 */
export function noticeFor(action: ReportAction): TransitionNotice | null {
  switch (action) {
    case "SUBMIT":
      return "SUBMITTED";
    case "RESUBMIT":
      return "RESUBMITTED";
    case "APPROVE":
      return "APPROVED";
    case "REJECT":
      return "REJECTED";
    case "REVOKE_APPROVAL":
      return "APPROVAL_REVOKED";
    case "WITHDRAW":
      return null;
  }
}

export interface TransitionNotificationInput {
  /** ID des Historieneintrags: macht das Ereignis eindeutig. */
  statusChangeId: string;
  action: ReportAction;
  report: IsoWeek & { id: string };
  /** Azubi des Berichts mit seinem zugeordneten Ausbilder (falls vorhanden). */
  trainee: Recipient & { trainer: Recipient | null };
  /** Wer den Statuswechsel ausgelöst hat. */
  actor: { name: string };
  /** Öffentliche Adresse der App (APP_URL). */
  baseUrl: string;
}

/**
 * Benachrichtigungen zu einem Statuswechsel:
 * - Einreichen (auch erneut) → nur der zugeordnete Ausbilder, keine Vertretung (AK-1001).
 * - Freigabe, Ablehnung, Rücknahme der Freigabe → der Azubi (AK-1002).
 * Jede nennt Azubi, Woche und Anlass und verlinkt den Bericht (AK-1003).
 */
export function planTransitionNotifications(input: TransitionNotificationInput): NotificationDraft[] {
  const notice = noticeFor(input.action);
  if (!notice) {
    return [];
  }
  const { report, trainee, actor } = input;
  const toTrainer = notice === "SUBMITTED" || notice === "RESUBMITTED";
  const recipient = toTrainer ? trainee.trainer : trainee;
  if (!recipient) {
    return [];
  }
  const anlass = NOTICE_LABELS[notice];
  const week = longWeek(report);
  const link = reportPath(report.id);
  const sentence: Record<TransitionNotice, string> = {
    SUBMITTED: `${trainee.name} hat den Wochenbericht ${week} eingereicht. Bitte prüfen Sie ihn.`,
    RESUBMITTED: `${trainee.name} hat den überarbeiteten Wochenbericht ${week} erneut eingereicht. Bitte prüfen Sie ihn.`,
    APPROVED: `${actor.name} hat Ihren Wochenbericht ${week} freigegeben.`,
    REJECTED: `${actor.name} hat Ihren Wochenbericht ${week} abgelehnt. Den Kommentar finden Sie im Bericht; bitte überarbeiten Sie ihn und reichen Sie ihn erneut ein.`,
    APPROVAL_REVOKED: `${actor.name} hat die Freigabe Ihres Wochenberichts ${week} zurückgenommen. Die Begründung finden Sie im Bericht; bitte überarbeiten Sie ihn und reichen Sie ihn erneut ein.`,
  };
  return fanOut(recipient, {
    eventKey: `status-change:${input.statusChangeId}`,
    reportId: report.id,
    subject: `${anlass}: ${trainee.name}, ${shortWeek(report)}`,
    body: composeBody({
      greeting: recipient.name,
      lines: [sentence[notice]],
      facts: [
        ["Anlass", anlass],
        ["Azubi", trainee.name],
        ["Woche", week],
      ],
      links: [`Zum Bericht: ${absoluteUrl(input.baseUrl, link)}`],
    }),
    link,
  });
}

// ---------------------------------------------------------------------------
// Erinnerung montags 9:00 Uhr (AK-1021 – AK-1025, AK-205)
// ---------------------------------------------------------------------------

/** Woche eines Azubis für die Erinnerung (wie in der Übersicht, mit Bericht-ID). */
export interface ReminderWeek extends WeekForOverview {
  reportId: string;
}

export interface ReminderTrainee extends Recipient {
  trainingStart: Date;
  trainingEnd: Date | null;
  /** Zugeordneter Ausbilder mit seinen Kanälen. */
  trainer: Recipient | null;
  weeks: readonly ReminderWeek[];
}

export interface ReminderInput {
  /** Stichtag (Montag 9:00 Uhr, aus dem Uhr-Modul). */
  now: Date;
  trainees: readonly ReminderTrainee[];
  baseUrl: string;
}

/** Offene Wochen eines Azubis zum Stichtag. */
export interface ReminderWeeks {
  /** Offen und vor der laufenden Woche: Grund für die Erinnerung an den Azubi (AK-1021, AK-1025). */
  open: ReminderWeek[];
  /** Davon schon am vorherigen Montag offen: Grund für die Information an den Ausbilder (AK-1022, AK-1024). */
  overdue: ReminderWeek[];
}

/**
 * Welche Wochen zum Stichtag offen sind. Nutzt die zentrale Definition „offen“ (`classifyWeek`):
 * Entwurf oder Abgelehnt, nicht ganz außerhalb der Ausbildung (AK-306); eingereichte und
 * freigegebene Wochen und die laufende Woche zählen nie (AK-1023).
 *
 * „Überfällig“ ist eine Woche, die schon am vorherigen Montag 9:00 Uhr vorbei war, also vor der
 * Vorwoche liegt. Da ein Bericht nur über das Einreichen offen bleibt bzw. nach Ablehnung oder
 * Rücknahme wieder offen ist, zählt der Status zum Stichtag (AK-1024: bis zur Einreichung).
 */
export function reminderWeeks(trainee: Pick<ReminderTrainee, "trainingStart" | "trainingEnd" | "weeks">, now: Date) {
  const current = currentIsoWeek(now);
  const previous = isoWeekOf(new Date(isoWeekMonday(current.isoYear, current.isoWeek).getTime() - 7 * 86_400_000));
  const period: TrainingPeriod = { start: trainee.trainingStart, end: trainee.trainingEnd };
  const open = trainee.weeks
    .filter((week) => classifyWeek(week, period, current).pastOpen)
    .sort((a, b) => compareWeeks(a, b));
  return { open, overdue: open.filter((week) => compareWeeks(week, previous) < 0) } satisfies ReminderWeeks;
}

/** Schlüssel der Montagswoche: Ein zweiter Lauf in derselben Woche erzeugt nichts Neues. */
function reminderKey(kind: "reminder" | "trainer-info", now: Date, traineeId: string): string {
  const week = currentIsoWeek(now);
  return `${kind}:${week.isoYear}-W${String(week.isoWeek).padStart(2, "0")}:${traineeId}`;
}

function weekList(weeks: readonly ReminderWeek[], baseUrl: string): string[] {
  return weeks.map((week) => `- ${longWeek(week)}: ${absoluteUrl(baseUrl, reportPath(week.reportId))}`);
}

function weeksSubject(weeks: readonly ReminderWeek[]): string {
  return weeks.length <= 3 ? weeks.map(shortWeek).join(", ") : `${weeks.length} Wochen, älteste ${shortWeek(weeks[0])}`;
}

/**
 * Erinnerung und Information zum Stichtag (montags 9:00 Uhr Europe/Berlin):
 * - Azubi: eine Nachricht mit allen offenen Wochen vor der laufenden (AK-1021, AK-1025).
 * - Zugeordneter Ausbilder: zusätzlich, sobald eine davon schon am vorherigen Montag offen war;
 *   jeden Montag erneut, bis eingereicht (AK-1022, AK-1024). Eine Nachricht pro Azubi.
 * - Nichts für deaktivierte Azubis (AK-205), Azubis ohne Kanal (AK-1013) oder ohne offene Woche.
 * Datum und Woche des Stichtags stecken im Ereignisschlüssel: doppelte Läufe erzeugen nichts doppelt.
 */
export function planReminders(input: ReminderInput): NotificationDraft[] {
  const drafts: NotificationDraft[] = [];
  for (const trainee of input.trainees) {
    if (!trainee.active) {
      continue;
    }
    const { open, overdue } = reminderWeeks(trainee, input.now);
    if (open.length === 0) {
      continue;
    }
    const single = open.length === 1;
    drafts.push(
      ...fanOut(trainee, {
        eventKey: reminderKey("reminder", input.now, trainee.id),
        reportId: single ? open[0].reportId : null,
        subject: `Erinnerung: ${single ? "Wochenbericht" : "Wochenberichte"} noch offen – ${weeksSubject(open)}`,
        body: composeBody({
          greeting: trainee.name,
          lines: [
            single
              ? "folgender Wochenbericht ist noch nicht eingereicht:"
              : `folgende ${open.length} Wochenberichte sind noch nicht eingereicht:`,
            ...weekList(open, input.baseUrl),
            "",
            "Bitte vervollständigen Sie sie und reichen Sie sie ein.",
          ],
          facts: [
            ["Anlass", "Erinnerung an offene Wochenberichte"],
            ["Azubi", trainee.name],
            ["Wochen", open.map(shortWeek).join(", ")],
          ],
          links: [`Zur Übersicht: ${absoluteUrl(input.baseUrl, "/azubi")}`],
        }),
        link: single ? reportPath(open[0].reportId) : "/azubi",
      }),
    );

    if (overdue.length === 0) {
      continue;
    }
    const overviewPath = `/ausbilder/azubis/${trainee.id}`;
    const oneOverdue = overdue.length === 1;
    drafts.push(
      ...fanOut(trainee.trainer, {
        eventKey: reminderKey("trainer-info", input.now, trainee.id),
        reportId: oneOverdue ? overdue[0].reportId : null,
        subject: `Information: ${trainee.name} – ${oneOverdue ? "Wochenbericht" : "Wochenberichte"} überfällig – ${weeksSubject(overdue)}`,
        body: composeBody({
          greeting: trainee.trainer?.name ?? "",
          lines: [
            `${trainee.name} hat ${oneOverdue ? "folgenden Wochenbericht" : "folgende Wochenberichte"} seit mehr als einer Woche nicht eingereicht:`,
            ...weekList(overdue, input.baseUrl),
            "",
            `${trainee.name} wurde heute ebenfalls erinnert.`,
          ],
          facts: [
            ["Anlass", "Wochenbericht überfällig"],
            ["Azubi", trainee.name],
            ["Wochen", overdue.map(shortWeek).join(", ")],
            ["Stichtag", formatDate(today(input.now))],
          ],
          links: [`Zur Übersicht von ${trainee.name}: ${absoluteUrl(input.baseUrl, overviewPath)}`],
        }),
        link: oneOverdue ? reportPath(overdue[0].reportId) : overviewPath,
      }),
    );
  }
  return drafts;
}

// ---------------------------------------------------------------------------
// Versand (AK-1004)
// ---------------------------------------------------------------------------

/**
 * Wartezeit vor dem nächsten Versuch nach `attempts` Fehlversuchen: 30 s, 1 min, 2 min, … höchstens 1 h.
 */
export function retryDelaySeconds(attempts: number): number {
  return Math.min(30 * 2 ** Math.max(attempts - 1, 0), 3600);
}

// ---------------------------------------------------------------------------
// Zeitplan der Erinnerung und Nachholen (bestätigte Auslegung 11)
// ---------------------------------------------------------------------------

/** Zeitpunkt (UTC) zur Uhrzeit `hour`:00 an einem Kalendertag in der Zeitzone der Firma. */
function zonedInstant(date: Date, hour: number): Date {
  const guess = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour));
  // Abstand der Zeitzone zu UTC an diesem Tag (Sommer- oder Winterzeit), aus der Ortszeit der Schätzung.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(guess);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const local = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"));
  return new Date(guess.getTime() - (local - guess.getTime()));
}

/** Zeitplan der Erinnerung in der Woche eines Zeitpunkts. */
export interface ReminderSchedule {
  /** Woche des Stichtags (laufende Woche). */
  week: IsoWeek;
  /** Stichtag: Montag dieser Woche, 9:00 Uhr Europe/Berlin. */
  dueAt: Date;
  /** Bis hier wird ein verpasster Lauf nachgeholt: Dienstag 23:59 Uhr (also vor Mittwoch 0:00 Uhr). */
  catchUpUntil: Date;
  /** Liegt der Zeitpunkt zwischen Stichtag und Ende des Nachholens? */
  due: boolean;
}

/**
 * Bestätigte Auslegung 11: Der Montags-Job läuft montags um 9:00 Uhr Europe/Berlin. Lief er nicht
 * (Worker oder Rechner aus), holt der Worker ihn einmal nach, sobald er zwischen Montag 9:00 Uhr
 * und Dienstag 23:59 Uhr derselben Woche läuft; Stichtag bleibt der Montag. Danach nicht mehr.
 */
export function reminderSchedule(now: Date): ReminderSchedule {
  const week = currentIsoWeek(now);
  const monday = isoWeekMonday(week.isoYear, week.isoWeek);
  const dueAt = zonedInstant(monday, 9);
  const catchUpUntil = zonedInstant(new Date(monday.getTime() + 2 * 86_400_000), 0);
  return { week, dueAt, catchUpUntil, due: now >= dueAt && now < catchUpUntil };
}
