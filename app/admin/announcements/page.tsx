import { prisma } from "@/lib/prisma";
import { AnnouncementsManager } from "@/components/admin/announcements-manager";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
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
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Announcements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Post chapter-wide updates. Pin urgent ones to the top. Use Broadcast to text/email all brothers.
        </p>
      </div>
      <AnnouncementsManager initial={serializable as any} />
    </main>
  );
}
