import { prisma } from "@/lib/prisma";
import { checkOfficerPermission } from "@/lib/permissions";
import { OfficerAccessRequired } from "@/components/admin/officer-access-required";
import { ChoresClient } from "./chores-client";

export const dynamic = "force-dynamic";

export default async function ChoresPage() {
  // Read permission for chores/house catalog is "house" domain.
  // GATE-3 FIX 4: graceful read gate (card, not a thrown 403).
  const { allowed: canRead } = await checkOfficerPermission("house", "read");
  if (!canRead) return <OfficerAccessRequired title="Chores" permission="House" />;
  const { allowed: canWrite } = await checkOfficerPermission("house", "write");

  // Fetch recurring chores tasks
  const tasks = await prisma.choreWheelTask.findMany({
    orderBy: { rotationOrder: "asc" },
  });

  // Fetch active / pledge / initiate brothers for selection list
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

  return (
    <ChoresClient
      initialTasks={tasks}
      initialBrothers={brothers}
      canWrite={canWrite}
    />
  );
}
