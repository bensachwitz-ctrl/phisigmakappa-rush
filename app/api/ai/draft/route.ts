import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/auth";
import { guardOfficer } from "@/lib/permissions";
import {
  pickDraftModel,
  draftRouteOrder,
  isFailoverStatus,
  normalizeDraftTask,
  DRAFT_TASKS,
} from "@/lib/ai/draft";
import { rateLimit, recordRateLimit, clientIpFromRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// INERT-BY-DEFAULT AI DRAFT HELPER.
//
// A chapter officer hits this to draft an announcement / rush message / email /
// event blurb. It is gated three ways so it can NEVER affect the build/gate when
// no key is set and can NEVER be used by a non-officer or across tenants:
//   1. isAdminAuthed()                          -> 401 (valid tenant cookie required)
//   2. guardOfficer("announcements", "write")   -> 403 (officer/admin floor, per-tenant)
//   3. NVIDIA_NIM_API_KEY / OPENROUTER_API_KEY  -> honest 503 ai-not-configured when absent
//
// The free-first model selection is the PURE picker in lib/ai/draft.ts; this
// route only reads the keys server-side (NEVER echoes them), walks the picked
// chain on failover-worthy upstream statuses, and returns { draft } or an honest
// error. It NEVER fabricates a success when every upstream attempt failed.

const Schema = z.object({
  type: z
    .enum([
      DRAFT_TASKS.ANNOUNCEMENT,
      DRAFT_TASKS.RUSH_MESSAGE,
      DRAFT_TASKS.EMAIL,
      DRAFT_TASKS.EVENT_BLURB,
    ])
    .default(DRAFT_TASKS.ANNOUNCEMENT),
  topic: z.string().min(2).max(400),
  tone: z.string().max(60).optional(),
  details: z.string().max(2000).optional(),
});

// Generous per-IP limit — a real officer drafts a handful of times, never dozens.
const RL = { limit: 12, windowMs: 60 * 60 * 1000 };

/** Server-side probe: which free providers have a key. Reads env here (the route
 *  layer) and hands booleans to the PURE picker, so the picker never sees a key. */
function configuredProviders(): { nvidia: boolean; openrouter: boolean } {
  return {
    nvidia: !!process.env.NVIDIA_NIM_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
  };
}

function keyForProvider(provider: "nvidia" | "openrouter"): string | undefined {
  return provider === "nvidia"
    ? process.env.NVIDIA_NIM_API_KEY
    : process.env.OPENROUTER_API_KEY;
}

const SYSTEM_PROMPT =
  "You are a writing assistant for a college fraternity/sorority chapter officer. " +
  "Write clear, warm, on-brand chapter communications. Keep it concise and ready to send. " +
  "Return ONLY the message body text — no preamble, no markdown headers, no quotes, no sign-off placeholder brackets.";

function buildUserPrompt(input: {
  type: string;
  topic: string;
  tone?: string;
  details?: string;
}): string {
  const taskLabel: Record<string, string> = {
    [DRAFT_TASKS.ANNOUNCEMENT]: "a chapter-wide announcement",
    [DRAFT_TASKS.RUSH_MESSAGE]: "a recruitment/rush outreach message to a potential new member",
    [DRAFT_TASKS.EMAIL]: "an email to chapter members",
    [DRAFT_TASKS.EVENT_BLURB]: "a short promotional blurb for a chapter event",
  };
  const label = taskLabel[normalizeDraftTask(input.type)];
  const lines = [
    `Write ${label}.`,
    `Topic: ${input.topic}`,
  ];
  if (input.tone) lines.push(`Tone: ${input.tone}`);
  if (input.details) lines.push(`Additional details to include: ${input.details}`);
  return lines.join("\n");
}

/** GET — lightweight probe so the UI can hide/disable the affordance honestly
 *  without spending a draft. Returns { configured } only; never leaks a key. */
export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const denied = await guardOfficer("announcements", "write");
  if (denied) return denied;
  const pick = pickDraftModel(DRAFT_TASKS.ANNOUNCEMENT, configuredProviders());
  return NextResponse.json({ ok: true, configured: pick.configured });
}

export async function POST(req: Request) {
  // 1. Auth + tenant/officer floor (same contract as the announcements route).
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const denied = await guardOfficer("announcements", "write");
  if (denied) return denied;

  // 2. Validate input.
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid-input" }, { status: 400 });
  }

  // 3. Honest not-configured short-circuit BEFORE any rate-limit cost.
  const providers = configuredProviders();
  const order = draftRouteOrder(parsed.data.type, providers);
  if (order.length === 0) {
    return NextResponse.json(
      { ok: false, error: "ai-not-configured" },
      { status: 503 },
    );
  }

  // 4. Rate-limit (record every attempt; expensive upstream call follows).
  const ip = clientIpFromRequest(req);
  const rl = rateLimit(`ai-draft:${ip}`, RL);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate-limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
  recordRateLimit(`ai-draft:${ip}`, RL);

  // 5. Walk the free chain on failover-worthy upstream statuses. Never fabricate
  //    a success: if every attempt fails, return an honest 502.
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserPrompt(parsed.data) },
  ];

  let lastStatus = 0;
  for (const cand of order) {
    const key = keyForProvider(cand.provider);
    if (!key) continue; // defensive: picker already filtered, but never call keyless
    let resp: Response;
    try {
      resp = await fetch(cand.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: cand.model,
          messages,
          temperature: 0.7,
          max_tokens: 700,
        }),
      });
    } catch {
      // Network error — treat as failover and try the next candidate.
      lastStatus = 599;
      continue;
    }

    if (!resp.ok) {
      lastStatus = resp.status;
      if (isFailoverStatus(resp.status)) continue; // try next free model
      // A non-failover error (e.g. 400 from the provider) — stop, report honestly.
      return NextResponse.json(
        { ok: false, error: "upstream-error" },
        { status: 502 },
      );
    }

    let data: any;
    try {
      data = await resp.json();
    } catch {
      lastStatus = 598;
      continue;
    }
    const draft: string | undefined = data?.choices?.[0]?.message?.content?.trim();
    if (!draft) {
      // Empty completion — try the next candidate rather than return blank.
      lastStatus = 597;
      continue;
    }
    return NextResponse.json({ ok: true, draft, provider: cand.provider, model: cand.model });
  }

  // Every free candidate failed. Honest error — NEVER a fabricated draft.
  return NextResponse.json(
    { ok: false, error: "upstream-unavailable", lastStatus },
    { status: 502 },
  );
}
