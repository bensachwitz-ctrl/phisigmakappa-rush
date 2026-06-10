import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";
import { AnnouncementsManager } from "@/components/admin/announcements-manager";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  // Admin-only. The middleware only checks for *a* session, not the role, so
  // without this gate any logged-in brother could open the announcements console
  // by direct URL. Gated with isAdminRole (not the "announcements" officer
  // domain) to stay consistent with the announcements write API, whose
  // POST/PATCH/DELETE are all isAdminRole-only — so an officer let in by the
  // domain would see a page where every control 403s.
  if (!isAdminAuthed()) redirect("/admin/login?from=%2Fadmin%2Fannouncements");
  if (!isAdminRole()) redirect("/admin");

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
    <main className="container py-8">
      <AdminPageHeader
        icon={Megaphone}
        title="Announcements"
        subtitle="Post chapter-wide updates. Pin urgent ones to the top. Use Broadcast to text/email all members."
      />
      <AnnouncementsManager initial={serializable as any} />
    </main>
  );
}
