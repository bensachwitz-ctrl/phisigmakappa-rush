import { prisma } from "@/lib/prisma";
import { checkOfficerPermission } from "@/lib/permissions";
import { OfficerAccessRequired } from "@/components/admin/officer-access-required";
import { RiskClient } from "./risk-client";

export const dynamic = "force-dynamic";

export default async function RiskPage() {
  // GATE-3 FIX 4: graceful read gate (card, not a thrown 403).
  const { allowed: canRead } = await checkOfficerPermission("risk", "read");
  if (!canRead) return <OfficerAccessRequired title="Risk Desk" permission="Risk" />;
  const { allowed: canWrite } = await checkOfficerPermission("risk", "write");

  // Fetch incident reports + the investigator list. Wrapped so a transient DB
  // hiccup degrades to an empty list (the page still renders its add/empty UI)
  // rather than throwing — the app/admin/error.tsx boundary is the backstop, but
  // a read-only dashboard should never hard-fail on a momentary query error.
  // (incident reports exclude the reporter field by design — anonymity contract.)
  let incidents: Awaited<ReturnType<typeof prisma.incidentReport.findMany>> = [];
  let brothers: { id: string; name: string }[] = [];
  try {
    [incidents, brothers] = await Promise.all([
      prisma.incidentReport.findMany({
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
        },
      }) as any,
      prisma.brother.findMany({
        where: { status: { in: ["ACTIVE", "INITIATE", "PLEDGE"] } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);
  } catch {
    incidents = [];
    brothers = [];
  }

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
