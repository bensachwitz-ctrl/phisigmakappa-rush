import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentBrotherId, getCurrentSession } from "@/lib/auth";
import { hasPermission, getCurrentOfficerPermissions, guardOfficerOrAdmin } from "@/lib/permissions";
import { checkBillingLock } from "@/lib/billing-guard";
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
  if (!session.isAdmin) {
    const perms = await getCurrentOfficerPermissions();
    if (!hasPermission(perms, "documents", "write")) {
      return { ok: false, status: 403, error: "You need the Documents permission to do that." } as const;
    }
  }
  // BILLING WRITE GUARD (P1): a locked-out chapter may READ documents but not
  // upload/edit/delete them. Server-side entitlement re-check, not the cookie.
  const { locked } = await checkBillingLock();
  if (locked) {
    return { ok: false, status: 402, error: "Billing Lockout: activate your subscription at /admin/billing." } as const;
  }
  return { ok: true } as const;
}

export async function GET(req: Request) {
  // Coarse officer/admin floor (API twin of the /admin layout boundary): a plain
  // member-login cookie can't list the chapter library straight from the JSON.
  const denied = await guardOfficerOrAdmin();
  if (denied) return denied;

  // Document.visibility was written (PUBLIC|MEMBERS|INITIATES|OFFICERS) but never
  // enforced on this read — so OFFICERS-tagged documents (signed bid/anti-hazing
  // waivers, sensitive policy PDFs) shipped to ANY officer/admin session. Filter
  // OFFICERS-only docs to callers who actually hold the documents domain (admins
  // short-circuit). Officers without it see everything EXCEPT the OFFICERS tier.
  const session = await getCurrentSession();
  let canSeeOfficerDocs = !!session?.isAdmin;
  if (!canSeeOfficerDocs) {
    const perms = await getCurrentOfficerPermissions();
    canSeeOfficerDocs = hasPermission(perms, "documents", "read");
  }

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const where: any = {};
  if (category && (CATEGORIES as readonly string[]).includes(category)) where.category = category;
  if (!canSeeOfficerDocs) where.visibility = { not: "OFFICERS" };
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
