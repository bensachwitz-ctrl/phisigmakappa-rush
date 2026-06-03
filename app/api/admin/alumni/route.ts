import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOfficerPermission } from "@/lib/permissions";
import { normaliseAlumniInput, parseAlumniCsvRow } from "@/lib/alumni";
import { getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — list all alumni (admin-only). Supports `?gradYear=2020` and
 * `?search=lastname` filters; default sort is graduationYear desc then name.
 */
export async function GET(req: Request) {
  try {
    await requireOfficerPermission("alumni", "read");
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.code || "FORBIDDEN" }, { status: e?.status || 403 });
  }
  const url = new URL(req.url);
  const gradYear = url.searchParams.get("gradYear");
  const search = url.searchParams.get("search");
  const where: any = {};
  if (gradYear) {
    const y = parseInt(gradYear, 10);
    if (Number.isFinite(y)) where.graduationYear = y;
  }
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { employer: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];
  }
  const alumni = await prisma.alumniProfile
    .findMany({
      where,
      orderBy: [{ graduationYear: "desc" }, { fullName: "asc" }],
      include: { donations: { orderBy: { recordedAt: "desc" }, take: 5 } },
    })
    .catch(() => []);
  return NextResponse.json({ ok: true, alumni });
}

/**
 * POST — create one alumni row, OR a bulk import via `{ csv: { headers, rows } }`.
 */
export async function POST(req: Request) {
  try {
    await requireOfficerPermission("alumni", "write");
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.code || "FORBIDDEN" }, { status: e?.status || 403 });
  }
  let raw: any;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // CSV bulk import path
  if (raw?.csv && Array.isArray(raw.csv.headers) && Array.isArray(raw.csv.rows)) {
    const headers: string[] = raw.csv.headers;
    const ok: any[] = [];
    const errors: Array<{ row: number; error: string }> = [];
    for (let i = 0; i < raw.csv.rows.length; i++) {
      const parsed = parseAlumniCsvRow(headers, raw.csv.rows[i] || []);
      if ("error" in parsed) {
        errors.push({ row: i + 1, error: parsed.error });
        continue;
      }
      try {
        const created = await prisma.alumniProfile.create({ data: parsed as any });
        ok.push(created);
      } catch (err: any) {
        errors.push({ row: i + 1, error: err?.message || "create failed" });
      }
    }
    if (ok.length > 0) {
      try {
        const actor = await getCurrentBrother();
        const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
        const ua = req.headers.get("user-agent") || null;
        await auditAndNotify("alumni.create", {
          actor: {
            brotherId: actor?.id ?? null,
            name: actor?.name ?? "Secretary",
            role: "secretary",
            ipAddress: ip,
            userAgent: ua,
          },
          entity: {
            type: "AlumniProfile",
            id: null,
            name: `${ok.length} alumni`,
          },
          payload: { imported: ok.length, failed: errors.length },
          details: "via CSV import",
        });
      } catch {
        // best-effort
      }
    }
    return NextResponse.json({ ok: true, imported: ok.length, failed: errors.length, errors });
  }

  // Single row
  const parsed = normaliseAlumniInput(raw);
  if ("error" in parsed) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  const created = await prisma.alumniProfile.create({ data: parsed as any });

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("alumni.create", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "Secretary",
        role: "secretary",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "AlumniProfile",
        id: created.id,
        name: created.fullName,
      },
      payload: { after: created },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, alumni: created });
}
