import { prisma } from "@/lib/prisma";
import { BrothersManager } from "@/components/admin/brothers-manager";
import { getCurrentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BrothersPage() {
  let brothers: any[] = [];
  try {
    brothers = await prisma.brother.findMany({ orderBy: { name: "asc" } });
  } catch { brothers = []; }

  const session = await getCurrentSession();

  const serializable = brothers.map((b) => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    lastSeen: b.lastSeen.toISOString(),
  }));

  return (
    <main className="container py-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Brother directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {session?.isAdmin
              ? "Active brothers of the Gamma Triton chapter. Track contact, position, dues, service hours, and study hours."
              : "Browse the chapter directory. You can edit your own profile from the card with the pencil icon."}
          </p>
        </div>
        {!session?.isAdmin && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Read-only · Brother view
          </span>
        )}
      </div>
      <BrothersManager
        initial={serializable as any}
        isAdmin={!!session?.isAdmin}
        currentBrotherId={session?.brother?.id || null}
      />
    </main>
  );
}
