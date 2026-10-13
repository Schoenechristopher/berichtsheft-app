/**
 * TypeScript-Adapter für die neutralen Prüffälle (`specs/pruefung/format.md`): bildet die neutralen
 * Schnittstellen auf die Funktionen der App ab und wandelt Ein- und Ausgabeformate um. Er deutet kein
 * Ergebnis um; fachliche Fehler werden über ihre Fehlerart auf die festen Fehlercodes abgebildet.
 */
import { InvalidInstantError, clockFromEnvironment, now } from "@/domain/clock";
import { FEDERAL_STATES, UnknownFederalStateError, isFederalState } from "@/domain/federal-states";
import { isPublicHoliday, publicHolidays } from "@/domain/holidays";
import type { ReportStatus } from "@/domain/report-access";
import { DAY_TYPES, DAY_TYPE_LABELS, validateDayInputs, type DayInput } from "@/domain/report-days";
import {
  classifyWeek,
  correctOutsideTraining,
  planReportDays,
  weeksDue,
  type DayType,
  type StoredDay,
  type TrainingPeriod,
} from "@/domain/report-generation";
import { isOpenStatus } from "@/domain/report-status";
import {
  APP_TIME_ZONE,
  InvalidIsoWeekError,
  compareWeeks,
  currentIsoWeek,
  isoWeekMonday,
  isoWeekOf,
  isoWeekWorkdays,
  nextIsoWeek,
  toDateInput,
  today,
  weekdayShort,
  type IsoWeek,
} from "@/domain/weeks";

import { decideAccess, matchLogin, type LoginCandidate, type Role } from "@/domain/access";
import {
  checkDeactivate,
  checkDelete,
  checkFederalStateSetting,
  checkReactivate,
  checkUpdate,
  confirmsName,
  validatePerson,
  type PersonField,
  type PersonSnapshot,
  type RuleReason,
  type RuleResult,
} from "@/domain/people";
import { canManagePeople, canViewReport, type Viewer } from "@/domain/report-access";

import { canEditReport } from "@/domain/report-access";
import {
  availableActions,
  decideTransition,
  reviewRoundFor,
  type ReportAction,
  type TransitionReason,
} from "@/domain/report-status";
import { validateSubmission, type SubmissionProblem } from "@/domain/report-submission";

import { safeReturnPath } from "@/domain/access";
import {
  DEFAULT_CHANNELS,
  TRAINEE_HOME_PATH,
  parseChannels,
  planReminders,
  planTransitionNotifications,
  reminderSchedule,
  reportPath,
  retryDelaySeconds,
  traineeOverviewPath,
  type Channel,
  type NotificationDraft,
  type NotificationTopic,
  type Recipient,
  type ReminderTrainee,
} from "@/domain/notifications";

export type Input = Record<string, unknown>;
export type Result = Record<string, unknown>;

/** Fehler im Prüffall selbst (Format, fehlendes Feld): lässt den Fall scheitern, ist nie ein Fehlercode. */
export class CaseFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaseFormatError";
  }
}

/** Feste Fehlercodes aus `format.md` je Fehlerart der App. */
const ERROR_CODES: [new (...args: never[]) => Error, string][] = [
  [InvalidIsoWeekError, "woche_ungueltig"],
  [UnknownFederalStateError, "bundesland_unbekannt"],
  [InvalidInstantError, "zeitpunkt_ungueltig"],
];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?[+-]\d{2}:\d{2}$/;
const WEEK = /^(\d{4})-W(\d{2})$/;

export function field(input: Input, name: string): unknown {
  if (!(name in input)) {
    throw new CaseFormatError(`Eingabe „${name}“ fehlt.`);
  }
  return input[name];
}

export function text(input: Input, name: string): string {
  const value = field(input, name);
  if (typeof value !== "string") {
    throw new CaseFormatError(`Eingabe „${name}“ muss Text sein.`);
  }
  return value;
}

export function integer(input: Input, name: string): number {
  const value = field(input, name);
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new CaseFormatError(`Eingabe „${name}“ muss eine ganze Zahl sein.`);
  }
  return value;
}

/** `JJJJ-MM-TT` → UTC-Mitternacht (Kalendertag der App). */
export function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00Z`);
  if (!DATE.test(value) || Number.isNaN(date.getTime()) || toDateInput(date) !== value) {
    throw new CaseFormatError(`Kein Kalendertag im Format JJJJ-MM-TT: ${value}`);
  }
  return date;
}

/** Zeitpunkt nach ISO 8601 mit Offset. */
export function parseInstant(value: string): Date {
  const instant = new Date(value);
  if (!INSTANT.test(value) || Number.isNaN(instant.getTime())) {
    throw new CaseFormatError(`Kein Zeitpunkt nach ISO 8601 mit Offset: ${value}`);
  }
  return instant;
}

/** `JJJJ-Www` → Jahr und Woche; ob es die Woche gibt, entscheidet die App. */
export function parseWeek(value: string): IsoWeek {
  const match = WEEK.exec(value);
  if (!match) {
    throw new CaseFormatError(`Keine Woche im Format JJJJ-Www: ${value}`);
  }
  return { isoYear: Number(match[1]), isoWeek: Number(match[2]) };
}

export function formatWeek(week: IsoWeek): string {
  return `${week.isoYear}-W${String(week.isoWeek).padStart(2, "0")}`;
}

/** Zeitpunkt in Berliner Ortszeit mit Offset, z. B. `2026-10-12T09:00:00+02:00`. */
export function formatInstant(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const local = `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}`;
  const offsetMinutes = Math.round((Date.parse(`${local}Z`) - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  return `${local}${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

export function bool(input: Input, name: string): boolean {
  const value = field(input, name);
  if (typeof value !== "boolean") {
    throw new CaseFormatError(`Eingabe „${name}“ muss ein Wahrheitswert sein.`);
  }
  return value;
}

export function object(input: Input, name: string): Input {
  const value = field(input, name);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CaseFormatError(`Eingabe „${name}“ muss ein Objekt sein.`);
  }
  return value as Input;
}

export function objectOrNull(input: Input, name: string): Input | null {
  return field(input, name) === null ? null : object(input, name);
}

export function textOrNull(input: Input, name: string): string | null {
  return field(input, name) === null ? null : text(input, name);
}

// ---------------------------------------------------------------------------
// M02 Personen und Zugang
// ---------------------------------------------------------------------------

/** Rollen der Prüffälle (`azubi`, `ausbilder`) und der App. */
const ROLES: Record<string, Role> = { azubi: "TRAINEE", ausbilder: "TRAINER" };
const ROLE_NAMES: Record<Role, string> = { TRAINEE: "azubi", TRAINER: "ausbilder" };

function role(input: Input, name: string): Role {
  const value = text(input, name);
  if (!Object.hasOwn(ROLES, value)) {
    throw new CaseFormatError(`Rolle muss „azubi“ oder „ausbilder“ sein: ${value}`);
  }
  return ROLES[value];
}

/** Person für Zugriffsprüfungen: `{ schluessel, rolle, aktiv }`. */
function viewer(input: Input): Viewer {
  return { id: text(input, "schluessel"), role: role(input, "rolle"), active: bool(input, "aktiv") };
}

/** Personenstand: Liste von `{ schluessel, name, rolle, aktiv, ausbilder? }`. */
function persons(input: Input): PersonSnapshot[] {
  const list = field(input, "personen");
  if (!Array.isArray(list)) {
    throw new CaseFormatError("Eingabe „personen“ muss eine Liste sein.");
  }
  return list.map((entry: unknown) => {
    if (typeof entry !== "object" || entry === null) {
      throw new CaseFormatError("Jede Person muss ein Objekt sein.");
    }
    const person = entry as Input;
    return {
      id: text(person, "schluessel"),
      name: text(person, "name"),
      role: role(person, "rolle"),
      active: bool(person, "aktiv"),
      trainerId: "ausbilder" in person ? textOrNull(person, "ausbilder") : null,
    };
  });
}

function loginCandidate(input: Input | null): LoginCandidate | null {
  return (
    input && { id: text(input, "schluessel"), accountId: textOrNull(input, "kontoId"), active: bool(input, "aktiv") }
  );
}

/** Feste Fehlercodes aus `format.md` je Ablehnungsgrund der Nutzerverwaltung. */
const RULE_CODES: Record<RuleReason, string> = {
  "already-inactive": "bereits_deaktiviert",
  "already-active": "bereits_aktiv",
  "last-active-trainer": "letzter_ausbilder",
  "has-trainees": "azubis_zugeordnet",
  self: "eigene_person",
  "foreign-history": "fremde_historie",
  "trainer-inactive": "ausbilder_deaktiviert",
};

function ruleResult(result: RuleResult): Result {
  if (result.allowed) {
    return { erlaubt: true };
  }
  return result.offerDeactivate
    ? { fehler: RULE_CODES[result.reason], deaktivierenAnbieten: true }
    : { fehler: RULE_CODES[result.reason] };
}

/** Felder des Personen-Formulars in den Prüffällen, in fester Reihenfolge. */
const PERSON_FIELDS: [PersonField, string][] = [
  ["name", "name"],
  ["email", "email"],
  ["role", "rolle"],
  ["trainerId", "ausbilder"],
  ["trainingStart", "ausbildungsbeginn"],
  ["trainingEnd", "ausbildungsende"],
];

function optionalText(input: Input, name: string): string | null {
  return name in input ? textOrNull(input, name) : null;
}

const peopleOperations: Record<string, (input: Input) => Result> = {
  zugangPruefen: (input) => {
    const person = objectOrNull(input, "person");
    const decision = decideAccess(person && { role: role(person, "rolle"), active: bool(person, "aktiv") });
    if (decision.allowed) {
      return { zugang: true };
    }
    return { fehler: decision.reason === "inactive" ? "person_deaktiviert" : "konto_unbekannt" };
  },
  anmeldungZuordnen: (input) => {
    const account = object(input, "konto");
    const match = matchLogin(
      {
        accountId: textOrNull(account, "kontoId"),
        email: textOrNull(account, "email"),
        emailVerified: bool(account, "emailBestaetigt"),
      },
      loginCandidate(objectOrNull(input, "ueberKontoId")),
      loginCandidate(objectOrNull(input, "ueberEmail")),
    );
    switch (match.kind) {
      case "known":
        return { zuordnung: "bekannt", person: match.personId };
      case "bind":
        return { zuordnung: "binden", person: match.personId, kontoId: match.accountId };
      case "none":
        return { zuordnung: "keine" };
    }
  },
  darfBerichtSehen: (input) => {
    const report = object(input, "bericht");
    const access = { traineeId: text(report, "azubi"), traineeActive: bool(report, "azubiAktiv") };
    return canViewReport(viewer(object(input, "person")), access)
      ? { erlaubt: true }
      : { fehler: "zugriff_verweigert" };
  },
  darfVerwalten: (input) => {
    const person = objectOrNull(input, "person");
    return canManagePeople(person && viewer(person)) ? { erlaubt: true } : { fehler: "zugriff_verweigert" };
  },
  personPruefen: (input) => {
    const data = object(input, "daten");
    const all = persons(input);
    const targetId = "ziel" in input ? text(input, "ziel") : undefined;
    const target = all.find((person) => person.id === targetId);
    if (targetId !== undefined && !target) {
      throw new CaseFormatError(`Ziel „${targetId}“ steht nicht in „personen“.`);
    }
    const rawRole = optionalText(data, "rolle");
    const validation = validatePerson(
      {
        name: optionalText(data, "name"),
        email: optionalText(data, "email"),
        role: rawRole !== null && Object.hasOwn(ROLES, rawRole) ? ROLES[rawRole] : rawRole,
        trainerId: optionalText(data, "ausbilder"),
        trainingStart: optionalText(data, "ausbildungsbeginn"),
        trainingEnd: optionalText(data, "ausbildungsende"),
      },
      { persons: all, targetId, targetActive: target?.active },
    );
    if (!validation.ok) {
      return {
        fehler: "eingabe_ungueltig",
        felder: PERSON_FIELDS.filter(([key]) => key in validation.fieldErrors).map(([, name]) => name),
      };
    }
    const value = validation.value;
    return {
      person: {
        name: value.name,
        email: value.email,
        rolle: ROLE_NAMES[value.role],
        ausbilder: value.trainerId,
        ausbildungsbeginn: value.trainingStart,
        ausbildungsende: value.trainingEnd,
      },
    };
  },
  aenderungPruefen: (input) => {
    const result = checkUpdate(persons(input), text(input, "ziel"), text(input, "handelnd"), {
      role: role(input, "rolle"),
    });
    return result.allowed ? { erlaubt: true } : { fehler: RULE_CODES[result.reason] };
  },
  deaktivierenPruefen: (input) =>
    ruleResult(checkDeactivate(persons(input), text(input, "ziel"), text(input, "handelnd"))),
  reaktivierenPruefen: (input) => ruleResult(checkReactivate(persons(input), text(input, "ziel"))),
  loeschenPruefen: (input) =>
    ruleResult(
      checkDelete(persons(input), text(input, "ziel"), text(input, "handelnd"), {
        hasForeignHistory: bool(input, "fremdeHistorie"),
      }),
    ),
  namenBestaetigen: (input) => ({ bestaetigt: confirmsName(text(input, "eingabe"), text(input, "name")) }),
  bundeslandEinstellen: (input) => {
    const person = objectOrNull(input, "person");
    const setting = checkFederalStateSetting(person && viewer(person), text(input, "bundesland"));
    if (setting.ok) {
      return { bundesland: setting.federalState };
    }
    return { fehler: setting.reason === "forbidden" ? "zugriff_verweigert" : "bundesland_unbekannt" };
  },
};

export function list(input: Input, name: string): Input[] {
  const value = field(input, name);
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "object" || entry === null)) {
    throw new CaseFormatError(`Eingabe „${name}“ muss eine Liste von Objekten sein.`);
  }
  return value as Input[];
}

// ---------------------------------------------------------------------------
// M03 Wochenberichte entstehen, M04 Bericht erfassen
// ---------------------------------------------------------------------------

export const STATUSES: Record<string, ReportStatus> = {
  Entwurf: "DRAFT",
  Eingereicht: "SUBMITTED",
  Freigegeben: "APPROVED",
  Abgelehnt: "REJECTED",
};

const STATUS_NAMES = new Map(Object.entries(STATUSES).map(([name, value]) => [value, name]));

/** Status der App → neutraler Name (`Entwurf` …). */
export function statusName(value: ReportStatus): string | undefined {
  return STATUS_NAMES.get(value);
}

export function status(input: Input, name: string): ReportStatus {
  const value = text(input, name);
  if (!Object.hasOwn(STATUSES, value)) {
    throw new CaseFormatError(`Unbekannter Status: ${value}`);
  }
  return STATUSES[value];
}

/** Tagesart der App → neutraler Name (`Betrieb` …), leer → null. */
export function dayTypeName(dayType: DayType | null): string | null {
  return dayType === null ? null : DAY_TYPE_LABELS[dayType];
}

const DAY_TYPE_BY_NAME = new Map(DAY_TYPES.map((type) => [DAY_TYPE_LABELS[type], type]));

/** Gespeicherte Tagesart: neutraler Name oder null; jeder andere Wert ist ein fehlerhafter Prüffall. */
function storedDayType(value: unknown): DayType | null {
  if (value === null) {
    return null;
  }
  const type = typeof value === "string" ? DAY_TYPE_BY_NAME.get(value) : undefined;
  if (!type) {
    throw new CaseFormatError(`Gespeicherte Tagesart muss eine der fünf Tagesarten oder null sein: ${String(value)}`);
  }
  return type;
}

/**
 * Eingabe einer Tagesart aus dem Formular: null = nicht mitgeschickt, "" = leer. Bekannte Namen
 * werden übersetzt; jeder andere Text geht unverändert an die App, die ihn abweisen muss.
 */
export function inputDayType(value: unknown): string | null {
  if (value === null || value === "") {
    return value;
  }
  if (typeof value !== "string") {
    throw new CaseFormatError(`Tagesart der Eingabe muss Text oder null sein: ${String(value)}`);
  }
  return DAY_TYPE_BY_NAME.get(value) ?? value;
}

/** Ausbildungszeitraum aus `beginn` und `ende` (Kalendertag oder null). */
function trainingPeriod(input: Input): TrainingPeriod {
  const end = field(input, "ende");
  if (end !== null && typeof end !== "string") {
    throw new CaseFormatError("Eingabe „ende“ muss ein Kalendertag oder null sein.");
  }
  return { start: parseDate(text(input, "beginn")), end: end === null ? null : parseDate(end) };
}

export const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr"];

export function weekday(input: Input): string {
  const day = text(input, "tag");
  if (!WEEKDAYS.includes(day)) {
    throw new CaseFormatError(`Tag muss Mo bis Fr sein: ${day}`);
  }
  return day;
}

// ---------------------------------------------------------------------------
// M05 Status und Prüfung
// ---------------------------------------------------------------------------

/** Aktionen der Statuswechsel (`format.md`, „Schnittstellen und Aktionen von M05“) und der App. */
export const TRANSITION_ACTIONS: Record<string, ReportAction> = {
  einreichen: "SUBMIT",
  zurueckziehen: "WITHDRAW",
  freigeben: "APPROVE",
  ablehnen: "REJECT",
  erneut_einreichen: "RESUBMIT",
  freigabe_zuruecknehmen: "REVOKE_APPROVAL",
};

const ACTION_NAMES = new Map(Object.entries(TRANSITION_ACTIONS).map(([name, action]) => [action, name]));

/** Feste Fehlercodes je Grund, aus dem die Fachlogik einen Statuswechsel ablehnt. */
export const TRANSITION_REASON_CODES: Record<TransitionReason, string> = {
  forbidden: "zugriff_verweigert",
  "trainee-inactive": "azubi_deaktiviert",
  "not-allowed": "uebergang_unzulaessig",
  "withdrawn-meanwhile": "bericht_zurueckgezogen",
  "reviewed-meanwhile": "bereits_geprueft",
  "already-submitted": "bereits_eingereicht",
  "already-withdrawn": "bereits_zurueckgezogen",
  "already-revoked": "bereits_zurueckgenommen",
  "changed-meanwhile": "inzwischen_geaendert",
  "comment-required": "kommentar_fehlt",
  "reason-required": "begruendung_fehlt",
  "text-too-long": "text_zu_lang",
};

/** Feste Fehlercodes je fehlender Pflichtangabe beim Einreichen. */
export const SUBMISSION_PROBLEM_CODES: Record<SubmissionProblem, string> = {
  DAY_TYPE_MISSING: "tagesart_fehlt",
  ACTIVITIES_MISSING: "taetigkeiten_fehlen",
};

function transitionAction(input: Input): ReportAction {
  const name = text(input, "aktion");
  if (!Object.hasOwn(TRANSITION_ACTIONS, name)) {
    throw new CaseFormatError(`Unbekannte Aktion: ${name}`);
  }
  return TRANSITION_ACTIONS[name];
}

/** Bericht für die Statusprüfung: `{ azubi, azubiAktiv, status }`. */
function reportForTransition(input: Input) {
  const report = object(input, "bericht");
  return {
    traineeId: text(report, "azubi"),
    traineeActive: bool(report, "azubiAktiv"),
    status: status(report, "status"),
    // Die Version selbst ist Sache der Plattform; der Fall sagt nur, ob der gesehene Stand veraltet ist.
    version: 1,
  };
}

/** Gesehener Stand `{ status, veraltet }` oder null (es wird nur gegen den aktuellen Stand geprüft). */
function seenState(input: Input) {
  const seen = objectOrNull(input, "gesehen");
  return seen === null ? undefined : { status: status(seen, "status"), version: bool(seen, "veraltet") ? 0 : 1 };
}

/** Wochentag → Kalendertag einer festen Woche (Mo 05.10.2026); nur für die Reihenfolge der Tage. */
function weekdayDate(day: string): Date {
  return new Date(Date.UTC(2026, 9, 5 + WEEKDAYS.indexOf(day)));
}

const statusOperations: Record<string, (input: Input) => Result> = {
  uebergangPruefen: (input) => {
    const decision = decideTransition({
      action: transitionAction(input),
      actor: viewer(object(input, "person")),
      report: reportForTransition(input),
      seen: seenState(input),
      text: textOrNull(input, "text"),
    });
    if (!decision.ok) {
      const code = TRANSITION_REASON_CODES[decision.reason];
      return decision.reason === "text-too-long"
        ? { fehler: code, feld: decision.field === "comment" ? "kommentar" : "begruendung" }
        : { fehler: code };
    }
    return { von: statusName(decision.from), nach: statusName(decision.to), text: decision.text };
  },
  moeglicheAktionen: (input) => ({
    aktionen: availableActions(viewer(object(input, "person")), reportForTransition(input)).map((action) =>
      ACTION_NAMES.get(action),
    ),
  }),
  einreichenPruefen: (input) => {
    const issues = validateSubmission(
      list(input, "tage").map((day) => ({
        id: weekday(day),
        date: weekdayDate(weekday(day)),
        dayType: storedDayType(field(day, "tagesart")),
        activities: text(day, "text"),
        outsideTraining: bool(day, "ausserhalb"),
      })),
    );
    return issues.length === 0
      ? { einreichbar: true }
      : {
          fehler: "pflichtangaben_fehlen",
          tage: issues.map((issue) => ({ tag: issue.dayId, fehler: SUBMISSION_PROBLEM_CODES[issue.problem] })),
        };
  },
  darfBearbeiten: (input) => {
    const report = object(input, "bericht");
    return {
      bearbeitbar: canEditReport(viewer(object(input, "person")), {
        traineeId: text(report, "azubi"),
        traineeActive: bool(report, "azubiAktiv"),
        status: status(report, "status"),
      }),
    };
  },
  pruefrunde: (input) => {
    const submissions = integer(input, "einreichungen");
    if (submissions < 0) {
      throw new CaseFormatError(`„einreichungen“ darf nicht negativ sein: ${submissions}`);
    }
    return { runde: reviewRoundFor(transitionAction(input), submissions) };
  },
};

// ---------------------------------------------------------------------------
// M08 Benachrichtigungen und Erinnerung
// ---------------------------------------------------------------------------

/** Kanäle (`format.md`, „Schnittstellen und Aktionen von M08“) und der App, in fester Reihenfolge. */
export const CHANNEL_NAMES: Record<Channel, string> = { EMAIL: "email", TEAMS: "teams", APP: "app" };

const CHANNEL_VALUES = new Map(Object.entries(CHANNEL_NAMES).map(([channel, name]) => [name, channel]));

/** Neutraler Kanal → Wert der App; ein unbekannter Text geht unverändert an die App, die ihn abweisen muss. */
export function channelValue(value: unknown): string {
  if (typeof value !== "string") {
    throw new CaseFormatError(`Kanal muss Text sein: ${JSON.stringify(value)}`);
  }
  return CHANNEL_VALUES.get(value) ?? value;
}

/** Anlass einer Nachricht. */
export const TOPIC_NAMES: Record<NotificationTopic, string> = {
  SUBMITTED: "eingereicht",
  RESUBMITTED: "erneut_eingereicht",
  APPROVED: "freigegeben",
  REJECTED: "abgelehnt",
  APPROVAL_REVOKED: "freigabe_zurueckgenommen",
  REMINDER: "erinnerung",
  OVERDUE: "ueberfaellig",
};

/** Gewählte Kanäle einer Person; nur die drei bekannten. */
function channels(input: Input, name: string): Channel[] {
  const values = field(input, name);
  if (!Array.isArray(values)) {
    throw new CaseFormatError(`„${name}“ muss eine Liste von Kanälen sein.`);
  }
  return values.map((value) => {
    const channel = channelValue(value);
    if (!Object.hasOwn(CHANNEL_NAMES, channel)) {
      throw new CaseFormatError(`Unbekannter Kanal: ${String(value)}`);
    }
    return channel as Channel;
  });
}

/** Empfänger `{ schluessel, aktiv, kanaele }`; der Name ist der Schlüssel (er steht nur im Text). */
function recipient(input: Input): Recipient {
  const key = text(input, "schluessel");
  return { id: key, name: key, active: bool(input, "aktiv"), channels: channels(input, "kanaele") };
}

/** Bericht-ID für die Fachlogik: Azubi und Woche (eine Datenhaltung gibt es hier nicht). */
function reportKey(azubi: string, woche: string): string {
  return `${azubi}:${woche}`;
}

/** Nachricht der App → neutrale Nachricht; das Ziel des Links wird nur übersetzt, nie berechnet. */
function message(draft: NotificationDraft): Result {
  const { topic, traineeId, weeks } = draft.about;
  let target: string;
  if (draft.reportId !== null && draft.link === reportPath(draft.reportId)) {
    target = "bericht";
  } else if (draft.link === TRAINEE_HOME_PATH || draft.link === traineeOverviewPath(traineeId)) {
    target = "uebersicht";
  } else {
    throw new Error(`Unbekanntes Ziel des Links: ${draft.link}`);
  }
  return {
    empfaenger: draft.recipientId,
    kanal: CHANNEL_NAMES[draft.channel],
    anlass: TOPIC_NAMES[topic],
    azubi: traineeId,
    wochen: weeks.map(formatWeek),
    ziel: target,
  };
}

const notificationOperations: Record<string, (input: Input) => Result> = {
  kanaeleWaehlen: (input) => {
    const values = field(input, "werte");
    if (!Array.isArray(values)) {
      throw new CaseFormatError("„werte“ muss eine Liste sein.");
    }
    const chosen = parseChannels(values.map(channelValue));
    return chosen === null
      ? { fehler: "kanal_unbekannt" }
      : { kanaele: chosen.map((channel) => CHANNEL_NAMES[channel]) };
  },
  voreinstellungKanaele: () => ({ kanaele: DEFAULT_CHANNELS.map((channel) => CHANNEL_NAMES[channel]) }),
  benachrichtigungenPlanen: (input) => {
    const trainee = recipient(object(input, "azubi"));
    const trainer = objectOrNull(input, "ausbilder");
    const week = parseWeek(text(input, "woche"));
    const drafts = planTransitionNotifications({
      statusChangeId: "statuswechsel",
      action: transitionAction(input),
      report: { ...week, id: reportKey(trainee.id, formatWeek(week)) },
      trainee: { ...trainee, trainer: trainer === null ? null : recipient(trainer) },
      // Name und Adresse stehen nur im Text der Nachricht, den die neutrale Schnittstelle nicht liefert.
      actor: { name: "handelnd" },
      baseUrl: "https://berichtsheft.test",
    });
    return { nachrichten: drafts.map(message) };
  },
  erinnerungenPlanen: (input) => {
    const trainees: ReminderTrainee[] = list(input, "azubis").map((entry) => {
      const trainee = recipient(entry);
      const trainer = objectOrNull(entry, "ausbilder");
      const period = trainingPeriod(entry);
      return {
        ...trainee,
        trainingStart: period.start,
        trainingEnd: period.end,
        trainer: trainer === null ? null : recipient(trainer),
        weeks: list(entry, "wochen").map((week) => ({
          ...parseWeek(text(week, "woche")),
          status: status(week, "status"),
          hasContent: bool(week, "inhalt"),
          hasHistory: bool(week, "historie"),
          reportId: reportKey(trainee.id, text(week, "woche")),
        })),
      };
    });
    return {
      nachrichten: planReminders({ now: now(), trainees, baseUrl: "https://berichtsheft.test" }).map(message),
    };
  },
  erinnerungFaellig: (input) => {
    const schedule = reminderSchedule(parseInstant(text(input, "zeitpunkt")));
    return { woche: formatWeek(schedule.week), stichtag: formatInstant(schedule.dueAt), faellig: schedule.due };
  },
  wartezeitNachFehlversuch: (input) => {
    const attempts = integer(input, "versuche");
    if (attempts < 1) {
      throw new CaseFormatError(`„versuche“ muss mindestens 1 sein: ${attempts}`);
    }
    return { sekunden: retryDelaySeconds(attempts) };
  },
  ruecksprungZiel: (input) => ({ ziel: safeReturnPath(field(input, "ziel")) }),
};

const operations: Record<string, (input: Input) => Result> = {
  jetzt: () => ({ zeitpunkt: formatInstant(now()) }),
  uhrVorgeben: (input) => {
    const instant = text(input, "zeitpunkt");
    const mode = text(input, "betrieb");
    if (mode !== "test" && mode !== "produktiv") {
      throw new CaseFormatError(`Betrieb muss „test“ oder „produktiv“ sein: ${mode}`);
    }
    const clock = clockFromEnvironment({
      APP_FIXED_NOW: instant,
      NODE_ENV: mode === "produktiv" ? "production" : "test",
    });
    // Die Vorgabe wirkt, wenn die Uhr genau den vorgegebenen Zeitpunkt liefert.
    return { gestellt: clock.now().getTime() === new Date(instant).getTime() };
  },
  kalendertag: (input) => {
    const day = today(parseInstant(text(input, "zeitpunkt")));
    return { datum: toDateInput(day), wochentag: weekdayShort(day) };
  },
  isoWoche: (input) => ({ woche: formatWeek(isoWeekOf(parseDate(text(input, "datum")))) }),
  montagDerWoche: (input) => ({
    datum: toDateInput(isoWeekMonday(integer(input, "jahr"), integer(input, "woche"))),
  }),
  arbeitstage: (input) => ({
    tage: isoWeekWorkdays(integer(input, "jahr"), integer(input, "woche")).map(toDateInput),
  }),
  naechsteWoche: (input) => ({ woche: formatWeek(nextIsoWeek(parseWeek(text(input, "woche")))) }),
  vergleicheWochen: (input) => {
    const order = compareWeeks(parseWeek(text(input, "a")), parseWeek(text(input, "b")));
    return { ergebnis: order < 0 ? "frueher" : order > 0 ? "spaeter" : "gleich" };
  },
  aktuelleWoche: (input) => ({ woche: formatWeek(currentIsoWeek(parseInstant(text(input, "zeitpunkt")))) }),
  bundeslaender: () => ({ bundeslaender: Object.keys(FEDERAL_STATES) }),
  istBundesland: (input) => ({ bundesland: isFederalState(text(input, "kuerzel")) }),
  istFeiertag: (input) => ({
    feiertag: isPublicHoliday(parseDate(text(input, "datum")), text(input, "bundesland")),
  }),
  feiertage: (input) => ({
    feiertage: [...publicHolidays(integer(input, "jahr"), text(input, "bundesland"))].sort(),
  }),
  ...peopleOperations,

  // --- M03 Wochenberichte entstehen ---
  faelligeWochen: (input) => ({ wochen: weeksDue(trainingPeriod(input), now()).map(formatWeek) }),
  berichtstageAnlegen: (input) => ({
    tage: planReportDays(parseWeek(text(input, "woche")), trainingPeriod(input), text(input, "bundesland")).map(
      (day) => ({
        datum: toDateInput(day.date),
        tag: weekdayShort(day.date),
        tagesart: dayTypeName(day.dayType),
        ausserhalb: day.outsideTraining,
      }),
    ),
  }),
  ausserhalbNeuBerechnen: (input) => {
    const days: StoredDay[] = list(input, "tage").map((day) => ({
      id: text(day, "datum"),
      date: parseDate(text(day, "datum")),
      dayType: storedDayType(field(day, "tagesart")),
      outsideTraining: bool(day, "ausserhalb"),
    }));
    return {
      aenderungen: correctOutsideTraining(days, trainingPeriod(input), text(input, "bundesland")).map((change) => ({
        datum: change.id,
        ausserhalb: change.outsideTraining,
        ...(change.dayType ? { tagesart: dayTypeName(change.dayType) } : {}),
      })),
    };
  },
  istOffen: (input) => ({ offen: isOpenStatus(status(input, "status")) }),
  wocheEinordnen: (input) => {
    const result = classifyWeek(
      {
        ...parseWeek(text(input, "woche")),
        status: status(input, "status"),
        hasContent: bool(input, "inhalt"),
        hasHistory: bool(input, "historie"),
      },
      trainingPeriod(input),
      currentIsoWeek(now()),
    );
    return {
      ausgeblendet: result.hidden,
      ausserhalb: result.outsideTraining,
      offen: result.open,
      vergangenOffen: result.pastOpen,
    };
  },

  // --- M04 Bericht erfassen ---
  tagesarten: () => ({ tagesarten: DAY_TYPES.map((type) => DAY_TYPE_LABELS[type]) }),
  tageSpeichern: (input) => {
    const days = list(input, "tage").map((day) => ({
      id: weekday(day),
      outsideTraining: bool(day, "ausserhalb"),
      dayType: storedDayType(field(day, "tagesart")),
      activities: text(day, "text"),
    }));
    const inputs = new Map<string, DayInput>(
      list(input, "eingaben").map((entry) => [
        weekday(entry),
        { dayType: inputDayType(field(entry, "tagesart")), activities: textOrNull(entry, "text") },
      ]),
    );
    const result = validateDayInputs(days, inputs, new Map(days.map((day) => [day.id, day])));
    if (!result.ok) {
      // Fehlerart je Feld, nicht der Meldungstext: Feld Tagesart bzw. Tätigkeiten.
      return {
        fehler: "tage_ungueltig",
        tage: Object.entries(result.errors).map(([day, errors]) => ({
          tag: day,
          fehler: [
            ...(errors.dayType !== undefined ? ["tagesart_unbekannt"] : []),
            ...(errors.activities !== undefined ? ["text_zu_lang"] : []),
          ],
        })),
      };
    }
    return {
      aenderungen: result.updates.map((update) => ({
        tag: update.id,
        tagesart: dayTypeName(update.dayType),
        text: update.activities,
      })),
    };
  },

  // --- M05 Status und Prüfung ---
  ...statusOperations,

  // --- M08 Benachrichtigungen und Erinnerung ---
  ...notificationOperations,
};

/** Namen aller Schnittstellen, die der Adapter kennt. */
export const INTERFACES = Object.keys(operations);

/**
 * Ruft eine neutrale Schnittstelle auf. Ein fachlicher Fehler der App wird zu `{ fehler: <code> }`;
 * eine unbekannte Schnittstelle, ein fehlerhafter Prüffall und jeder andere Fehler werfen.
 */
export function call(interfaceName: string, input: Input): Result {
  const operation = Object.hasOwn(operations, interfaceName) ? operations[interfaceName] : undefined;
  if (!operation) {
    throw new CaseFormatError(`Unbekannte Schnittstelle: ${interfaceName}`);
  }
  try {
    return operation(input);
  } catch (error) {
    const code = ERROR_CODES.find(([type]) => error instanceof type)?.[1];
    if (code) {
      return { fehler: code };
    }
    throw error;
  }
}
