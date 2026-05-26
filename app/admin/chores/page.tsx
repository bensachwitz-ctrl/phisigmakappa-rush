import { prisma } from "@/lib/prisma";
import { requireOfficerPermission, checkOfficerPermission } from "@/lib/permissions";
import { ChoresClient } from "./chores-client";

export const dynamic = "force-dynamic";

export default async function ChoresPage() {
  // Read permission for chores/house catalog is "house" domain
  await requireOfficerPermission("house", "read");
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
