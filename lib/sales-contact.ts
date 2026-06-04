/**
 * Shared helpers for the Greekstack APEX sales surface (/contact).
 *
 * These power the three public sales endpoints — general contact, custom-quote
 * request (pricing METHOD 3), and request-a-call — which all do the same shape
 * of thing: validate + honeypot + rate-limit a small form, then email the
 * platform OWNER through the canonical lib/email.ts + renderEmail pipeline.
 *
 * Centralized here so the routes stay thin and every sales email renders with
 * the same neutral platform chrome (NOT a chapter's brand color — these emails
 * go to the Greekstack owner about a PROSPECT, so brandHex is intentionally
 * omitted and renderEmail falls back to PLATFORM_NEUTRAL_HEX).
 *
 * Pure + side-effect-free except `salesRateLimit` (an in-memory limiter) and
 * `salesContactEmail` (reads env). No DB — these are apex marketing endpoints
 * with no tenant schema to write to.
 */

import { sendEmail } from "@/lib/email";
import { renderEmail, renderEmailText, type EmailCta } from "@/lib/email-template";

/** The owner/sales inbox. Mirrors the project CONFIG contract exactly:
 *  `SALES_CONTACT_EMAIL` with a sane personal fallback so the form always has
 *  somewhere to deliver even before the env var is set. */
export function salesContactEmail(): string {
  return process.env.SALES_CONTACT_EMAIL || "bensachwitz@gmail.com";
}

/** Minimal HTML escape for caller-supplied plain strings interpolated into the
 *  sales-notification email body. The renderEmail chrome escapes the heading /
 *  chapterName / footer note itself; the BODY html is trusted, so anything we
 *  drop into it from the form MUST pass through here first. */
export function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Per-IP rate limiter ────────────────────────────────────────────────────
// In-memory sliding window, mirroring app/api/onboard/route.ts. Single-instance
// only (a multi-instance deploy would want Redis), which is fine for an apex
// contact form. One Map per logical surface so a burst of quote requests can't
// also lock someone out of the plain contact form, and vice-versa.
const buckets = new Map<string, Map<string, number[]>>();
const SALES_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const SALES_LIMIT = 8; // generous: a real prospect submits 1–2 forms, never 8/hr

/**
 * Returns true when `ip` has already submitted `SALES_LIMIT` times within the
 * trailing window for the given `surface`. Records the attempt when allowed.
 * `unknown`/empty IPs are never limited (we can't attribute them).
 */
export function salesRateLimit(surface: string, ip: string | null | undefined): boolean {
  if (!ip || ip === "unknown") return false;
  let bucket = buckets.get(surface);
  if (!bucket) {
    bucket = new Map<string, number[]>();
    buckets.set(surface, bucket);
  }
  const now = Date.now();
  const recent = (bucket.get(ip) || []).filter((t) => now - t < SALES_WINDOW_MS);
  if (recent.length >= SALES_LIMIT) {
    bucket.set(ip, recent); // persist the pruned list so it keeps decaying
    return true;
  }
  recent.push(now);
  bucket.set(ip, recent);
  return false;
}

/** Best-effort client IP from the standard proxy headers. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** One labeled field rendered as a row in the notification email body. */
export type SalesField = { label: string; value: string | null | undefined };

/**
 * Build + send a sales-notification email to the platform owner.
 *
 * Renders the supplied `fields` as a clean two-column table inside the neutral
 * platform email chrome, sets `replyTo` to the prospect's email (so the owner
 * can reply straight from their inbox), and returns sendEmail's result. The
 * mock path (no Resend key configured) still returns `{ ok: true, mock: true }`.
 */
export async function sendSalesEmail(opts: {
  heading: string;
  subject: string;
  /** Lead-in sentence shown above the details table. */
  intro: string;
  fields: SalesField[];
  /** The prospect's email, used as the reply-to so the owner can respond. */
  replyTo?: string | null;
  /** Optional free-text block (e.g. the message / "what to customize") shown
   *  full-width under the table, with newlines preserved. */
  longText?: { label: string; value: string } | null;
  cta?: EmailCta | null;
  footerNote?: string | null;
}) {
  const rows = opts.fields
    .filter((f) => f.value != null && String(f.value).trim() !== "")
    .map(
      (f) =>
        `<tr><td style="padding:7px 0;color:#71717a;vertical-align:top;white-space:nowrap;">${escHtml(
          f.label,
        )}</td><td style="padding:7px 0 7px 16px;text-align:right;font-weight:600;color:#0a0a0a;">${escHtml(
          String(f.value),
        )}</td></tr>`,
    )
    .join("");

  const longBlock = opts.longText && opts.longText.value.trim()
    ? `<div style="margin-top:18px;">
         <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#71717a;margin-bottom:6px;">${escHtml(
           opts.longText.label,
         )}</div>
         <div style="background:#f7f7fa;border:1px solid #eeeef2;border-radius:10px;padding:12px 14px;white-space:pre-wrap;color:#27272a;">${escHtml(
           opts.longText.value,
         )}</div>
       </div>`
    : "";

  const bodyHtml = `
    <p style="margin:0 0 16px;">${escHtml(opts.intro)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border:1px solid #eeeef2;border-radius:10px;padding:6px 14px;">
      ${rows}
    </table>
    ${longBlock}`;

  // NEUTRAL chrome on purpose: brandHex omitted → renderEmail uses the platform
  // navy. chapterName is the platform itself because the AUDIENCE is the owner.
  const html = renderEmail({
    chapterName: "Greekstack — Sales",
    heading: opts.heading,
    bodyHtml,
    cta: opts.cta || null,
    footerNote: opts.footerNote || null,
  });

  const text = renderEmailText({
    heading: opts.heading,
    lines: [
      opts.intro,
      ...opts.fields
        .filter((f) => f.value != null && String(f.value).trim() !== "")
        .map((f) => `${f.label}: ${String(f.value)}`),
      ...(opts.longText && opts.longText.value.trim()
        ? [`${opts.longText.label}:`, opts.longText.value]
        : []),
    ],
    chapterName: "Greekstack",
  });

  return sendEmail({
    to: salesContactEmail(),
    subject: opts.subject,
    html,
    text,
    replyTo: opts.replyTo || undefined,
  });
}
