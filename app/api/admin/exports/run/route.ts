import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireOfficerPermission } from "@/lib/permissions";
import { getCurrentBrother, getCurrentBrotherId } from "@/lib/auth";
import {
  buildAcademicExport,
  buildAnnualReportHtml,
  buildFinancialExport,
  buildMembershipExport,
  buildPhilanthropyExport,
  isHqExportType,
  type HqExportType,
} from "@/lib/hq-exports";
import { getSiteConfig } from "@/lib/site-config";
import { auditAndNotify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/exports/run
 *
 * Body: { exportType: HqExportType, termCode: string }
 *
 * Synchronous in v1 — for the chapter's data scale (<100 brothers, single
 * term), generation finishes in well under a request budget. Future
 * scale-up moves the body into a background job.
 *
 * Gated via `payments` write permission (treasurer + president) plus the
 * super-admin short-circuit.
 */
export async function POST(req: Request) {
  try {
    await requireOfficerPermission("payments", "write");
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.code || "FORBIDDEN" }, { status: e?.status || 403 });
  }
  let raw: any;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const exportType = raw?.exportType;
  const termCode = String(raw?.termCode ?? "").trim();
  if (!isHqExportType(exportType)) {
    return NextResponse.json({ ok: false, error: "invalid exportType" }, { status: 400 });
  }
  if (!termCode || termCode.length > 32) {
    return NextResponse.json({ ok: false, error: "termCode required" }, { status: 400 });
  }
  const createdById = getCurrentBrotherId() || "system";

  const run = await prisma.hqExportRun.create({
    data: { exportType, termCode, status: "generating", createdById },
  });

  try {
    const file = await buildExport(exportType, termCode);
    const filename = `hq-exports/${exportType}-${termCode}-${Date.now()}.${file.extension}`;

    let fileUrl: string | null = null;
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      const { url } = await put(filename, file.body, {
        access: "public",
        addRandomSuffix: false,
        contentType: file.contentType,
        token,
      });
      fileUrl = url;
    } else {
      // Dev mock: serve via /api/admin/exports/[id]/download which can read the
      // stored body. We persist the body inline in a SiteConfig key so it
      // survives request boundaries without a blob token. Limit to 1 MB.
      if (file.body.length < 1_000_000) {
        await prisma.siteConfig
          .upsert({
            where: { key: `hq-export-mock:${run.id}` },
            create: { key: `hq-export-mock:${run.id}`, value: file.body },
            update: { value: file.body },
          })
          .catch(() => null);
      }
      fileUrl = `/api/admin/exports/${run.id}/download`;
    }

    const completed = await prisma.hqExportRun.update({
      where: { id: run.id },
      data: {
        status: "complete",
        fileUrl,
        rowCount: file.rowCount,
        completedAt: new Date(),
      },
    });

    try {
      const actor = await getCurrentBrother();
      const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
      const ua = req.headers.get("user-agent") || null;
      await auditAndNotify("hq.export.run", {
        actor: {
          brotherId: actor?.id ?? null,
          name: actor?.name ?? "Officer",
          role: "president",
          ipAddress: ip,
          userAgent: ua,
        },
        entity: {
          type: "HqExportRun",
          id: completed.id,
          name: `${exportType} (${termCode})`,
        },
        payload: {
          exportType,
          termCode,
          rowCount: file.rowCount,
          fileUrl,
        },
      });
    } catch {
      // best-effort
    }

    return NextResponse.json({ ok: true, run: completed });
  } catch (err: any) {
    await prisma.hqExportRun.update({
      where: { id: run.id },
      data: { status: "failed", errorMessage: err?.message || "build failed", completedAt: new Date() },
    });
    return NextResponse.json({ ok: false, error: err?.message || "build failed" }, { status: 500 });
  }
}

async function buildExport(exportType: HqExportType, termCode: string) {
  switch (exportType) {
    case "membership": {
      const brothers = await prisma.brother.findMany({
        where: { status: { in: ["ACTIVE", "INITIATE", "PLEDGE"] } },
        orderBy: [{ status: "asc" }, { name: "asc" }],
      });
      return buildMembershipExport({ termCode, brothers: brothers as any });
    }
    case "academic": {
      // Brain W2 had a dedicated AcademicTerm model that this merge does not
      // include — the R43 fork persists per-brother academic standing on
      // Brother.academicStanding only. We surface what's available and leave
      // gpaTerm / gpaCumulative / creditHours null so the export still builds.
      const brothers = await prisma.brother.findMany({
        where: { status: { in: ["ACTIVE", "INITIATE", "PLEDGE"] } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, academicStanding: true },
      });
      return buildAcademicExport({
        termCode,
        rows: brothers.map((b) => ({
          memberId: b.id,
          memberName: b.name,
          gpaTerm: null,
          gpaCumulative: null,
          creditHours: null,
          standing: (b.academicStanding || "").toLowerCase() || null,
        })),
      });
    }
    case "financial": {
      // Brain W2 had a dedicated DuesAssessment model with per-member
      // payment rows tied to it. The R43 fork uses a simpler shape — one
      // DuesPayment row per brother keyed by `year` instead of assessment.
      // We aggregate from that shape directly, scoping by the slug-cased
      // termCode (mapped to `year` field).
      const payments = await prisma.duesPayment.findMany({
        where: { year: { contains: termCode.toLowerCase().split("-")[0] } },
        include: { brother: { select: { id: true, name: true } } },
      });
      const perMember = new Map<
        string,
        { memberId: string; memberName: string; amountAssessedCents: number; amountPaidCents: number; status: string }
      >();
      for (const p of payments) {
        const slot = perMember.get(p.brotherId) ?? {
          memberId: p.brotherId,
          memberName: p.brother?.name || p.brotherId,
          amountAssessedCents: 0,
          amountPaidCents: 0,
          status: p.status,
        };
        slot.amountAssessedCents += p.amountCents;
        if (p.status === "PAID") slot.amountPaidCents += p.amountCents;
        slot.status = p.status;
        perMember.set(p.brotherId, slot);
      }
      return buildFinancialExport({ termCode, rows: [...perMember.values()] });
    }
    case "philanthropy": {
      const logs = await prisma.serviceHourLog.findMany({
        where: { status: "approved" },
        include: { member: { select: { id: true, name: true } } },
      });
      const perMember = new Map<string, { memberId: string; memberName: string; totalHours: number; eventsAttended: number }>();
      for (const l of logs) {
        const slot = perMember.get(l.memberId) ?? {
          memberId: l.memberId,
          memberName: (l as any).member?.name || l.memberId,
          totalHours: 0,
          eventsAttended: 0,
        };
        slot.totalHours += Number(l.hoursLogged);
        slot.eventsAttended += 1;
        perMember.set(l.memberId, slot);
      }
      return buildPhilanthropyExport({ termCode, rows: [...perMember.values()] });
    }
    case "annual_report": {
      const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
      const [memberCount, payments, hourLogs, incidents] = await Promise.all([
        prisma.brother.count({ where: { status: { in: ["ACTIVE", "INITIATE"] } } }),
        prisma.duesPayment.findMany({
          where: { year: { contains: termCode.toLowerCase().split("-")[0] } },
        }),
        prisma.serviceHourLog.findMany({ where: { status: "approved" } }),
        prisma.incidentReport.count(),
      ]);
      // GPA data was Brain-W2 only (AcademicTerm table); without it we can't
      // produce a chapter GPA value. The annual report renderer accepts
      // chapterGpa as optional and degrades gracefully.
      const chapterGpa: number | undefined = undefined;
      const duesAssessedCents = payments.reduce((s, p) => s + p.amountCents, 0);
      const duesCollectedCents = payments
        .filter((p) => p.status === "PAID")
        .reduce((s, p) => s + p.amountCents, 0);
      const serviceHoursTotal = hourLogs.reduce((s, h) => s + Number(h.hoursLogged), 0);
      const philanthropyRaisedDollars = parseFloat((cfg["philanthropy.raisedAmount"] || "0").replace(/[^0-9.]/g, ""));
      return buildAnnualReportHtml({
        chapterName: "Phi Sigma Kappa — Gamma Triton",
        termCode,
        memberCount,
        chapterGpa,
        duesCollectedCents,
        duesAssessedCents,
        serviceHoursTotal,
        philanthropyRaisedCents: Math.round((philanthropyRaisedDollars || 0) * 100),
        incidentCount: incidents,
      });
    }
  }
}
