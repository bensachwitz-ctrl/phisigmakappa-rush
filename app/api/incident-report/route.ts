import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  INCIDENT_CATEGORY_OPTIONS,
  INCIDENT_SEVERITY_OPTIONS,
  sanitizeIncidentBody,
  generateReceiptCode,
  checkIncidentRateLimit,
} from "@/lib/incident";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── ANONYMITY CONTRACT ─────────────────────────────────────────────────────
// This route is UNAUTHENTICATED. It MUST NOT import or call `getCurrentBrotherId`,
// `getCurrentSession`, `cookies`, or any other session helper. If a future
// refactor adds session inspection here, the load-bearing anonymity guarantee
// breaks — submitters could be silently de-anonymised by a stale cookie.
//
// Verification (grep run as part of the W3 acceptance):
//   Grep "session|cookie|getServerSession|getCurrentBrother" → 0 hits.
//
// Rate-limiting is in-memory keyed by IP (not by session or brother id). The
// bucket is volatile by design — we deliberately do NOT persist a log row keyed
// by IP, because the log itself would re-introduce a soft identifier.
// ───────────────────────────────────────────────────────────────────────────

const Schema = z.object({
  category: z.enum(INCIDENT_CATEGORY_OPTIONS as unknown as [string, ...string[]]),
  severity: z.enum(INCIDENT_SEVERITY_OPTIONS as unknown as [string, ...string[]]).optional(),
  subject: z.string().min(2).max(300),
  body: z.string().min(2).max(5000),
  occurredAt: z.string().optional().nullable(),
  // Honeypot — if any robot fills this in, we silently accept and drop. Real
  // humans never see the field because it's hidden in CSS on the form.
  honeypot: z.string().optional(),
  // If the submitter chooses to identify themselves, they pass `identifyAs`.
  // We accept the field but do NOT cross-reference it with any session cookie.
  // The risk officer can later confirm or unverify the identification.
  identifyAs: z.string().optional().nullable(),
});

function ipKeyFromRequest(req: Request): string {
  // Prefer the standard Vercel/Edge forwarding header. Strip to the first IP.
  const xff = req.headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  if (first) return first;
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: Request) {
  // 1) Honeypot check — if the field is non-empty, fake a success without writing.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body?.honeypot === "string" && body.honeypot.trim().length > 0) {
    // Don't 4xx — return success so spam can't probe.
    return NextResponse.json({ ok: true, receiptCode: generateReceiptCode() });
  }

  // 2) Rate-limit (3 reports/hour/IP).
  const ipKey = ipKeyFromRequest(req);
  const limit = checkIncidentRateLimit(ipKey);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many reports from this network. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  // 3) Validate input.
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // 4) Sanitize free-text fields.
  const subject = sanitizeIncidentBody(data.subject, 300);
  const reportBody = sanitizeIncidentBody(data.body, 5000);
  if (subject.length < 2 || reportBody.length < 2) {
    return NextResponse.json({ ok: false, error: "Subject and body required." }, { status: 400 });
  }

  // 5) Anonymity decision. Defaults to ANONYMOUS. The submitter must opt in
  //    to attach their brother id by passing `identifyAs`. We do NOT inspect
  //    the session cookie here — that is the load-bearing privacy guarantee.
  let reporterId: string | null = null;
  let isAnonymous = true;
  if (typeof data.identifyAs === "string" && data.identifyAs.length > 0) {
    const exists = await prisma.brother.findUnique({
      where: { id: data.identifyAs },
      select: { id: true },
    });
    if (exists) {
      reporterId = exists.id;
      isAnonymous = false;
    }
  }

  // 6) Occurred-at is optional and best-effort parsed.
  let occurredAt: Date | null = null;
  if (data.occurredAt) {
    const d = new Date(data.occurredAt);
    if (!Number.isNaN(d.getTime())) occurredAt = d;
  }

  // 7) Generate the receipt code — retry on the rare collision.
  let receiptCode = generateReceiptCode();
  for (let i = 0; i < 5; i++) {
    const dup = await prisma.incidentReport.findUnique({ where: { receiptCode }, select: { id: true } });
    if (!dup) break;
    receiptCode = generateReceiptCode();
  }

  // 8) Persist. severity defaults to "medium" per the schema.
  const created = await prisma.incidentReport.create({
    data: {
      category: data.category,
      severity: data.severity || "medium",
      subject,
      body: reportBody,
      reporterId,
      isAnonymous,
      occurredAt,
      receiptCode,
    },
    // Only return the receipt code to the caller — never echo the internal id.
    select: { receiptCode: true },
  });

  return NextResponse.json({ ok: true, receiptCode: created.receiptCode });
}
