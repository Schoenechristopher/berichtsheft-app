/**
 * Daten-Adapter für die neutralen Prüffälle der Ebene `daten` (`specs/pruefung/format.md`, „Aufbau eines
 * Daten-Falls“): stellt den Ausgangsbestand in der Test-Datenbank her, übersetzt die Aktionen auf die
 * Serverfunktionen der App (`src/lib/report-transitions.ts`, `src/lib/reports.ts`, Nutzerverwaltung) und
 * liest den Bestand zurück. Er deutet kein Ergebnis um; fachliche Fehler werden über den festen Grund
 * der App (`reason`) auf die Fehlercodes abgebildet, nie über den Meldungstext.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { now, setFixedNow } from "@/domain/clock";
import type { DayErrors, DayInput } from "@/domain/report-days";
import { currentFeedback } from "@/domain/report-history";
import { STATUS_LABELS, type ReportAction, type SeenState } from "@/domain/report-status";
import { toDateInput, weekdayShort } from "@/domain/weeks";
import { deactivatePerson, updatePerson } from "@/lib/people/service";
import { transitionReport, type TransitionFailureReason, type TransitionInput } from "@/lib/report-transitions";
import {
  ensureReportsForTrainee,
  listReviewQueue,
  loadReportHistory,
  saveReportDays,
  type SaveFailureReason,
} from "@/lib/reports";
import { createKeyedPersons, resetDatabase, type KeyedPerson, type TestDb } from "../db/helpers";
import {
  CaseFormatError,
  SUBMISSION_PROBLEM_CODES,
  TRANSITION_ACTIONS,
  TRANSITION_REASON_CODES,
  WEEKDAYS,
  dayTypeName,
  field,
  formatInstant,
  formatWeek,
  inputDayType,
  integer,
  list,
  object,
  parseDate,
  parseInstant,
  parseWeek,
  text,
  textOrNull,
  type Input,
  type Result,
} from "./adapter";

/** Feste Fehlercodes je Grund eines gescheiterten Statuswechsels; `null` = kein fachlicher Fehler. */
const TRANSITION_CODES: Record<TransitionFailureReason, string | null> = {
  ...TRANSITION_REASON_CODES,
  "submission-incomplete": "pflichtangaben_fehlen",
  "week-outside-training": "woche_ausserhalb",
  "day-input-invalid": "tage_ungueltig",
  "not-found": null,
};

const SAVE_CODES: Record<SaveFailureReason, string> = {
  forbidden: "zugriff_verweigert",
  "not-editable": "nicht_bearbeitbar",
  "day-input-invalid": "tage_ungueltig",
};

/** Felder je Aktion (außer `aktion`); jedes andere Feld ist ein fehlerhafter Prüffall. */
const STEP_FIELDS: Record<string, { required: string[]; optional: string[] }> = {
  einreichen: { required: ["als", "azubi", "woche"], optional: ["uhr", "gesehen", "tage"] },
  erneut_einreichen: { required: ["als", "azubi", "woche"], optional: ["uhr", "gesehen", "tage"] },
  zurueckziehen: { required: ["als", "azubi", "woche"], optional: ["uhr", "gesehen"] },
  freigeben: { required: ["als", "azubi", "woche"], optional: ["uhr", "gesehen", "kommentar", "tageskommentare"] },
  ablehnen: { required: ["als", "azubi", "woche", "kommentar"], optional: ["uhr", "gesehen", "tageskommentare"] },
  freigabe_zuruecknehmen: { required: ["als", "azubi", "woche", "begruendung"], optional: ["uhr", "gesehen"] },
  tage_speichern: { required: ["als", "azubi", "woche", "tage"], optional: ["uhr"] },
  pruefliste_lesen: { required: ["als", "filter"], optional: ["uhr"] },
  rueckmeldung_lesen: { required: ["azubi", "woche"], optional: ["uhr"] },
  person_deaktivieren: { required: ["als", "person"], optional: ["uhr"] },
  ausbildungszeitraum_aendern: { required: ["als", "person", "beginn", "ende"], optional: ["uhr"] },
};

interface TestData {
  bundesland: string;
  personen: (Omit<KeyedPerson, "rolle"> & { rolle: KeyedPerson["rolle"] | null; angelegt: boolean })[];
}

const testData = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, "../../specs/pruefung/testdaten.json"), "utf8"),
) as TestData;

function checkFields(step: Input, allowed: { required: string[]; optional: string[] }, where: string) {
  for (const name of allowed.required) {
    field(step, name);
  }
  const unknown = Object.keys(step).filter(
    (name) => name !== "aktion" && !allowed.required.includes(name) && !allowed.optional.includes(name),
  );
  if (unknown.length > 0) {
    throw new CaseFormatError(`${where}: unbekanntes Feld ${unknown.join(", ")}.`);
  }
}

function asInput(value: unknown, where: string): Input {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CaseFormatError(`${where} muss ein Objekt sein.`);
  }
  return value as Input;
}

/** Ein Daten-Fall in Ausführung: Personen und Berichte der Test-Datenbank je Schlüssel. */
class DataCase {
  private readonly personIds = new Map<string, string>();
  private readonly personKeys = new Map<string, string>();
  /** Berichte in der Reihenfolge ihrer ersten Nennung, je `<azubi> <woche>`. */
  private readonly reports = new Map<string, { azubi: string; woche: string; id: string }>();
  /** Stand (Status und Version) aller Berichte nach jedem Schritt; Index 0 = Ausgangsbestand. */
  private readonly states: Map<string, SeenState>[] = [];

  constructor(private readonly prisma: TestDb) {}

  /** Ausgangsbestand: leere Datenhaltung, Testdaten, fallbezogene Personen, Berichte bis „jetzt“. */
  async setUp(baseline: Input | undefined): Promise<void> {
    await resetDatabase(this.prisma);
    await this.prisma.setting.create({ data: { id: 1, federalState: testData.bundesland } });
    const persons: KeyedPerson[] = testData.personen
      .filter((person) => person.angelegt)
      .map((person) => ({ ...person, rolle: person.rolle as KeyedPerson["rolle"] }));
    for (const entry of baseline && "personen" in baseline ? list(baseline, "personen") : []) {
      persons.push(this.extraPerson(entry));
    }
    const created = await createKeyedPersons(this.prisma, persons);
    for (const [key, person] of created) {
      this.personIds.set(key, person.id);
      this.personKeys.set(person.id, key);
      if (person.role === "TRAINEE") {
        await ensureReportsForTrainee(this.prisma, person.id, now());
      }
    }
    for (const entry of baseline && "berichte" in baseline ? list(baseline, "berichte") : []) {
      await this.prepareReport(entry);
    }
    if (baseline) {
      const unknown = Object.keys(baseline).filter((name) => name !== "personen" && name !== "berichte");
      if (unknown.length > 0) {
        throw new CaseFormatError(`Ausgangsbestand: unbekanntes Feld ${unknown.join(", ")}.`);
      }
    }
    await this.recordState();
  }

  private extraPerson(entry: Input): KeyedPerson {
    const key = text(entry, "schluessel");
    if (testData.personen.some((person) => person.schluessel === key)) {
      throw new CaseFormatError(`Person „${key}“ steht schon in den Testdaten.`);
    }
    const rolle = text(entry, "rolle");
    if (rolle !== "azubi" && rolle !== "ausbilder") {
      throw new CaseFormatError(`Rolle muss „azubi“ oder „ausbilder“ sein: ${rolle}`);
    }
    checkFields(
      entry,
      rolle === "azubi"
        ? { required: ["schluessel", "name", "rolle", "ausbilder", "ausbildungsbeginn"], optional: ["ausbildungsende"] }
        : { required: ["schluessel", "name", "rolle"], optional: [] },
      `Person „${key}“`,
    );
    return {
      schluessel: key,
      name: text(entry, "name"),
      email: `${key}@berichtsheft.test`,
      rolle,
      ...(rolle === "azubi"
        ? {
            ausbilder: text(entry, "ausbilder"),
            ausbildungsbeginn: text(entry, "ausbildungsbeginn"),
            ausbildungsende: "ausbildungsende" in entry ? textOrNull(entry, "ausbildungsende") : null,
          }
        : {}),
    };
  }

  /** Bericht des Ausgangsbestands: Tage erfassen (als Azubi), dann den Verlauf; beides muss gelingen. */
  private async prepareReport(entry: Input): Promise<void> {
    checkFields(entry, { required: ["azubi", "woche"], optional: ["tage", "verlauf"] }, "Bericht im Ausgangsbestand");
    const azubi = text(entry, "azubi");
    const woche = text(entry, "woche");
    const where = `Ausgangsbestand ${azubi} ${woche}`;
    await this.report(azubi, woche);
    if ("tage" in entry) {
      const result = await this.step({ als: azubi, aktion: "tage_speichern", azubi, woche, tage: entry.tage }, 0);
      if ("fehler" in result) {
        throw new CaseFormatError(`${where}: Tage ließen sich nicht speichern (${JSON.stringify(result)}).`);
      }
    }
    for (const [index, value] of ("verlauf" in entry ? list(entry, "verlauf") : []).entries()) {
      if ("azubi" in value || "woche" in value || "gesehen" in value) {
        throw new CaseFormatError(`${where}, Verlauf ${index + 1}: „azubi“, „woche“ und „gesehen“ gibt es hier nicht.`);
      }
      const result = await this.step({ ...value, azubi, woche }, 0);
      if ("fehler" in result) {
        throw new CaseFormatError(`${where}, Verlauf ${index + 1} ist gescheitert (${JSON.stringify(result)}).`);
      }
    }
  }

  /** Führt die Schritte aus und liefert Ergebnisse und den Bestand der genannten Berichte. */
  async run(steps: Input[]): Promise<Result> {
    const results: Result[] = [];
    for (const [index, step] of steps.entries()) {
      results.push(await this.step(step, index + 1));
      await this.recordState();
    }
    const berichte: Result[] = [];
    for (const report of this.reports.values()) {
      berichte.push(await this.readReport(report));
    }
    return { ergebnisse: results, berichte };
  }

  private async recordState(): Promise<void> {
    const reports = await this.prisma.weeklyReport.findMany({ select: { id: true, status: true, version: true } });
    this.states.push(new Map(reports.map((report) => [report.id, { status: report.status, version: report.version }])));
  }

  private personId(key: string): string {
    const id = this.personIds.get(key);
    if (!id) {
      throw new CaseFormatError(`Unbekannte Person: ${key}`);
    }
    return id;
  }

  private personKey(id: string): string {
    const key = this.personKeys.get(id);
    if (!key) {
      throw new Error(`Person ${id} gehört nicht zum Prüffall.`);
    }
    return key;
  }

  /** Angemeldete Person mit ihrem aktuellen Stand (wie bei jedem Aufruf der App). */
  private async viewer(key: string) {
    const person = await this.prisma.person.findUniqueOrThrow({ where: { id: this.personId(key) } });
    return { id: person.id, role: person.role, active: person.active };
  }

  private async report(azubi: string, woche: string) {
    const name = `${azubi} ${woche}`;
    const known = this.reports.get(name);
    if (known) {
      return known;
    }
    const week = parseWeek(woche);
    const report = await this.prisma.weeklyReport.findUnique({
      where: {
        traineeId_isoYear_isoWeek: { traineeId: this.personId(azubi), isoYear: week.isoYear, isoWeek: week.isoWeek },
      },
    });
    if (!report) {
      throw new CaseFormatError(`Es gibt keinen Bericht ${name}; Berichte entstehen bis zur Woche von „uhr“.`);
    }
    const entry = { azubi, woche, id: report.id };
    this.reports.set(name, entry);
    return entry;
  }

  private async days(reportId: string) {
    const days = await this.prisma.reportDay.findMany({ where: { reportId }, orderBy: { date: "asc" } });
    return days.map((day) => ({ ...day, tag: weekdayShort(day.date) }));
  }

  /** Tageseingaben `{ "alle"?, "Mo"? … "Fr"? }` mit je `{ tagesart, text }` → Eingaben je Tag. */
  private async dayInputs(reportId: string, value: unknown): Promise<Map<string, DayInput>> {
    const input = asInput(value, "„tage“");
    const unknown = Object.keys(input).filter((key) => key !== "alle" && !WEEKDAYS.includes(key));
    if (unknown.length > 0) {
      throw new CaseFormatError(`„tage“: unbekannter Tag ${unknown.join(", ")} (erlaubt: alle, Mo bis Fr).`);
    }
    const toInput = (key: string): DayInput => {
      const day = object(input, key);
      checkFields(day, { required: ["tagesart", "text"], optional: [] }, `„tage“, ${key}`);
      return { dayType: inputDayType(field(day, "tagesart")), activities: textOrNull(day, "text") };
    };
    const inputs = new Map<string, DayInput>();
    for (const day of await this.days(reportId)) {
      if (day.tag in input) {
        inputs.set(day.id, toInput(day.tag));
      } else if ("alle" in input) {
        inputs.set(day.id, toInput("alle"));
      }
    }
    return inputs;
  }

  /** Tageskommentare `{ "Mo": <Text>, … }` → Text je Tag. */
  private async dayComments(reportId: string, value: unknown): Promise<Map<string, string>> {
    const input = asInput(value, "„tageskommentare“");
    const days = await this.days(reportId);
    const comments = new Map<string, string>();
    for (const key of Object.keys(input)) {
      const day = days.find((entry) => entry.tag === key);
      if (!day) {
        throw new CaseFormatError(`„tageskommentare“: unbekannter Tag ${key}.`);
      }
      comments.set(day.id, text(input, key));
    }
    return comments;
  }

  private async step(step: Input, index: number): Promise<Result> {
    const action = text(step, "aktion");
    const fields = Object.hasOwn(STEP_FIELDS, action) ? STEP_FIELDS[action] : undefined;
    if (!fields) {
      throw new CaseFormatError(`Unbekannte Aktion: ${action}`);
    }
    checkFields(step, fields, `Schritt ${index} (${action})`);
    if ("uhr" in step) {
      setFixedNow(parseInstant(text(step, "uhr")));
    }
    if (Object.hasOwn(TRANSITION_ACTIONS, action)) {
      return this.transition(step, TRANSITION_ACTIONS[action], index);
    }
    switch (action) {
      case "tage_speichern": {
        const report = await this.report(text(step, "azubi"), text(step, "woche"));
        const result = await saveReportDays(
          this.prisma,
          await this.viewer(text(step, "als")),
          report.id,
          await this.dayInputs(report.id, step.tage),
        );
        if (result.ok) {
          return { gespeichert: true };
        }
        return result.dayErrors
          ? { fehler: SAVE_CODES[result.reason], tage: await this.dayErrorList(report.id, result.dayErrors) }
          : { fehler: SAVE_CODES[result.reason] };
      }
      case "pruefliste_lesen": {
        const filter = text(step, "filter");
        if (filter !== "eigene" && filter !== "alle") {
          throw new CaseFormatError(`Filter muss „eigene“ oder „alle“ sein: ${filter}`);
        }
        const queue = await listReviewQueue(
          this.prisma,
          await this.viewer(text(step, "als")),
          filter === "eigene" ? "mine" : "all",
        );
        return {
          berichte: queue.map((report) => ({
            azubi: this.personKey(report.trainee.id),
            woche: formatWeek(report),
            eingereicht: formatInstant(report.submittedAt),
            azubiAktiv: report.trainee.active,
          })),
        };
      }
      case "rueckmeldung_lesen": {
        const report = await this.report(text(step, "azubi"), text(step, "woche"));
        const stored = await this.prisma.weeklyReport.findUniqueOrThrow({ where: { id: report.id } });
        const { changes, comments } = await loadReportHistory(this.prisma, report.id);
        const feedback = currentFeedback(stored.status, changes, comments);
        if (!feedback) {
          return { rueckmeldung: null };
        }
        const days = await this.days(report.id);
        return {
          rueckmeldung: {
            art: feedback.kind === "REJECTED" ? "ablehnung" : "ruecknahme",
            text: feedback.text,
            tage: days
              .filter((day) => feedback.dayComments.has(day.id))
              .map((day) => ({ tag: day.tag, texte: feedback.dayComments.get(day.id) })),
          },
        };
      }
      case "person_deaktivieren": {
        const result = await deactivatePerson(
          this.prisma,
          await this.viewer(text(step, "als")),
          this.personId(text(step, "person")),
        );
        if (!result.ok) {
          throw new Error(`Deaktivieren ist gescheitert: ${JSON.stringify(result)}`);
        }
        return { deaktiviert: true };
      }
      case "ausbildungszeitraum_aendern": {
        // Wie der Admin im Formular: alle anderen Angaben der Person bleiben, nur der Zeitraum ändert sich.
        const person = await this.prisma.person.findUniqueOrThrow({
          where: { id: this.personId(text(step, "person")) },
        });
        const result = await updatePerson(this.prisma, await this.viewer(text(step, "als")), person.id, {
          name: person.name,
          email: person.email,
          role: person.role,
          trainerId: person.trainerId,
          trainingStart: toDateInput(parseDate(text(step, "beginn"))),
          trainingEnd: field(step, "ende") === null ? null : toDateInput(parseDate(text(step, "ende"))),
        });
        if (!result.ok) {
          throw new Error(`Ändern des Ausbildungszeitraums ist gescheitert: ${JSON.stringify(result)}`);
        }
        return { geaendert: true };
      }
    }
    throw new CaseFormatError(`Unbekannte Aktion: ${action}`);
  }

  private async transition(step: Input, action: ReportAction, index: number): Promise<Result> {
    const report = await this.report(text(step, "azubi"), text(step, "woche"));
    const input: TransitionInput = { action };
    if ("gesehen" in step) {
      const seenAfter = integer(step, "gesehen");
      if (seenAfter < 0 || seenAfter >= index) {
        throw new CaseFormatError(`„gesehen“ muss ein früherer Stand sein (0 bis ${index - 1}): ${seenAfter}`);
      }
      const seen = this.states[seenAfter]?.get(report.id);
      if (!seen) {
        throw new CaseFormatError(`Zum Stand ${seenAfter} gibt es den Bericht ${report.azubi} ${report.woche} nicht.`);
      }
      input.seen = seen;
    }
    for (const name of ["kommentar", "begruendung"]) {
      if (name in step) {
        input.text = textOrNull(step, name);
      }
    }
    if ("tageskommentare" in step) {
      input.dayComments = await this.dayComments(report.id, step.tageskommentare);
    }
    if ("tage" in step) {
      input.dayInputs = await this.dayInputs(report.id, step.tage);
    }
    const result = await transitionReport(this.prisma, await this.viewer(text(step, "als")), report.id, input);
    if (result.ok) {
      return { status: STATUS_LABELS[result.status] };
    }
    const code = TRANSITION_CODES[result.reason];
    if (!code) {
      throw new Error(`Statuswechsel ohne fachlichen Fehlercode gescheitert: ${JSON.stringify(result)}`);
    }
    switch (result.reason) {
      case "submission-incomplete": {
        const days = await this.days(report.id);
        return {
          fehler: code,
          tage: (result.submissionIssues ?? []).map((issue) => ({
            tag: days.find((day) => day.id === issue.dayId)?.tag,
            fehler: SUBMISSION_PROBLEM_CODES[issue.problem],
          })),
        };
      }
      case "text-too-long": {
        const errors = result.fieldErrors ?? {};
        if (errors.dayComments) {
          const days = await this.days(report.id);
          return {
            fehler: code,
            feld: "tageskommentar",
            tage: days.filter((day) => errors.dayComments?.[day.id] !== undefined).map((day) => day.tag),
          };
        }
        return { fehler: code, feld: errors.comment !== undefined ? "kommentar" : "begruendung" };
      }
      case "day-input-invalid":
        return { fehler: code, tage: await this.dayErrorList(report.id, result.dayErrors ?? {}) };
      default:
        return { fehler: code };
    }
  }

  /** Fehler je Tag wie bei M04 (`tageSpeichern`): Codes je Feld, Tage in Kalenderreihenfolge. */
  private async dayErrorList(reportId: string, errors: DayErrors): Promise<Result[]> {
    return (await this.days(reportId))
      .filter((day) => errors[day.id] !== undefined)
      .map((day) => ({
        tag: day.tag,
        fehler: [
          ...(errors[day.id].dayType !== undefined ? ["tagesart_unbekannt"] : []),
          ...(errors[day.id].activities !== undefined ? ["text_zu_lang"] : []),
        ],
      }));
  }

  /** Bestand eines Berichts: Status, Tage, Historie (Statuswechsel) und Kommentare. */
  private async readReport(report: { azubi: string; woche: string; id: string }): Promise<Result> {
    const stored = await this.prisma.weeklyReport.findUniqueOrThrow({ where: { id: report.id } });
    const days = await this.days(report.id);
    const changes = await this.prisma.statusChange.findMany({
      where: { reportId: report.id },
      orderBy: { seq: "asc" },
    });
    const comments = await this.prisma.comment.findMany({ where: { reportId: report.id } });
    const dayOrder = (dayId: string | null) => (dayId === null ? -1 : days.findIndex((day) => day.id === dayId));
    return {
      azubi: report.azubi,
      woche: report.woche,
      status: STATUS_LABELS[stored.status],
      tage: days.map((day) => ({ tag: day.tag, tagesart: dayTypeName(day.dayType), text: day.activities })),
      historie: changes.map((change) => ({
        von: change.fromStatus === null ? null : STATUS_LABELS[change.fromStatus],
        nach: STATUS_LABELS[change.toStatus],
        person: this.personKey(change.actorId),
        zeitpunkt: formatInstant(change.createdAt),
        runde: change.reviewRound,
        begruendung: change.reason,
      })),
      // Kommentare je Runde, Gesamtkommentar zuerst, dann die Tage Mo bis Fr.
      kommentare: [...comments]
        .sort((a, b) => a.reviewRound - b.reviewRound || dayOrder(a.dayId) - dayOrder(b.dayId))
        .map((comment) => ({
          runde: comment.reviewRound,
          tag: comment.dayId === null ? null : days[dayOrder(comment.dayId)].tag,
          person: this.personKey(comment.authorId),
          text: comment.text,
        })),
    };
  }
}

/** Führt einen Daten-Fall aus: Ausgangsbestand herstellen, Schritte ausführen, Bestand zurücklesen. */
export async function runDataCase(
  prisma: TestDb,
  entry: { uhr?: string; ausgangsbestand?: unknown; schritte?: unknown },
) {
  if (typeof entry.uhr !== "string") {
    throw new CaseFormatError("Ein Daten-Fall braucht „uhr“.");
  }
  if (!Array.isArray(entry.schritte) || entry.schritte.length === 0) {
    throw new CaseFormatError("Ein Daten-Fall braucht mindestens einen Schritt in „schritte“.");
  }
  setFixedNow(parseInstant(entry.uhr));
  const run = new DataCase(prisma);
  await run.setUp(
    entry.ausgangsbestand === undefined ? undefined : asInput(entry.ausgangsbestand, "„ausgangsbestand“"),
  );
  return run.run(entry.schritte.map((step, index) => asInput(step, `Schritt ${index + 1}`)));
}
