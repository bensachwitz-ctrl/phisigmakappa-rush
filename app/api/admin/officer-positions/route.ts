import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import {
  DEFAULT_OFFICER_CATALOG,
  parsePermissions,
  stringifyPermissions,
} from "@/lib/officer-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureSuperAdmin() {
  const s = await getCurrentSession();
  if (!s) return { ok: false, status: 401, error: "Sign in first" } as const;
  if (!s.isAdmin) return { ok: false, status: 403, error: "Admin role required" } as const;
  return { ok: true } as const;
}

const Schema = z.object({
  title: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional().or(z.literal("")),
  permissions: z.string().min(1), // JSON string, validated below
  sortOrder: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const gate = await ensureSuperAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const rows = await prisma.officerPosition.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ positions: rows });
}

export async function POST(req: Request) {
  const gate = await ensureSuperAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  // Re-serialise via parsePermissions so we reject junk before writing
  const safePerms = stringifyPermissions(parsePermissions(parsed.data.permissions));
  try {
    const created = await prisma.officerPosition.create({
      data: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        permissions: safePerms,
        sortOrder: parsed.data.sortOrder ?? 100,
        active: parsed.data.active ?? true,
      },
    });
    return NextResponse.json({ ok: true, position: created });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "A position with that slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const gate = await ensureSuperAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const PatchSchema = Schema.partial().extend({
    id: z.string().min(1),
    resetDefaults: z.boolean().optional(),
  });
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  const { id, resetDefaults, ...rest } = parsed.data;
  const existing = await prisma.officerPosition.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: "Position not found" }, { status: 404 });

  const data: any = {};
  if (rest.title !== undefined) data.title = rest.title;
  if (rest.slug !== undefined) data.slug = rest.slug;
  if (rest.description !== undefined) data.description = rest.description || null;
  if (typeof rest.sortOrder === "number") data.sortOrder = rest.sortOrder;
  if (typeof rest.active === "boolean") data.active = rest.active;

  if (resetDefaults) {
    const fallback = DEFAULT_OFFICER_CATALOG.find((c) => c.slug === existing.slug);
    if (fallback) {
      data.permissions = stringifyPermissions(fallback.permissions);
    }
  } else if (rest.permissions !== undefined) {
    data.permissions = stringifyPermissions(parsePermissions(rest.permissions));
  }

  const updated = await prisma.officerPosition.update({ where: { id }, data });
  return NextResponse.json({ ok: true, position: updated });
}

export async function DELETE(req: Request) {
  const gate = await ensureSuperAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  // Soft-delete by deactivating; active assignments stay intact for the audit trail
  const updated = await prisma.officerPosition.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true, position: updated });
}
