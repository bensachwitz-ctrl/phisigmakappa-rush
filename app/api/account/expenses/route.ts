import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother, getCurrentBrotherIdAsync, isSameOrigin } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Treasury — member reimbursement submission (account side).
 *
 *   GET   own reimbursement requests (most recent first)
 *   POST  { amountCents, category, description, receiptUrl? }
 *         → creates a PENDING expense stamped with the submitter's id + name
 *
 * Gate: a signed-in brother (401 otherwise). POST additionally requires a
 * same-origin request and is rate-limited modestly to stop a stuck/abusive
 * client from flooding the treasurer's queue.
 */

const centsField = z
  .number({ invalid_type_error: "Amount must be a number" })
  .int("Amount must be a whole number of cents")
  .min(1, "Amount must be greater than zero")
  .max(1_000_000_000, "Amount is too large"); // $10M ceiling — guard typos/overflow

const PostSchema = z.object({
  amountCents: centsField,
  category: z.string().trim().min(1, "Category required").max(80),
  description: z.string().trim().min(2, "Add a short description").max(2000),
  receiptUrl: z.string().url("Receipt must be a valid URL").max(2048).optional().or(z.literal("")),
});

// ── Modest in-memory rate limit ────────────────────────────────────────────
// Per-brother sliding window. In-process only (resets on cold start / not
// shared across serverless instances) — deliberately lightweight, just enough
// to stop a runaway client from spamming dozens of rows in seconds. The real
// integrity guard is the admin decision workflow; this is a courtesy throttle.
const RL_WINDOW_MS = 60_000;
const RL_MAX = 8; // up to 8 submissions/minute/brother
const rlHits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (rlHits.get(key) || []).filter((t) => now - t < RL_WINDOW_MS);
  if (recent.length >= RL_MAX) {
    rlHits.set(key, recent);
    return true;
  }
  recent.push(now);
  rlHits.set(key, recent);
  // Opportunistic cleanup so the map can't grow unbounded across many brothers.
  if (rlHits.size > 5000) {
    for (const [k, ts] of rlHits) {
      if (ts.every((t) => now - t >= RL_WINDOW_MS)) rlHits.delete(k);
    }
  }
  return false;
}

/** GET /api/account/expenses — the signed-in brother's own requests. */
export async function GET() {
  const me = await getCurrentBrotherIdAsync();
  if (!me) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  try {
    const expenses = await prisma.expense.findMany({
      where: { submittedById: me },
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json({ ok: true, expenses });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

/** POST /api/account/expenses — submit a new reimbursement request. */
export async function POST(req: Request) {
  const brother = await getCurrentBrother().catch(() => null);
  if (!brother) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "Bad origin" }, { status: 403 });

  if (rateLimited(`expense:${brother.id}`)) {
    return NextResponse.json(
      { ok: false, error: "You're submitting too fast — give it a minute and try again." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.expense.create({
      data: {
        submittedById: brother.id,
        submittedByName: brother.name,
        amountCents: parsed.data.amountCents,
        category: parsed.data.category,
        description: parsed.data.description,
        receiptUrl: parsed.data.receiptUrl ? parsed.data.receiptUrl : null,
        status: "PENDING",
      },
    });

    await audit({
      action: "EXPENSE_SUBMITTED",
      subjectType: "Expense",
      subjectId: created.id,
      subjectName: brother.name,
      details: `$${(created.amountCents / 100).toFixed(2)} · ${created.category}`,
      req,
    });

    return NextResponse.json({ ok: true, expense: created });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
