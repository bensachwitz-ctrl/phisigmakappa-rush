import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Brother polls — quick chapter pulse-checks.
 *
 * GET   — auth-gated. Returns active polls + any closed within the last 14
 *         days (so brothers can still see results), newest first. Each poll
 *         carries aggregate counts per option, the creator's display name,
 *         and `mine: { optionId }` for the current brother (or null).
 *
 * POST  — auth-gated. Body: { question, options: string[2..6], closesAt? }.
 *         The server mints option ids (cuid each) so vote rows stay valid
 *         even if the labels are later edited (we don't currently allow
 *         edits, but it's the safer default).
 */

const POLL_OPTION_MIN = 2;
const POLL_OPTION_MAX = 6;
const POLL_QUESTION_MIN = 5;
const POLL_QUESTION_MAX = 280;
const POLL_OPTION_LABEL_MAX = 120;
const RECENT_CLOSED_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const CreatePollSchema = z.object({
  question: z
    .string()
    .trim()
    .min(POLL_QUESTION_MIN, "Question is too short")
    .max(POLL_QUESTION_MAX, "Question is too long"),
  options: z
    .array(z.string().trim().min(1).max(POLL_OPTION_LABEL_MAX))
    .min(POLL_OPTION_MIN)
    .max(POLL_OPTION_MAX),
  closesAt: z.string().datetime().optional().nullable(),
});

export type PollOption = { id: string; label: string };

/** Best-effort parse of the JSON-stored options column. Returns [] on any error. */
export function parsePollOptions(raw: string): PollOption[] {
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .filter(
        (o): o is PollOption =>
          o &&
          typeof o === "object" &&
          typeof (o as { id?: unknown }).id === "string" &&
          typeof (o as { label?: unknown }).label === "string",
      )
      .map((o) => ({ id: o.id, label: o.label }));
  } catch {
    return [];
  }
}

function newOptionId(): string {
  // cuid-like opaque id — we don't need full cuid here, just unique within
  // the poll. 12 hex chars is collision-safe for 6 options per poll.
  return "o_" + crypto.randomBytes(8).toString("hex");
}

export async function GET() {
  const brother = await getCurrentBrother();
  if (!brother) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RECENT_CLOSED_WINDOW_MS);

  // Active polls (closedAt null AND createdAt anytime) + recently-closed polls
  // (closedAt within the 14-day window). We sort newest-first by createdAt.
  const polls = await prisma.poll.findMany({
    where: {
      OR: [{ closedAt: null }, { closedAt: { gte: cutoff } }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      votes: { select: { brotherId: true, optionId: true } },
    },
  });

  const shaped = polls.map((p) => {
    const options = parsePollOptions(p.options);
    const counts: Record<string, number> = {};
    for (const o of options) counts[o.id] = 0;
    let mine: { optionId: string } | null = null;
    for (const v of p.votes) {
      if (counts[v.optionId] !== undefined) counts[v.optionId] += 1;
      if (v.brotherId === brother.id) mine = { optionId: v.optionId };
    }
    return {
      id: p.id,
      question: p.question,
      options,
      counts,
      totalVotes: p.votes.length,
      createdAt: p.createdAt.toISOString(),
      closesAt: p.closesAt ? p.closesAt.toISOString() : null,
      closedAt: p.closedAt ? p.closedAt.toISOString() : null,
      createdBy: { id: p.createdBy.id, name: p.createdBy.name },
      mineOptionId: mine?.optionId ?? null,
      isMine: p.createdById === brother.id,
    };
  });

  return NextResponse.json({ ok: true, polls: shaped });
}

export async function POST(req: Request) {
  const brother = await getCurrentBrother();
  if (!brother) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreatePollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Strip empties + dedupe (case-insensitive) AFTER schema parse so the user
  // sees their original validation error first if applicable.
  const cleanedRaw = parsed.data.options.map((o) => o.trim()).filter((o) => o.length > 0);
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const label of cleanedRaw) {
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(label);
  }
  if (cleaned.length < POLL_OPTION_MIN) {
    return NextResponse.json(
      { ok: false, error: "Need at least 2 distinct options" },
      { status: 400 },
    );
  }
  if (cleaned.length > POLL_OPTION_MAX) {
    return NextResponse.json(
      { ok: false, error: "Max 6 options" },
      { status: 400 },
    );
  }

  const options: PollOption[] = cleaned.map((label) => ({ id: newOptionId(), label }));

  let closesAtDate: Date | null = null;
  if (parsed.data.closesAt) {
    const d = new Date(parsed.data.closesAt);
    if (!Number.isFinite(d.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Invalid close time" },
        { status: 400 },
      );
    }
    // A "closes-by" datetime in the past is almost certainly user error —
    // the brother likely meant a year ahead and typed the wrong year, or
    // their browser didn't apply the timezone offset they expected. Reject
    // explicitly so they fix it instead of silently dropping the value.
    if (d.getTime() <= Date.now()) {
      return NextResponse.json(
        { ok: false, error: "Close time must be in the future" },
        { status: 400 },
      );
    }
    closesAtDate = d;
  }

  const poll = await prisma.poll.create({
    data: {
      question: parsed.data.question,
      options: JSON.stringify(options),
      createdById: brother.id,
      closesAt: closesAtDate,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    ok: true,
    poll: {
      id: poll.id,
      question: poll.question,
      options,
      counts: Object.fromEntries(options.map((o) => [o.id, 0])),
      totalVotes: 0,
      createdAt: poll.createdAt.toISOString(),
      closesAt: poll.closesAt ? poll.closesAt.toISOString() : null,
      closedAt: null,
      createdBy: { id: poll.createdBy.id, name: poll.createdBy.name },
      mineOptionId: null,
      isMine: true,
    },
  });
}
