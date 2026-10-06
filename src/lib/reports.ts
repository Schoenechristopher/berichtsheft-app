import type { Viewer } from "@/domain/report-access";
import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Berichte, die die Person sehen darf (AK-103, AK-105): Azubis nur eigene, Ausbilder alle.
 * Gleiche Regel wie `canViewReport`, als Datenbankfilter.
 */
export async function listVisibleReports(prisma: PrismaClient, viewer: Viewer) {
  if (!viewer.active) {
    return [];
  }
  return prisma.weeklyReport.findMany({
    where: viewer.role === "TRAINER" ? {} : { traineeId: viewer.id },
    include: { trainee: { select: { name: true, active: true } } },
    orderBy: [{ trainee: { name: "asc" } }, { isoYear: "desc" }, { isoWeek: "desc" }],
  });
}
