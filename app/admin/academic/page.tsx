import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import { checkOfficerPermission } from "@/lib/permissions";
import { OfficerAccessRequired } from "@/components/admin/officer-access-required";
import { AcademicClient } from "./academic-client";

export const dynamic = "force-dynamic";

export default async function AcademicPage() {
  // GATE-3 FIX 4: gate the READ gracefully — a signed-in officer without the
  // academic domain gets the "access required" card, not a thrown 403 that
  // crashes into app/admin/error.tsx.
  const { allowed: canRead } = await checkOfficerPermission("academic", "read");
  if (!canRead) return <OfficerAccessRequired title="Academic" permission="Academic" />;
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
