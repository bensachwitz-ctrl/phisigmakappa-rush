import { prisma } from "@/lib/prisma";
import { BrothersManager } from "@/components/admin/brothers-manager";

export const dynamic = "force-dynamic";

export default async function BrothersPage() {
  let brothers: any[] = [];
  try {
    brothers = await prisma.brother.findMany({ orderBy: { name: "asc" } });
  } catch { brothers = []; }

  const serializable = brothers.map((b) => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    lastSeen: b.lastSeen.toISOString(),
  }));

  return (
    <main className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Brother directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Active brothers of the Gamma Triton chapter. Track contact, position, dues, service hours, and study hours.
        </p>
      </div>
      <BrothersManager initial={serializable as any} />
    </main>
  );
}
