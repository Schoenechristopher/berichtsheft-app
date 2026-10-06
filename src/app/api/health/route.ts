import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Gesundheitsprüfung für Docker Compose: App läuft und erreicht die Datenbank. */
export async function GET() {
  try {
    await db().$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error", detail: "Datenbank nicht erreichbar" }, { status: 503 });
  }
}
