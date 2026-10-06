import type { NextRequest } from "next/server";
import { now } from "@/domain/clock";
import { db } from "@/lib/db";
import { loadRangeExport } from "@/lib/report-export";
import { requirePerson } from "@/lib/session";
import { pdfResponse } from "@/pdf/response";

/**
 * Sammel-PDF eines Azubis für einen Zeitraum (AK-902 – AK-907), Parameter `von` und `bis`
 * (JJJJ-MM-TT). Azubis nur das eigene, Ausbilder das jedes Azubis, auch deaktivierter (AK-906).
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/azubis/[id]/pdf">) {
  const viewer = await requirePerson();
  const { id } = await params;
  const search = request.nextUrl.searchParams;
  return pdfResponse(await loadRangeExport(db(), viewer, id, search.get("von"), search.get("bis"), now()));
}
