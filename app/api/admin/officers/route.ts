import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession, getCurrentBrotherId, getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Officer assignments. Only chapter super-admin (legacy Phisig admin) can
// grant or revoke officer roles. This is intentional — the per-domain
// permissions on OfficerPosition control everything *else* in the system, so
// the assignment surface itself stays gated at the highest tier.
async function ensureSuperAdmin() {
  const s = await getCurrentSession();
  if (!s) return { ok: false, status: 401, error: "Sign in first" } as const;
  if (!s.isAdmin) return { ok: false, status: 403, error: "Admin role required to grant officer permissions" } as const;
  return { ok: true } as const;
}

const Schema = z.object({
  positionId: z.string().min(1),
  brotherId: z.string().min(1),
  termCode: z.string().min(2).max(20),
  startDate: z.string().min(4),
  endDate: z.string().min(4).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export async function GET() {
  const gate = await ensureSuperAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const [assignments, positions, brothers] = await Promise.all([
    prisma.officerAssignment.findMany({
      orderBy: [{ termCode: "desc" }, { createdAt: "desc" }],
      include: {
        position: { select: { id: true, title: true, slug: true, active: true } },
        brother: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.officerPosition.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.brother.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return NextResponse.json({ assignments, positions, brothers });
}

export async function POST(req: Request) {
  const gate = await ensureSuperAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  const data = parsed.data;
  const created = await prisma.officerAssignment.create({
    data: {
      positionId: data.positionId,
      brotherId: data.brotherId,
      termCode: data.termCode,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      notes: data.notes || null,
    },
    include: {
      position: { select: { id: true, title: true, slug: true } },
      brother: { select: { id: true, name: true } },
    },
  });

  // Audit — high-stakes mutation (granting officer permissions). Defensive
  // try/catch so a broken Announcement table can't poison the response.
  try {
    const me = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("officer.assign", {
      actor: { brotherId: me?.id ?? null, name: me?.name ?? "Admin", role: "super-admin", ipAddress: ip, userAgent: ua },
      entity: {
        type: "OfficerAssignment",
        id: created.id,
        name: `${created.brother?.name ?? "brother"} — ${created.position?.title ?? "position"} (${created.termCode})`,
      },
      payload: { after: created },
    });
  } catch { /* best-effort */ }

  return NextResponse.json({ ok: true, assignment: created });
}

export async function PATCH(req: Request) {
  const gate = await ensureSuperAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const PatchSchema = Schema.partial().extend({ id: z.string().min(1) });
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  const { id, ...rest } = parsed.data;
  const data: any = {};
  if (rest.positionId) data.positionId = rest.positionId;
  if (rest.brotherId) data.brotherId = rest.brotherId;
  if (rest.termCode) data.termCode = rest.termCode;
  if (rest.startDate) data.startDate = new Date(rest.startDate);
  if (rest.endDate === "") data.endDate = null;
  else if (rest.endDate) data.endDate = new Date(rest.endDate);
  if (rest.notes !== undefined) data.notes = rest.notes || null;
  const updated = await prisma.officerAssignment.update({
    where: { id },
    data,
    include: {
      position: { select: { id: true, title: true } },
      brother: { select: { id: true, name: true } },
    },
  });

  // Audit — officer.position.update covers any field tweak (term, dates, notes)
  // so the timeline shows "President-elect's term updated" without us having
  // to invent a new key per field.
  try {
    const me = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("officer.position.update", {
      actor: { brotherId: me?.id ?? null, name: me?.name ?? "Admin", role: "super-admin", ipAddress: ip, userAgent: ua },
      entity: {
        type: "OfficerAssignment",
        id: updated.id,
        name: `${updated.brother?.name ?? "brother"} — ${updated.position?.title ?? "position"}`,
      },
      payload: { after: updated, changedKeys: Object.keys(data) },
    });
  } catch { /* best-effort */ }

  return NextResponse.json({ ok: true, assignment: updated });
}

export async function DELETE(req: Request) {
  const gate = await ensureSuperAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  // Capture before-state so the audit row's payload includes who got revoked.
  const before = await prisma.officerAssignment.findUnique({
    where: { id },
    include: {
      position: { select: { id: true, title: true } },
      brother: { select: { id: true, name: true } },
    },
  });

  await prisma.officerAssignment.delete({ where: { id } });

  try {
    const me = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("officer.unassign", {
      actor: { brotherId: me?.id ?? null, name: me?.name ?? "Admin", role: "super-admin", ipAddress: ip, userAgent: ua },
      entity: {
        type: "OfficerAssignment",
        id,
        name: before ? `${before.brother?.name ?? "brother"} — ${before.position?.title ?? "position"}` : id,
      },
      payload: { before },
    });
  } catch { /* best-effort */ }

  return NextResponse.json({ ok: true });
}
