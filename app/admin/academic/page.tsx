import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import { requireOfficerPermission, checkOfficerPermission } from "@/lib/permissions";
import { AcademicClient } from "./academic-client";

export const dynamic = "force-dynamic";

export default async function AcademicPage() {
  await requireOfficerPermission("academic", "read");
  const session = await getCurrentSession();
  const { allowed: canWrite } = await checkOfficerPermission("academic", "write");

  // Fetch active / pledge / initiate brothers
  const brothers = await prisma.brother.findMany({
    where: {
      status: { in: ["ACTIVE", "INITIATE", "PLEDGE"] },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      pledgeClass: true,
      studyHours: true,
      academicStanding: true,
      major: true,
      year: true,
    },
  });

  return (
    <AcademicClient
      initialBrothers={brothers}
      canWrite={canWrite}
      currentBrotherId={session?.brother?.id || null}
    />
  );
}
