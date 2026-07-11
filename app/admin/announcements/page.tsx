import { redirect } from "next/navigation";
import { IconMegaphone as Megaphone } from "@/components/brand/icons";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "@/lib/auth";
import { checkOfficerPermission } from "@/lib/permissions";
import { OfficerAccessRequired } from "@/components/admin/officer-access-required";
import { AnnouncementsManager } from "@/components/admin/announcements-manager";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  // Gated on the "announcements" officer domain — NOT isAdminRole. The write API
  // (POST/PATCH/DELETE + broadcast) already admits officers holding
  // announcements:write (Secretary, Recruitment, Philanthropy, Brotherhood
  // chairs), but this page previously redirected every non-admin, so those
  // officers had a working backend and NO reachable compose UI. Now a read-holder
  // reaches the page (graceful card if not) and canWrite governs the controls, so
  // the nav ↔ page ↔ API all agree on the "announcements" permission.
  if (!isAdminAuthed()) redirect("/admin/login?from=%2Fadmin%2Fannouncements");
  const { allowed: canRead } = await checkOfficerPermission("announcements", "read");
  if (!canRead) return <OfficerAccessRequired title="Announcements" permission="Announcements" />;
  const { allowed: canWrite } = await checkOfficerPermission("announcements", "write");

  let announcements: any[] = [];
  try {
    announcements = await prisma.announcement.findMany({
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { id: true, name: true } } },
    });
  } catch { announcements = []; }

  const serializable = announcements.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <div className="container py-8">
      <AdminPageHeader
        icon={Megaphone}
        title="Announcements"
        subtitle="Post chapter-wide updates. Pin urgent ones to the top. Use Broadcast to text/email all members."
      />
      <AnnouncementsManager initial={serializable as any} canWrite={canWrite} />
    </div>
  );
}
