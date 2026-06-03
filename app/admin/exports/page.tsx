import { prisma } from "@/lib/prisma";
import { requireOfficerPermission, checkOfficerPermission } from "@/lib/permissions";
import { ExportsClient } from "./exports-client";

export const dynamic = "force-dynamic";

export default async function ExportsPage() {
  await requireOfficerPermission("payments", "read");
  const { allowed: canWrite } = await checkOfficerPermission("payments", "write");

  const runs = await prisma.hqExportRun
    .findMany({ orderBy: { createdAt: "desc" }, take: 100 })
    .catch(() => []);

  const serialized = runs.map((r) => ({
    id: r.id,
    exportType: r.exportType,
    termCode: r.termCode,
    status: r.status,
    fileUrl: r.fileUrl,
    rowCount: r.rowCount,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    errorMessage: r.errorMessage,
  }));

  return <ExportsClient initialRuns={serialized} canWrite={canWrite} />;
}
