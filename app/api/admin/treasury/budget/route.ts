import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/auth";
import { guardOfficer } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { currentPeriod } from "@/lib/treasury";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Treasury — BUDGET line items.
 *
 *   GET    ?period=2026-fall   list lines for a period (default = current term)
 *   POST   { category, label, budgetedCents, period?, notes?, actualCents? }
 *   PATCH  { id, ...fields }   update any field incl. actualCents
 *   DELETE ?id=...             remove a line
 *
 * Authorization: the budget is chapter money, so every handler requires the
 * "payments" officer domain (the Treasurer position grants write; admins/
 * president short-circuit via superAdmin) — read to GET, write to mutate.
 * isAdminAuthed() was too weak: it accepts ANY valid member cookie (adminFlag=0),
 * so a regular brother could read and rewrite the budget. Every write also
 * requires a same-origin request (isSameOrigin) and emits an audit row
 * (BUDGET_LINE_CREATED / UPDATED / DELETED). Amounts are integer cents and are
 * validated non-negative.
 */

const centsField = z
  .number({ invalid_type_error: "Amount must be a number" })
  .int("Amount must be a whole number of cents")
  .min(0, "Amount cannot be negative")
  .max(1_000_000_000, "Amount is too large"); // $10M ceiling — guard overflow/typos

const periodField = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid period");

const CreateSchema = z.object({
  category: z.string().trim().min(1, "Category required").max(80),
  label: z.string().trim().min(1, "Label required").max(120),
  budgetedCents: centsField,
  actualCents: centsField.optional(),
  period: periodField.optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

const PatchSchema = z
  .object({
    id: z.string().min(1),
    category: z.string().trim().min(1).max(80).optional(),
    label: z.string().trim().min(1).max(120).optional(),
    budgetedCents: centsField.optional(),
    actualCents: centsField.optional(),
    period: periodField.optional(),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .strict();

export async function GET(req: Request) {
  const denied = await guardOfficer("payments", "read");
  if (denied) return denied;
  const url = new URL(req.url);
  const period = url.searchParams.get("period")?.trim() || currentPeriod();
  try {
    const lines = await prisma.budgetLine.findMany({
      where: { period },
      orderBy: [{ category: "asc" }, { label: "asc" }],
    });
    // Distinct periods that actually have data — powers the period selector so
    // the treasurer can jump between terms without guessing the tag format.
    const periodsRaw = await prisma.budgetLine.findMany({
      distinct: ["period"],
      select: { period: true },
      orderBy: { period: "desc" },
    });
    const periods = Array.from(
      new Set([currentPeriod(), period, ...periodsRaw.map((p) => p.period)])
    ).sort((a, b) => b.localeCompare(a));
    return NextResponse.json({ ok: true, period, lines, periods });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = await guardOfficer("payments", "write");
  if (denied) return denied;
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "Bad origin" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const period = parsed.data.period || currentPeriod();
  try {
    const created = await prisma.budgetLine.create({
      data: {
        category: parsed.data.category,
        label: parsed.data.label,
        budgetedCents: parsed.data.budgetedCents,
        actualCents: parsed.data.actualCents ?? 0,
        period,
        notes: parsed.data.notes ? parsed.data.notes : null,
      },
    });
    await audit({
      action: "BUDGET_LINE_CREATED",
      subjectType: "BudgetLine",
      subjectId: created.id,
      subjectName: `${created.category} · ${created.label}`,
      details: `budgeted $${(created.budgetedCents / 100).toFixed(2)} — ${period}`,
      req,
    });
    return NextResponse.json({ ok: true, line: created });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const denied = await guardOfficer("payments", "write");
  if (denied) return denied;
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "Bad origin" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const { id, ...rest } = parsed.data;
  // Build the update payload from only the keys that were actually provided so a
  // PATCH never blanks a field the caller left out. "" notes → null.
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined) continue;
    if (k === "notes") data[k] = v === "" ? null : v;
    else data[k] = v;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
  }
  try {
    const updated = await prisma.budgetLine.update({ where: { id }, data });
    await audit({
      action: "BUDGET_LINE_UPDATED",
      subjectType: "BudgetLine",
      subjectId: updated.id,
      subjectName: `${updated.category} · ${updated.label}`,
      details: `fields: ${Object.keys(data).join(", ")}`,
      req,
    });
    return NextResponse.json({ ok: true, line: updated });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Line not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const denied = await guardOfficer("payments", "write");
  if (denied) return denied;
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "Bad origin" }, { status: 403 });
  const url = new URL(req.url);
  // Accept id from the query string OR a JSON body, mirroring the brothers route.
  let id = url.searchParams.get("id") || "";
  if (!id) {
    const body = await req.json().catch(() => ({}));
    id = (body && typeof body.id === "string" ? body.id : "") || "";
  }
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  // Snapshot the label for the audit trail before the row is gone.
  const victim = await prisma.budgetLine
    .findUnique({ where: { id }, select: { category: true, label: true, period: true } })
    .catch(() => null);
  try {
    await prisma.budgetLine.delete({ where: { id } });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Line not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
  await audit({
    action: "BUDGET_LINE_DELETED",
    subjectType: "BudgetLine",
    subjectId: id,
    subjectName: victim ? `${victim.category} · ${victim.label}` : null,
    details: victim?.period ? `period ${victim.period}` : null,
    req,
  });
  return NextResponse.json({ ok: true });
}
