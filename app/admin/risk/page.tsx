import { prisma } from "@/lib/prisma";
import { requireOfficerPermission, checkOfficerPermission } from "@/lib/permissions";
import { RiskClient } from "./risk-client";

export const dynamic = "force-dynamic";

export default async function RiskPage() {
  await requireOfficerPermission("risk", "read");
  const { allowed: canWrite } = await checkOfficerPermission("risk", "write");

  // Fetch all incident reports (without the reporter information for list view anonymity contract)
  const incidents = await prisma.incidentReport.findMany({
    orderBy: { reportedAt: "desc" },
    select: {
      id: true,
      receiptCode: true,
      category: true,
      severity: true,
      status: true,
      isAnonymous: true,
      subject: true,
      reportedAt: true,
      occurredAt: true,
      resolvedAt: true,
      reporterId: true,
      // Note: Reporter field is excluded here by design.
    },
  });

  // Fetch active / pledge / initiate brothers for selection list (investigators)
  const brothers = await prisma.brother.findMany({
    where: {
      status: { in: ["ACTIVE", "INITIATE", "PLEDGE"] },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  // Serialize dates
  const serializedIncidents = incidents.map((item) => ({
    ...item,
    reportedAt: item.reportedAt.toISOString(),
    occurredAt: item.occurredAt ? item.occurredAt.toISOString() : null,
    resolvedAt: item.resolvedAt ? item.resolvedAt.toISOString() : null,
  }));

  return (
    <RiskClient
      initialIncidents={serializedIncidents as any}
      brothers={brothers}
      canWrite={canWrite}
    />
  );
}
