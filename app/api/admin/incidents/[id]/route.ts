import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOfficerPermission } from "@/lib/permissions";
import {
  INCIDENT_SEVERITY_OPTIONS,
  INCIDENT_STATUS_OPTIONS,
} from "@/lib/incident";
import { getCurrentBrother } from "@/lib/auth";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  status: z.enum(INCIDENT_STATUS_OPTIONS as unknown as [string, ...string[]]).optional(),
  severity: z.enum(INCIDENT_SEVERITY_OPTIONS as unknown as [string, ...string[]]).optional(),
  assignedToId: z.string().nullable().optional(),
  resolutionNotes: z.string().max(5000).nullable().optional(),
});

/**
 * GET /api/admin/incidents/[id] — risk officer detail view.
 *
 * Returns the reporter relation ONLY when isAnonymous=false. For anonymous
 * reports we explicitly null the reporter so any leaked downstream renderer
 * cannot accidentally display it.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await requireOfficerPermission("risk", "read");
  const incident = await prisma.incidentReport.findUnique({
    where: { id: params.id },
    include: {
      acknowledgments: {
        include: { brother: { select: { id: true, name: true } } },
      },
    },
  });
  if (!incident) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  let reporter: { id: string; name: string } | null = null;
  if (!incident.isAnonymous && incident.reporterId) {
    reporter = await prisma.brother
      .findUnique({ where: { id: incident.reporterId }, select: { id: true, name: true } })
      .catch(() => null);
  }
  return NextResponse.json({ ok: true, incident: { ...incident, reporter } });
}

/** PATCH /api/admin/incidents/[id] — risk officer updates triage state. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  await requireOfficerPermission("risk", "write");
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const existing = await prisma.incidentReport.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const data: any = {};
  if (parsed.data.status) {
    data.status = parsed.data.status;
    if (parsed.data.status === "resolved" && !existing.resolvedAt) {
      data.resolvedAt = new Date();
    }
  }
  if (parsed.data.severity) data.severity = parsed.data.severity;
  if (parsed.data.assignedToId !== undefined) data.assignedToId = parsed.data.assignedToId;
  if (parsed.data.resolutionNotes !== undefined) data.resolutionNotes = parsed.data.resolutionNotes;

  const updated = await prisma.incidentReport.update({ where: { id: params.id }, data });

  try {
    // Choose the right action verb based on what changed. Status change
    // wins; severity escalations also surface as incident.escalate.
    let action: string = "incident.triage";
    if (parsed.data.status === "resolved") action = "incident.resolve";
    else if (parsed.data.status === "escalated") action = "incident.escalate";
    else if (parsed.data.status === "reviewing") action = "incident.triage";
    else if (
      parsed.data.severity &&
      parsed.data.severity !== existing.severity &&
      (parsed.data.severity === "high" || parsed.data.severity === "critical")
    ) {
      action = "incident.escalate";
    }

    const actor = await getCurrentBrother();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await auditAndNotify(action, {
      actor: {
        brotherId: actor?.id ?? null,
        name: actor?.name ?? "Risk Officer",
        role: "risk-manager",
        ipAddress: ip,
        userAgent: ua,
      },
      entity: {
        type: "IncidentReport",
        id: updated.id,
        name: updated.receiptCode || updated.id,
      },
      payload: {
        before: {
          status: existing.status,
          severity: existing.severity,
          assignedToId: existing.assignedToId,
        },
        after: {
          status: updated.status,
          severity: updated.severity,
          assignedToId: updated.assignedToId,
        },
      },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, incident: updated });
}
