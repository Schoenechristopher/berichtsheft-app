import { now } from "@/domain/clock";
import { db } from "@/lib/db";
import { loadWeekExport } from "@/lib/report-export";
import { requirePerson } from "@/lib/session";
import { pdfResponse } from "@/pdf/response";

/**
 * PDF einer Woche (AK-901, AK-903 – AK-907): ohne Anmeldung zur Anmeldung, sonst dieselben
 * Zugriffsregeln wie die Berichtsseite (AK-906). Bei jedem Aufruf neu erzeugt.
 */
export async function GET(_request: Request, { params }: RouteContext<"/berichte/[id]/pdf">) {
  const viewer = await requirePerson();
  const { id } = await params;
  return pdfResponse(await loadWeekExport(db(), viewer, id, now()));
}
