import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, getCurrentBrotherId, getCurrentSession } from "@/lib/auth";
import { requireOfficerPermission, hasPermission, getCurrentOfficerPermissions } from "@/lib/permissions";
import { DOCUMENT_VISIBILITIES } from "@/lib/member-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = [
  "BYLAWS", "POLICIES", "RITUAL", "FORMS", "TRAINING",
  "CALENDAR", "DUES", "GENERAL", "OTHER",
] as const;

const Schema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  url: z.string().url().max(2048),
  blobUrl: z.string().url().max(2048).optional().or(z.literal("")),
  category: z.enum(CATEGORIES).default("GENERAL"),
  visibility: z.enum(DOCUMENT_VISIBILITIES).default("MEMBERS"),
  fileName: z.string().max(200).optional().or(z.literal("")),
  fileSize: z.number().int().nonnegative().optional(),
  mimeType: z.string().max(120).optional().or(z.literal("")),
  versionOfId: z.string().optional().or(z.literal("")),
});

// Treat the legacy shared admin login as a super-admin for libraries.
// Officers with `documents: write` get the same permissions.
async function ensureWrite() {
  const session = await getCurrentSession();
  if (!session) return { ok: false, status: 401, error: "Sign in first" } as const;
  if (session.isAdmin) return { ok: true } as const;
  const perms = await getCurrentOfficerPermissions();
  if (!hasPermission(perms, "documents", "write")) {
    return { ok: false, status: 403, error: "You need the Documents permission to do that." } as const;
  }
  return { ok: true } as const;
}

export async function GET(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const where: any = {};
  if (category && (CATEGORIES as readonly string[]).includes(category)) where.category = category;
  const docs = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ documents: docs });
}

export async function POST(req: Request) {
  const gate = await ensureWrite();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });

  const me = getCurrentBrotherId();
  const data = parsed.data;
  const created = await prisma.document.create({
    data: {
      name: data.name,
      description: data.description || null,
      url: data.url,
      blobUrl: data.blobUrl || data.url,
      category: data.category,
      visibility: data.visibility,
      fileName: data.fileName || null,
      fileSize: typeof data.fileSize === "number" ? data.fileSize : null,
      size: typeof data.fileSize === "number" ? data.fileSize : null, // legacy mirror
      mimeType: data.mimeType || null,
      uploadedById: me,
      versionOfId: data.versionOfId || null,
    },
  });
  return NextResponse.json({ ok: true, document: created });
}

export async function PATCH(req: Request) {
  const gate = await ensureWrite();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const PatchSchema = Schema.partial().extend({ id: z.string().min(1) });
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  const { id, ...rest } = parsed.data;
  const data: any = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v === "" || v === undefined) continue;
    data[k] = v;
  }
  // Mirror fileSize → size when changed
  if (typeof rest.fileSize === "number") data.size = rest.fileSize;
  // Mirror url → blobUrl when blob URL absent
  if (rest.url && !rest.blobUrl) data.blobUrl = rest.url;

  const updated = await prisma.document.update({ where: { id }, data });
  return NextResponse.json({ ok: true, document: updated });
}

export async function DELETE(req: Request) {
  const gate = await ensureWrite();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
