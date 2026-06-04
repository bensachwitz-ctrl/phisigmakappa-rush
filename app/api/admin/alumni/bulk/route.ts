import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole, isSameOrigin, getCurrentBrother } from "@/lib/auth";
import { normaliseAlumniInput } from "@/lib/alumni";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-row body shape. Each entry MUST carry its 0-based `row` index so the
// client can reconcile results against its editable table. All other fields are
// validated by normaliseAlumniInput (the same gate the single-create route
// uses) — we only assert presence/shape here.
const BodySchema = z.object({
  members: z
    .array(z.object({ row: z.number().int().min(0) }).passthrough())
    .min(1)
    .max(500),
  // AlumniProfile has no portal-login concept the way Brother does; alumni
  // invites are issued per-row from the alumni manager UI. We accept the flag
  // for symmetry but only act on it when an email is present.
  sendInvites: z.boolean().optional(),
});

type RowResult = {
  row: number;
  status: "added" | "duplicate" | "error";
  id?: string;
  name?: string;
  error?: string;
};

/** Soft-dedupe key — AlumniProfile has no unique constraint on name/email, so
 *  we treat "same full name + same graduation year" as the duplicate identity.
 *  Lowercased + whitespace-collapsed so "John  Doe" == "john doe". */
function dedupeKey(fullName: string, gradYear: number): string {
  return `${fullName.trim().toLowerCase().replace(/\s+/g, " ")}::${gradYear}`;
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole()) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "Bad origin" }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });

  const { members } = parsed.data;

  // Existing alumni keyed by (name, gradYear) for soft-dedupe. There's no DB
  // unique to lean on, so this pre-check is the ONLY dedupe — make it count.
  const existing = await prisma.alumniProfile
    .findMany({ select: { fullName: true, graduationYear: true } })
    .catch(() => [] as Array<{ fullName: string; graduationYear: number }>);
  const seen = new Set(existing.map((a) => dedupeKey(a.fullName, a.graduationYear)));
  const batchSeen = new Set<string>();

  const results: RowResult[] = [];

  for (const raw of members) {
    const rowIndex = typeof raw.row === "number" ? raw.row : results.length;

    // Reuse the single-create normaliser so bulk and single share EXACT same
    // validation + trimming + clamping (graduationYear range, 500-char caps).
    const norm = normaliseAlumniInput(raw);
    if ("error" in norm) {
      results.push({
        row: rowIndex,
        status: "error",
        name: typeof raw.fullName === "string" ? raw.fullName : undefined,
        error: norm.error,
      });
      continue;
    }

    const key = dedupeKey(norm.fullName, norm.graduationYear);
    if (seen.has(key) || batchSeen.has(key)) {
      results.push({
        row: rowIndex,
        status: "duplicate",
        name: norm.fullName,
        error: `Already in directory (class of ${norm.graduationYear})`,
      });
      continue;
    }

    try {
      // Per-row create (not a single transaction) so a bad row never rolls back
      // good ones — partial-success contract, identical to the brothers route.
      const created = await prisma.alumniProfile.create({ data: norm as any });
      seen.add(key);
      batchSeen.add(key);
      results.push({ row: rowIndex, status: "added", id: created.id, name: created.fullName });
    } catch {
      results.push({ row: rowIndex, status: "error", name: norm.fullName, error: "Could not create" });
    }
  }

  const added = results.filter((x) => x.status === "added");
  const duplicates = results.filter((x) => x.status === "duplicate").length;
  const errors = results.filter((x) => x.status === "error").length;

  if (added.length > 0) {
    const actor = await getCurrentBrother().catch(() => null);
    await audit({
      action: "ALUMNI_BULK_CREATED",
      subjectType: "AlumniProfile",
      subjectId: null,
      subjectName: `${added.length} alumni`,
      details: `bulk import by ${actor?.name || "admin"} — ${added.length} added, ${duplicates} duplicate, ${errors} error`,
      req,
    });
  }

  return NextResponse.json({
    ok: true,
    results,
    summary: { added: added.length, duplicates, errors },
  });
}
