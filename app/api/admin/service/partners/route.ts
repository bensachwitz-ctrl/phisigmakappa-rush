import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOfficer } from "@/lib/permissions";
import { getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  name: z.string().min(2).max(200),
  website: z.string().url().max(500).optional().nullable(),
  contactEmail: z.string().email().max(200).optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  active: z.boolean().optional(),
});

/** GET /api/admin/service/partners */
export async function GET() {
  const denied = await guardOfficer("service", "read");
  if (denied) return denied;
  const partners = await prisma.servicePartnerOrg.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ ok: true, partners });
}

/** POST /api/admin/service/partners — philanthropy chair only. */
export async function POST(req: Request) {
  const denied = await guardOfficer("service", "write");
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const created = await prisma.servicePartnerOrg.create({
    data: {
      name: parsed.data.name,
      website: parsed.data.website ?? null,
      contactEmail: parsed.data.contactEmail ?? null,
      contactPhone: parsed.data.contactPhone ?? null,
      description: parsed.data.description ?? null,
      active: parsed.data.active ?? true,
    },
  }).catch((e) => {
    return null;
  });
  if (!created) {
    return NextResponse.json({ ok: false, error: "A partner with that name already exists." }, { status: 400 });
  }

  try {
    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify("service.partner.create", {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "Service Chair",
        role: "service-chair",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "ServicePartnerOrg",
        id: created.id,
        name: created.name,
      },
      payload: { after: created },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, partner: created });
}
