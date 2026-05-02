import { prisma } from "@/lib/prisma";
import { Roster } from "@/components/admin/roster";
import { getCurrentBrother } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  let rushes: any[] = [];
  try {
    rushes = await prisma.rush.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        votes: { select: { value: true, brotherId: true } },
        attendances: { select: { eventId: true } },
      },
    });
  } catch {
    rushes = [];
  }

  const me = await getCurrentBrother();

  const serializable = rushes.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    hometown: r.hometown,
    major: r.major,
    year: r.year,
    highSchoolInfo: r.highSchoolInfo,
    backgroundInfo: r.backgroundInfo,
    status: r.status,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    voteSum: r.votes.reduce((s: number, v: any) => s + v.value, 0),
    voteCount: r.votes.length,
    myVote: me ? r.votes.find((v: any) => v.brotherId === me.id)?.value ?? null : null,
    attendanceCount: r.attendances.length,
  }));

  return (
    <main className="container py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Rush Roster</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {me ? <>Signed in as <span className="text-foreground font-medium">{me.name}</span> · </> : null}
            Manage potential new members. Update status, vote, take notes, send mass email or text.
          </p>
        </div>
      </div>
      <Roster initial={serializable as any} brotherName={me?.name || null} />
    </main>
  );
}
