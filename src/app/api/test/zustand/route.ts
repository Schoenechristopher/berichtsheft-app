import { InvalidInstantError, now, resetClock, setFixedNow } from "@/domain/clock";
import { testLoginEnabled } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { ensureReportsForTrainee } from "@/lib/reports";
import { seedFederalState, seedPersons } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

/**
 * Testschnittstelle für den Ablauf-Runner (`e2e/pruefung-ablauf.spec.ts`, Entscheidung E1 Plan G3): stellt die
 * Uhr der laufenden App und setzt die Testdaten zurück. Es gibt sie nur außerhalb von Produktion und nur mit
 * aktivem Test-Login; sonst antwortet sie wie eine unbekannte Adresse mit 404 (geprüft in
 * `e2e/produktionsmodus.spec.ts`).
 *
 * `POST` mit JSON `{ "uhr": <Zeitpunkt> | null, "bestand"?: "testdaten" }`:
 * - `uhr` stellt die Uhr fest (`setFixedNow`), `null` stellt sie zurück (`resetClock`);
 * - `bestand: "testdaten"` leert die Datenbank und legt die Testdaten an (Anna, Bernd, Clara, Bundesland), dann
 *   entstehen Annas Berichte bis „jetzt“ wie in M03.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" || !testLoginEnabled()) {
    return new Response("Not Found", { status: 404 });
  }
  // Nur JSON: Ein fremdes Formular kann die Schnittstelle so nicht ohne Weiteres auslösen.
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ fehler: "nur JSON" }, { status: 415 });
  }
  const body = (await request.json().catch(() => null)) as { uhr?: unknown; bestand?: unknown } | null;
  if (!body || (body.uhr !== null && typeof body.uhr !== "string")) {
    return Response.json({ fehler: "„uhr“ muss ein Zeitpunkt oder null sein" }, { status: 400 });
  }
  if (body.bestand !== undefined && body.bestand !== "testdaten") {
    return Response.json({ fehler: "„bestand“ kennt nur „testdaten“" }, { status: 400 });
  }
  try {
    if (body.uhr === null) {
      resetClock();
    } else {
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
