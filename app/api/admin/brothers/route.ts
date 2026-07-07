import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole, getCurrentBrotherId } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getSiteConfig } from "@/lib/site-config";
import { getCurrentOfficerPermissions, hasPermission, guardOfficer, guardOfficerOrAdmin } from "@/lib/permissions";
import { isSelfEditableField } from "@/lib/self-edit-fields";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public-safe brother fields — used in select on every response so passwordHash
// never ships to the client (audit-flagged HIGH risk on POST + PATCH paths;
// GET was already safe). Helper centralizes the column list.
const PUBLIC_BROTHER_SELECT = {
  id: true, name: true, email: true, phone: true,
  year: true, major: true, position: true, pledgeClass: true,
  bio: true, headshotUrl: true,
  duesPaid: true, serviceHours: true, studyHours: true,
  role: true,
  createdAt: true, updatedAt: true, lastSeen: true,
  status: true,
  pledgeClassName: true,
  pledgeLineNumber: true,
  initiationDate: true,
  graduationYear: true,
  academicStanding: true,
} as const;

const Schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  year: z.string().max(40).optional().or(z.literal("")),
  major: z.string().max(120).optional().or(z.literal("")),
  position: z.string().max(120).optional().or(z.literal("")),
  pledgeClass: z.string().max(80).optional().or(z.literal("")),
  bio: z.string().max(2000).optional().or(z.literal("")),
  headshotUrl: z.string().url().max(2048).optional().or(z.literal("")),
  duesPaid: z.boolean().optional(),
  serviceHours: z.number().int().min(0).optional(),
  studyHours: z.number().int().min(0).optional(),
  role: z.enum(["MEMBER", "ADMIN"]).optional(),
  status: z.string().max(40).optional(),
  pledgeClassName: z.string().max(80).optional().nullable(),
  pledgeLineNumber: z.number().int().min(0).optional().nullable(),
  initiationDate: z.string().optional().nullable(),
  graduationYear: z.number().int().min(1900).max(2100).optional().nullable(),
  academicStanding: z.string().max(40).optional().nullable(),
});

export async function GET() {
  // Coarse officer/admin gate (API twin of the /admin layout boundary): the GET
  // ships full roster PII, so a plain member-login cookie — valid, but no
  // officer assignment — must be 403'd here just as it's bounced from the UI.
  const denied = await guardOfficerOrAdmin();
  if (denied) return denied;
  // Explicit select — never ship passwordHash in the response. Even though
  // /api/admin/brothers is admin-only, an XSS in the admin panel or a
  // forwarded log could leak the bcrypt hash. The hash is needed only at
  // login time (verifyPassword reads it server-side); brothers managers
  // never need it client-side.
  const brothers = await prisma.brother.findMany({
    orderBy: { name: "asc" },
    select: PUBLIC_BROTHER_SELECT,
  });
  return NextResponse.json({ brothers });
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const denied = await guardOfficer("brothers", "write");
  if (denied) return denied;
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  const data = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => {
      if (k === "initiationDate" && typeof v === "string" && v !== "") {
        return [k, new Date(v)];
      }
      return [k, v === "" ? null : v];
    })
  );
  try {
    const created = await prisma.brother.create({
      data: data as any,
      select: PUBLIC_BROTHER_SELECT,
    });
    await audit({
      action: "BROTHER_CREATED",
      subjectType: "Brother",
      subjectId: created.id,
      subjectName: created.name,
      details: created.position ? `position: ${created.position}` : null,
      req,
    });
    return NextResponse.json({ ok: true, brother: created });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Name or email already exists" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const PatchSchema = Schema.partial().extend({ id: z.string().min(1) });
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  const { id, ...rest } = parsed.data;
  const perms = await getCurrentOfficerPermissions();
  const isSuperOrBrothersWriter = isAdminRole() || hasPermission(perms, "brothers", "write");

  // Non-admins and non-authorized officers have restrictions.
  if (!isSuperOrBrothersWriter) {
    const me = getCurrentBrotherId();
    if (!me || me !== id) {
      // If the user has academic write perm, they can ONLY update studyHours and academicStanding
      const isAcademicWriter = hasPermission(perms, "academic", "write");
      if (isAcademicWriter) {
        const allowedKeys = new Set(["id", "studyHours", "academicStanding"]);
        for (const key of Object.keys(rest)) {
          if (!allowedKeys.has(key)) {
            delete (rest as any)[key];
          }
        }
      } else {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
    } else {
      // Editing own profile. Reduce the body to an explicit ALLOWLIST of self-
      // editable fields (lib/self-edit-fields) instead of a denylist. The old
      // denylist stripped role/duesPaid/serviceHours but NOT position or status,
      // so a plain member could self-elevate: position:"President" is trusted by
      // lib/mobile-exec-auth to unlock /api/mobile/exec/*, and status:"INITIATE"
      // unlocks initiate-only ritual docs. An allowlist fails closed — any field
      // not named self-editable (incl. a future schema column) is dropped here.
      // studyHours/academicStanding stay editable only with academic:write.
      const isAcademicWriter = hasPermission(perms, "academic", "write");
      for (const key of Object.keys(rest)) {
        if (!isSelfEditableField(key, { isAcademicWriter })) {
          delete (rest as any)[key];
        }
      }
    }
  }

  const data = Object.fromEntries(
    Object.entries(rest).map(([k, v]) => {
      if (k === "initiationDate" && typeof v === "string" && v !== "") {
        return [k, new Date(v)];
      }
      return [k, v === "" ? null : v];
    })
  );
  // Snapshot prior dues state so dues toggle gets its own audit row (it's
  // the single most-asked "who changed that?" question per chapter).
  const before = await prisma.brother.findUnique({
    where: { id },
    select: { duesPaid: true, role: true, position: true, name: true, status: true },
  }).catch(() => null);

  const updated = await prisma.brother.update({
    where: { id },
    data: data as any,
    select: PUBLIC_BROTHER_SELECT,
  });

  if (before) {
    if (typeof data.duesPaid === "boolean" && before.duesPaid !== data.duesPaid) {
      await audit({
        action: "BROTHER_DUES",
        subjectType: "Brother",
        subjectId: id,
        subjectName: updated.name,
        details: `${before.duesPaid ? "paid" : "unpaid"} → ${data.duesPaid ? "paid" : "unpaid"}`,
        req,
      });
      // R43-A: when admin manually toggles dues → PAID, also write a
      // DuesPayment ledger row with method="MANUAL" so the chapter has
      // a unified payment history regardless of channel (Stripe vs.
      // cash/check/Venmo collected at chapter meeting). Audit row is
      // DUES_PAID_MANUAL so the recent-activity feed reads cleanly.
      //
      // MONEY INTEGRITY: dedup the ledger row by (brotherId, year, method:MANUAL).
      // Re-marking an already-paid brother (e.g. an admin toggles off→on→off→on)
      // must NOT mint a second MANUAL PAID row — that would double-count dues
      // collected. We upsert a single MANUAL row per (brother, year): reuse it if
      // present, flipping it back to PAID; create it only if none exists.
      if (data.duesPaid === true) {
        try {
          const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
          const year = cfg["dues.year"] || "2026-fall";
          const amountCents = parseInt(cfg["dues.amountCents"] || "15000", 10) || 15000;
          const currency = (cfg["dues.currency"] || "usd").toLowerCase();
          // MONEY INTEGRITY (council): a brother who already paid via Stripe has a
          // STRIPE/PAID row. The old existence check was scoped to method:MANUAL
          // only, so toggling dues OFF (reverses MANUAL only) then ON would mint a
          // SECOND PAID row (MANUAL) alongside the STRIPE one — and the exports sum
          // ALL PAID rows per year, double-counting that brother. Guard FIRST on
          // ANY existing PAID row for (brother, year) regardless of method: if the
          // brother is already paid (via Stripe OR a prior manual mark), do NOT
          // create a duplicate. Only mirror the canonical Brother dues fields off
          // the existing PAID row so the denormalized state stays correct.
          const existingPaid = await prisma.duesPayment.findFirst({
            where: { brotherId: id, year, status: "PAID" },
            orderBy: { createdAt: "desc" },
          });
          if (existingPaid) {
            // Already paid for this year — re-sync the Brother mirror to the real
            // paid row (its method/amount), never a second ledger entry.
            await prisma.brother.update({
              where: { id },
              data: {
                duesPaidAt: existingPaid.createdAt ?? new Date(),
                duesPaymentMethod: existingPaid.method,
                duesPaymentId: existingPaid.id,
                duesAmountCents: existingPaid.amountCents,
                duesYear: year,
              },
            });
          } else {
            // No PAID row yet → upsert a single MANUAL row per (brother, year):
            // reuse a prior non-PAID MANUAL row if present (e.g. a REFUNDED one
            // from a previous un-mark), else create one. This still never mints a
            // duplicate because the ANY-PAID guard above already returned.
            const existingManual = await prisma.duesPayment.findFirst({
              where: { brotherId: id, year, method: "MANUAL" },
              orderBy: { createdAt: "desc" },
            });
            const manualPayment = existingManual
              ? await prisma.duesPayment.update({
                  where: { id: existingManual.id },
                  data: {
                    amountCents,
                    currency,
                    status: "PAID",
                    notes: "Marked paid manually by admin",
                  },
                })
              : await prisma.duesPayment.create({
                  data: {
                    brotherId: id,
                    amountCents,
                    currency,
                    year,
                    method: "MANUAL",
                    status: "PAID",
                    notes: "Marked paid manually by admin",
                  },
                });
            await prisma.brother.update({
              where: { id },
              data: {
                duesPaidAt: new Date(),
                duesPaymentMethod: "MANUAL",
                duesPaymentId: manualPayment.id,
                duesAmountCents: amountCents,
                duesYear: year,
              },
            });
            await audit({
              action: "DUES_PAID_MANUAL",
              subjectType: "Brother",
              subjectId: id,
              subjectName: updated.name,
              details: `$${(amountCents / 100).toFixed(2)} — ${year} (marked paid by admin)`,
              req,
            });
          }
        } catch {
          // Ledger write is best-effort — the canonical Brother.duesPaid
          // flip already happened, so the existing UI keeps working
          // even if the ledger row fails (e.g. DuesPayment table not
          // yet migrated).
        }
      } else if (data.duesPaid === false) {
        // duesPaid → false: reverse the MANUAL PAID ledger row(s) for this term so
        // the ledger no longer claims money that's been un-marked, and clear the
        // brother's denormalized dues mirror. Only MANUAL rows are touched — a real
        // STRIPE PAID row is reversed exclusively by the refund webhook, never by an
        // admin un-checking the box (that would desync the ledger from Stripe).
        try {
          const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
          const year = cfg["dues.year"] || "2026-fall";
          await prisma.duesPayment.updateMany({
            where: { brotherId: id, year, method: "MANUAL", status: "PAID" },
            data: { status: "REFUNDED", notes: "Manual dues un-marked by admin" },
          });
          await prisma.brother.update({
            where: { id },
            data: {
              duesPaidAt: null,
              duesPaymentId: null,
            },
          });
        } catch {
          // Best-effort — the canonical Brother.duesPaid=false flip already happened.
        }
      }
    }
    if (typeof (data as any).role === "string" && before.role !== (data as any).role) {
      await audit({
        action: "BROTHER_ROLE",
        subjectType: "Brother",
        subjectId: id,
        subjectName: updated.name,
        details: `${before.role} → ${(data as any).role}`,
        req,
      });
    }
    // W1: member-lifecycle status transition — write a MemberStatusChange row so
    // the per-brother lifecycle timeline can be rebuilt. Best-effort: the
    // canonical Brother.status flip already happened above, so a failure here
    // (e.g. table not yet migrated) must never break the status update itself.
    if (typeof (data as any).status === "string" && before.status !== (data as any).status) {
      try {
        await prisma.memberStatusChange.create({
          data: {
            brotherId: id,
            fromStatus: before.status ?? null,
            toStatus: (data as any).status,
            changedById: getCurrentBrotherId(),
          },
        });
      } catch {
        // Non-fatal — lifecycle audit is additive, never gates the update.
      }
      await audit({
        action: "BROTHER_STATUS",
        subjectType: "Brother",
        subjectId: id,
        subjectName: updated.name,
        details: `${before.status ?? "—"} → ${(data as any).status}`,
        req,
      });
    }
    // Generic catch-all for other profile edits — only logged when nothing
    // more-specific fired, to avoid double-rows when only dues changed.
    const dueChanged = typeof data.duesPaid === "boolean" && before.duesPaid !== data.duesPaid;
    const roleChanged = typeof (data as any).role === "string" && before.role !== (data as any).role;
    const statusChanged = typeof (data as any).status === "string" && before.status !== (data as any).status;
    if (!dueChanged && !roleChanged && !statusChanged) {
      await audit({
        action: "BROTHER_UPDATED",
        subjectType: "Brother",
        subjectId: id,
        subjectName: updated.name,
        details: `fields: ${Object.keys(data).join(", ")}`,
        req,
      });
    }
  }
  return NextResponse.json({ ok: true, brother: updated });
}

export async function DELETE(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const denied = await guardOfficer("brothers", "write");
  if (denied) return denied;
  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  // Snapshot name + position for the audit trail before cascading delete.
  const victim = await prisma.brother.findUnique({
    where: { id },
    select: { name: true, position: true },
  }).catch(() => null);
  await prisma.brother.delete({ where: { id } });
  await audit({
    action: "BROTHER_DELETED",
    subjectType: "Brother",
    subjectId: id,
    subjectName: victim?.name || null,
    details: victim?.position ? `was ${victim.position}` : null,
    req,
  });
  return NextResponse.json({ ok: true });
}
