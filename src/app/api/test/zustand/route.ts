import { InvalidInstantError, now, resetClock, setFixedNow } from "@/domain/clock";
import { DAY_TYPE_LABELS, DAY_TYPES, type DayInput } from "@/domain/report-days";
import type { ReportAction } from "@/domain/report-status";
import { testLoginEnabled } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { appBaseUrl } from "@/lib/notifications/config";
import { runDueReminders } from "@/lib/notifications/service";
import { transitionReport } from "@/lib/report-transitions";
import { ensureReportsForTrainee, saveReportDays } from "@/lib/reports";
import { seedFederalState, seedPersons } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

/**
 * Testschnittstelle für den Ablauf-Runner (`e2e/pruefung-ablauf.spec.ts`, Entscheidung E1 Plan G3): stellt die
 * Uhr der laufenden App und setzt die Testdaten zurück. Es gibt sie nur außerhalb von Produktion und nur mit
 * aktivem Test-Login; sonst antwortet sie wie eine unbekannte Adresse mit 404 (geprüft in
 * `e2e/produktionsmodus.spec.ts`).
 *
 * `POST` mit JSON `{ "uhr"?: <Zeitpunkt> | null, "bestand"?: "testdaten", "ausgangsbestand"?: …, "erinnerung"?: true }`:
 * - `uhr` stellt die Uhr fest (`setFixedNow`), `null` stellt sie zurück (`resetClock`), ohne `uhr` bleibt sie;
 * - `bestand: "testdaten"` leert die Datenbank und legt die Testdaten an (Anna, Bernd, Clara, Bundesland), dann
 *   entstehen Annas Berichte bis „jetzt“ wie in M03;
 * - `erinnerung: true` startet den Erinnerungslauf zu „jetzt“ (M08) und liefert sein Ergebnis (`format.md`);
 * - `ausgangsbestand` (nur mit `bestand`) wie bei Daten-Fällen (`specs/pruefung/format.md`), hier nur `berichte` mit
 *   `tage` und `verlauf`; danach steht die Uhr wieder auf `uhr`. Gelingt etwas nicht, antwortet sie mit 400.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" || !testLoginEnabled()) {
    return new Response("Not Found", { status: 404 });
  }
  // Nur JSON: Ein fremdes Formular kann die Schnittstelle so nicht ohne Weiteres auslösen.
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ fehler: "nur JSON" }, { status: 415 });
  }
  const body = (await request.json().catch(() => null)) as {
    uhr?: unknown;
    bestand?: unknown;
    ausgangsbestand?: unknown;
    erinnerung?: unknown;
  } | null;
  if (!body || (body.uhr !== undefined && body.uhr !== null && typeof body.uhr !== "string")) {
    return Response.json({ fehler: "„uhr“ muss ein Zeitpunkt oder null sein" }, { status: 400 });
  }
  if (body.erinnerung !== undefined && body.erinnerung !== true) {
    return Response.json({ fehler: "„erinnerung“ kennt nur true" }, { status: 400 });
  }
  if (body.bestand !== undefined && body.bestand !== "testdaten") {
    return Response.json({ fehler: "„bestand“ kennt nur „testdaten“" }, { status: 400 });
  }
  if (body.ausgangsbestand !== undefined && (body.bestand !== "testdaten" || typeof body.uhr !== "string")) {
    return Response.json({ fehler: "„ausgangsbestand“ nur mit „bestand“ und „uhr“" }, { status: 400 });
  }
  try {
    if (body.uhr === null) {
      resetClock();
    } else if (body.uhr !== undefined) {
      setFixedNow(body.uhr);
    }
  } catch (error) {
    if (error instanceof InvalidInstantError) {
      return Response.json({ fehler: "zeitpunkt_ungueltig" }, { status: 400 });
    }
    throw error;
  }
  if (body.bestand === "testdaten") {
    await loadTestData();
  }
  if (body.ausgangsbestand !== undefined) {
    try {
      await applyBaseline(body.ausgangsbestand);
    } catch (error) {
      if (error instanceof BaselineError || error instanceof InvalidInstantError) {
        return Response.json({ fehler: `ausgangsbestand: ${error.message}` }, { status: 400 });
      }
      throw error;
    } finally {
      setFixedNow(body.uhr as string);
    }
  }
  if (body.erinnerung) {
    // Der Erinnerungslauf zu „jetzt“, wie ihn der Zeitplan des Workers startet (M08); Ergebnis wie bei Daten-Fällen.
    const result = await runDueReminders(db(), { now: now(), baseUrl: appBaseUrl() });
    const erinnerung = result.ran
      ? { lauf: "ausgefuehrt", angelegt: result.created }
      : { lauf: result.reason === "nicht-faellig" ? "nicht_faellig" : "schon_erledigt" };
    return Response.json({ jetzt: now().toISOString(), erinnerung });
  }
  return Response.json({ jetzt: now().toISOString() });
}

/** Leert die Datenbank (Azubis zuerst, damit die Kaskade Berichte und Historie mitnimmt) und lädt die Testdaten. */
async function loadTestData() {
  const prisma = db();
  await prisma.person.deleteMany({ where: { role: "TRAINEE" } });
  await prisma.person.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.reminderRun.deleteMany();
  await prisma.setting.create({ data: { id: 1, federalState: seedFederalState } });
  const bernd = await prisma.person.create({ data: { ...seedPersons.bernd } });
  await prisma.person.create({ data: { ...seedPersons.clara } });
  const { trainingStart, ...anna } = seedPersons.anna;
  const trainee = await prisma.person.create({
    data: { ...anna, trainingStart: new Date(`${trainingStart}T00:00:00Z`), trainerId: bernd.id },
  });
  await ensureReportsForTrainee(prisma, trainee.id, now());
}

class BaselineError extends Error {}

/** Statuswechsel im `verlauf` eines Berichts (`format.md`, „Schnittstellen und Aktionen von M05“). */
const BASELINE_ACTIONS: Record<string, ReportAction> = {
  einreichen: "SUBMIT",
  zurueckziehen: "WITHDRAW",
  freigeben: "APPROVE",
  ablehnen: "REJECT",
  erneut_einreichen: "RESUBMIT",
  freigabe_zuruecknehmen: "REVOKE_APPROVAL",
};
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function onlyFields(value: Record<string, unknown>, allowed: string[], where: string) {
  const unknown = Object.keys(value).filter((name) => !allowed.includes(name));
  if (unknown.length > 0) {
    throw new BaselineError(`${where}: unbekanntes Feld ${unknown.join(", ")}`);
  }
}

function textOf(value: Record<string, unknown>, name: string, where: string): string {
  if (typeof value[name] !== "string") {
    throw new BaselineError(`${where}: „${name}“ muss ein Text sein`);
  }
  return value[name];
}

/**
 * Ausgangsbestand eines Ablauf-Falls: je Bericht die Tage als Azubi speichern, dann den Verlauf (Statuswechsel mit
 * Rechteprüfung wie in der App). Personen schlüsselt die E-Mail der Testdaten (`<schlüssel>@berichtsheft.test`).
 */
async function applyBaseline(baseline: unknown) {
  if (!isRecord(baseline)) {
    throw new BaselineError("„ausgangsbestand“ muss ein Objekt sein");
  }
  onlyFields(baseline, ["berichte"], "„ausgangsbestand“ (der Ablauf-Runner kennt nur „berichte“)");
  const reports = baseline.berichte ?? [];
  if (!Array.isArray(reports)) {
    throw new BaselineError("„berichte“ muss eine Liste sein");
  }
  const prisma = db();
  const viewer = async (key: string, where: string) => {
    const person = await prisma.person.findUnique({ where: { email: `${key}@berichtsheft.test` } });
    if (!person) {
      throw new BaselineError(`${where}: unbekannte Person „${key}“`);
    }
    return { id: person.id, role: person.role, active: person.active };
  };
  for (const entry of reports) {
    if (!isRecord(entry)) {
      throw new BaselineError("Bericht im Ausgangsbestand muss ein Objekt sein");
    }
    onlyFields(entry, ["azubi", "woche", "tage", "verlauf"], "Bericht im Ausgangsbestand");
    const azubi = textOf(entry, "azubi", "Bericht im Ausgangsbestand");
    const woche = textOf(entry, "woche", "Bericht im Ausgangsbestand");
    const where = `Ausgangsbestand ${azubi} ${woche}`;
    const match = /^(\d{4})-W(\d{2})$/.exec(woche);
    const trainee = await viewer(azubi, where);
    const report = match
      ? await prisma.weeklyReport.findUnique({
          where: {
            traineeId_isoYear_isoWeek: { traineeId: trainee.id, isoYear: Number(match[1]), isoWeek: Number(match[2]) },
          },
        })
      : null;
    if (!report) {
      throw new BaselineError(`${where}: Den Bericht gibt es nicht`);
    }
    if (entry.tage !== undefined) {
      const tage = entry.tage;
      if (!isRecord(tage)) {
        throw new BaselineError(`${where}: „tage“ muss ein Objekt sein`);
      }
      onlyFields(tage, ["alle", ...WEEKDAYS], `${where}, „tage“`);
      const days = await prisma.reportDay.findMany({ where: { reportId: report.id }, orderBy: { date: "asc" } });
      const inputs = new Map<string, DayInput>();
      days.forEach((day, index) => {
        const value = tage[WEEKDAYS[index]] ?? tage.alle;
        if (value === undefined) {
          return;
        }
        if (!isRecord(value)) {
          throw new BaselineError(`${where}: Tag muss ein Objekt sein`);
        }
        onlyFields(value, ["tagesart", "text"], `${where}, Tag`);
        const label = value.tagesart;
        const dayType = label === null ? null : DAY_TYPES.find((type) => DAY_TYPE_LABELS[type] === label);
        if (dayType === undefined) {
          throw new BaselineError(`${where}: unbekannte Tagesart „${String(label)}“`);
        }
        inputs.set(day.id, { dayType, activities: textOf(value, "text", `${where}, Tag`) });
      });
      const saved = await saveReportDays(prisma, trainee, report.id, inputs);
      if (!saved.ok) {
        throw new BaselineError(`${where}: Tage ließen sich nicht speichern (${saved.reason})`);
      }
    }
    const steps = entry.verlauf ?? [];
    if (!Array.isArray(steps)) {
      throw new BaselineError(`${where}: „verlauf“ muss eine Liste sein`);
    }
    for (const [index, step] of steps.entries()) {
      const at = `${where}, Verlauf ${index + 1}`;
      if (!isRecord(step)) {
        throw new BaselineError(`${at}: Schritt muss ein Objekt sein`);
      }
      onlyFields(step, ["als", "aktion", "uhr", "kommentar", "begruendung"], at);
      const action = BASELINE_ACTIONS[textOf(step, "aktion", at)];
      if (!action) {
        throw new BaselineError(`${at}: unbekannte Aktion „${String(step.aktion)}“`);
      }
      if (step.uhr !== undefined) {
        setFixedNow(textOf(step, "uhr", at));
      }
      const text = step.kommentar ?? step.begruendung;
      const result = await transitionReport(prisma, await viewer(textOf(step, "als", at), at), report.id, {
        action,
        ...(typeof text === "string" ? { text } : {}),
      });
      if (!result.ok) {
        throw new BaselineError(`${at}: gescheitert (${result.reason})`);
      }
    }
  }
}
