// /api/admin/rushees/[id] — single-PNM detail + patch endpoint.
//
// GET shape feeds the /admin/rushees/[id] detail page: photo + bio + every
// event the PNM showed up to (joined to the Attendance + Event tables) +
// the running list of impressions left by brothers + the bid status.
//
// PATCH handles inline edits (notes, status, simple profile fields). It's
// distinct from /api/admin/rush PATCH only in that it routes through
// auditAndNotify(), the established Phi Sig pattern — the existing
// /api/admin/rush endpoint pre-dates auditAndNotify and uses the older
// audit() helper for backwards compatibility with /admin's dashboard.
//
// "Convert to pledge" — flips Rush.status to ACCEPTED + creates a Brother
// row with status="PROSPECT". This mirrors the manual e-board step that
// otherwise required a separate brother-add round-trip.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole, isSameOrigin } from "@/lib/auth";
import { guardOfficerOrAdmin } from "@/lib/permissions";
import { actorFromRequest, auditAndNotify } from "@/lib/notify";
import { RUSH_STATUSES } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  notes: z.string().max(4000).optional(),
  status: z.enum(RUSH_STATUSES).optional(),
  major: z.string().max(120).optional().or(z.literal("")),
  year: z.string().max(40).optional().or(z.literal("")),
  hometown: z.string().max(160).optional().or(z.literal("")),
  // Special action — "convert to pledge". Flips status to ACCEPTED and
  // shadow-creates a Brother row with status="PROSPECT" so the new pledge
  // shows up in /admin/brothers without manual re-entry.
  convertToPledge: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  // Single-PNM detail bundles contact info, notes, votes-with-voter, and
  // impressions — officer/admin floor (API twin of the /admin layout boundary),
  // not isAdminAuthed() alone.
  const denied = await guardOfficerOrAdmin();
  if (denied) return denied;
  try {
    const rush = await prisma.rush.findUnique({
      where: { id: params.id },
      include: {
        votes: {
          orderBy: { createdAt: "desc" },
          include: { brother: { select: { name: true } } },
        },
        attendances: {
          include: {
            event: {
              select: { id: true, name: true, startsAt: true, category: true },
            },
          },
        },
        impressions: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!rush) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      rush: {
        ...rush,
        createdAt: rush.createdAt.toISOString(),
        updatedAt: rush.updatedAt.toISOString(),
        bidTokenExpiresAt: rush.bidTokenExpiresAt ? rush.bidTokenExpiresAt.toISOString() : null,
        bidRespondedAt: rush.bidRespondedAt ? rush.bidRespondedAt.toISOString() : null,
        enrichedAt: rush.enrichedAt ? rush.enrichedAt.toISOString() : null,
        votes: rush.votes.map((v) => ({
          ...v,
          createdAt: v.createdAt.toISOString(),
          updatedAt: v.updatedAt.toISOString(),
        })),
        attendances: rush.attendances.map((a) => ({
          id: a.id,
          attended: a.attended,
          createdAt: a.createdAt.toISOString(),
          event: {
            ...a.event,
            startsAt: a.event.startsAt.toISOString(),
          },
        })),
        impressions: rush.impressions.map((i) => ({
          ...i,
          createdAt: i.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    console.error("[/api/admin/rushees/[id] GET]", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Origin not allowed" }, { status: 403 });
  }
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const before = await prisma.rush.findUnique({
    where: { id: params.id },
    select: { 
      name: true, 
      status: true, 
      notes: true, 
      major: true, 
      year: true, 
      hometown: true,
      email: true,
      phone: true,
      enrichmentData: true
    },
  });
  if (!before) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  try {
    // "Convert to pledge" branch: flips status, then shadow-creates a Brother.
    // The Brother create is best-effort (failure doesn't block status flip)
    // and dedupes by email so a re-click is idempotent.
    if (data.convertToPledge) {
      const updated = await prisma.rush.update({
        where: { id: params.id },
        data: { status: "ACCEPTED" },
      });
      let createdBrotherId: string | null = null;
      try {
        const exists = await prisma.brother.findFirst({
          where: { OR: [{ email: updated.email }, { name: updated.name }] },
        });
        if (!exists) {
          const b = await prisma.brother.create({
            data: {
              name: updated.name,
              email: updated.email,
              phone: updated.phone,
              year: updated.year,
              major: updated.major,
              status: "PROSPECT",
            },
          });
          createdBrotherId = b.id;

          // Copy bid waiver info and create a Document record (Compliance Audit Trail)
          if (updated.enrichmentData) {
            try {
              const enrichment = JSON.parse(updated.enrichmentData);
              const waiverUrl = enrichment.bidWaiverUrl;
              const signatureName = enrichment.signatureName;
              const signedAt = enrichment.signedAt;

              if (waiverUrl) {
                await prisma.document.create({
                  data: {
                    name: `${updated.name} - Signed Bid & Anti-Hazing Waiver`,
                    description: `Digitally signed by ${signatureName || updated.name} on ${signedAt ? new Date(signedAt).toLocaleDateString() : new Date().toLocaleDateString()}`,
                    url: waiverUrl,
                    blobUrl: waiverUrl,
                    category: "POLICIES",
                    visibility: "OFFICERS",
                    fileName: `${updated.name.replace(/\s+/g, "_")}_bid_waiver.pdf`,
                    uploadedById: b.id,
                  },
                });
              }
            } catch (jsonErr) {
              console.error("[rushees/PATCH convert] JSON parse or document create failed:", jsonErr);
            }
          }
        }
      } catch (innerErr) {
        // Best-effort: log but don't fail the conversion. Rush.status is
        // already ACCEPTED so the chair can manually add the Brother row if
        // the auto-create lost a race.
        console.warn("[rushees/PATCH convert] brother create failed:", innerErr);
      }
      await auditAndNotify("rushee.update", {
        actor: actorFromRequest(req, { role: "admin", name: "admin (shared)" }),
        entity: { type: "Rush", id: updated.id, name: updated.name },
        payload: { before: { status: before.status }, after: { status: "ACCEPTED" }, createdBrotherId },
        details: "converted to pledge",
      });
      return NextResponse.json({ ok: true, rush: updated, createdBrotherId });
    }

    // Standard field patch.
    const dataPatch: Record<string, string | null> = {};
    if (typeof data.notes === "string") dataPatch.notes = data.notes;
    if (data.status) dataPatch.status = data.status;
    if (typeof data.major === "string") dataPatch.major = data.major || null;
    if (typeof data.year === "string") dataPatch.year = data.year || null;
    if (typeof data.hometown === "string") dataPatch.hometown = data.hometown || null;

    if (Object.keys(dataPatch).length === 0) {
      return NextResponse.json({ ok: false, error: "No-op patch" }, { status: 400 });
    }
    const updated = await prisma.rush.update({
      where: { id: params.id },
      data: dataPatch,
    });
    await auditAndNotify("rushee.update", {
      actor: actorFromRequest(req, { role: "admin", name: "admin (shared)" }),
      entity: { type: "Rush", id: updated.id, name: updated.name },
      payload: { before, after: dataPatch },
    });
    return NextResponse.json({ ok: true, rush: updated });
  } catch (err) {
    console.error("[/api/admin/rushees/[id] PATCH]", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
