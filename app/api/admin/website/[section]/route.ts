import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole, isSameOrigin } from "@/lib/auth";
import { guardBillingWrite } from "@/lib/billing-guard";
import { audit } from "@/lib/audit";
import { ensureSectionTables, getSectionRecords } from "@/lib/section-builder";
import { isKnownSectionKey, KNOWN_SECTION_KEYS } from "@/components/site/templates/template-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/admin/website/[section] — structured section-builder persistence.
 *
 * Admin-only (matches /api/admin/settings: cookie auth + admin ROLE + CSRF
 * same-origin). Writes into the per-tenant Section + SectionContent tables (the
 * typed successor to cfg["website.sections"] + the *.json SiteConfig repeaters).
 *
 * The structured store is OPT-IN: it stays empty (and the public site keeps its
 * byte-identical legacy SiteConfig render) until an admin saves here. The first
 * save self-heals the tables on this tenant's schema (ensureSectionTables), so an
 * un-migrated existing tenant provisions them on demand without a deploy.
 *
 * PATCH body (all fields optional, but at least one must be present):
 *   {
 *     sortOrder?: number,         // this section's render position
 *     visible?: boolean,          // this section's visibility
 *     content?: Record<string,string>,  // per-section editable copy overrides
 *     order?: string[]            // OPTIONAL full-layout reorder — rewrites the
 *                                 // sortOrder of EVERY listed section in one save
 *                                 // (the section in the URL is still upserted with
 *                                 // its own sortOrder/visible/content too).
 *   }
 *
 * GET returns the current structured records (empty array = legacy mode).
 */

const PatchSchema = z
  .object({
    sortOrder: z.number().int().min(0).max(10_000).optional(),
    visible: z.boolean().optional(),
    content: z.record(z.string().max(120), z.string().max(20_000)).optional(),
    order: z.array(z.string().max(60)).max(64).optional(),
  })
  .refine(
    (b) =>
      b.sortOrder !== undefined ||
      b.visible !== undefined ||
      b.content !== undefined ||
      b.order !== undefined,
    { message: "No changes supplied" },
  );

function gate(req: Request): NextResponse | null {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Bad origin" }, { status: 403 });
  }
  return null;
}

export async function GET(
  req: Request,
  { params }: { params: { section: string } },
) {
  const denied = gate(req);
  if (denied) return denied;

  const records = await getSectionRecords();
  const one = records.find((r) => r.key === params.section) ?? null;
  return NextResponse.json({ ok: true, section: one, all: records });
}

export async function PATCH(
  req: Request,
  { params }: { params: { section: string } },
) {
  const denied = gate(req);
  if (denied) return denied;
  const billingLocked = await guardBillingWrite();
  if (billingLocked) return billingLocked;

  const sectionKey = params.section;
  if (!isKnownSectionKey(sectionKey)) {
    return NextResponse.json(
      { ok: false, error: `Unknown section "${sectionKey}"` },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }
  const { sortOrder, visible, content, order } = parsed.data;

  // Any "order" entries that aren't real section keys are dropped (never persist
  // a typo) rather than failing the whole save.
  const cleanOrder = order?.filter((k) => isKnownSectionKey(k));

  // Self-heal the tables on this tenant schema before the first write. If the DDL
  // fails (e.g. read-only role), surface a 503 rather than a 500 stack so the
  // legacy SiteConfig path stays the source of truth.
  const ready = await ensureSectionTables();
  if (!ready) {
    return NextResponse.json(
      { ok: false, error: "Section store unavailable" },
      { status: 503 },
    );
  }

  try {
    const changed: string[] = [];

    // 1. Full-layout reorder (optional). Rewrites sortOrder for every listed
    //    section in index order (0,1,2,…), upserting a row for each so a section
    //    that has never been customized still gets a stable position.
    if (cleanOrder && cleanOrder.length > 0) {
      for (let i = 0; i < cleanOrder.length; i++) {
        const key = cleanOrder[i];
        await prisma.section.upsert({
          where: { key },
          update: { sortOrder: i },
          create: { key, sortOrder: i },
        });
      }
      changed.push(`order(${cleanOrder.length})`);
    }

    // 2. Upsert THIS section's own order/visibility. When an explicit `order` was
    //    supplied, the section's index there already set its sortOrder; an
    //    additional `sortOrder` in the body still wins as an explicit override.
    const sectionUpdate: { sortOrder?: number; visible?: boolean } = {};
    if (sortOrder !== undefined) sectionUpdate.sortOrder = sortOrder;
    if (visible !== undefined) sectionUpdate.visible = visible;

    let section = await prisma.section.findUnique({ where: { key: sectionKey } });
    if (!section) {
      section = await prisma.section.create({
        data: {
          key: sectionKey,
          sortOrder: sectionUpdate.sortOrder ?? 100,
          visible: sectionUpdate.visible ?? true,
        },
      });
      if (sortOrder !== undefined) changed.push("sortOrder");
      if (visible !== undefined) changed.push("visible");
    } else if (Object.keys(sectionUpdate).length > 0) {
      section = await prisma.section.update({
        where: { id: section.id },
        data: sectionUpdate,
      });
      if (sortOrder !== undefined) changed.push("sortOrder");
      if (visible !== undefined) changed.push("visible");
    }

    // 3. Upsert per-section content fields. An empty string clears a field's
    //    override (the renderer then falls back to the SiteConfig default).
    if (content) {
      for (const [field, value] of Object.entries(content)) {
        await prisma.sectionContent.upsert({
          where: { sectionId_field: { sectionId: section.id, field } },
          update: { value },
          create: { sectionId: section.id, field, value },
        });
      }
      changed.push(`content(${Object.keys(content).length})`);
    }

    await audit({
      action: "WEBSITE_SECTION_UPDATED",
      subjectType: "Section",
      subjectId: section.id,
      subjectName: sectionKey,
      details: changed.join(", ") || "no-op",
      req,
    });

    return NextResponse.json({ ok: true, section: { key: sectionKey, id: section.id }, changed });
  } catch (err: any) {
    console.error("[admin/website/[section] PATCH]", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** Expose the known keys for any client that wants to render the full list. */
export async function OPTIONS() {
  return NextResponse.json({ ok: true, keys: KNOWN_SECTION_KEYS });
}
