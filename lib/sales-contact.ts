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

/**
 * The PUBLIC-facing, BRANDED support address shown on the marketing funnel
 * (footer mailto, contact copy). Env-configurable via `NEXT_PUBLIC_SUPPORT_EMAIL`
 * so the owner can point it at a real shared inbox; defaults to the brand address.
 *
 * OWNER-KEYS NOTE: the default `support@greekstack.com` inbox must be created and
 * monitored by the owner before launch — set `NEXT_PUBLIC_SUPPORT_EMAIL` if the
 * production support address differs. This is the address PROSPECTS see and email;
 * it is intentionally separate from `SALES_CONTACT_EMAIL` (the internal inbox the
 * server delivers form submissions to).
 *
 * NEXT_PUBLIC_* is inlined by Next at build, so this resolves to the brand default
 * client-side unless the env var is set at build time. Pure + side-effect-free.
 */
export const DEFAULT_SUPPORT_EMAIL = "support@greekstack.com";
export function supportEmail(): string {
  return (process.env.NEXT_PUBLIC_SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL).trim();
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

// ── Prospect auto-confirmation ─────────────────────────────────────────────
/** Resolve the public Cal.com booking URL from env, falling back to the LIVE
 *  30-min link. Built once here so both this confirmation and the Cal webhook
 *  notice point at the same place. NEXT_PUBLIC_CAL_LINK is the "handle/event"
 *  slug (e.g. "benjamin-sachwitz-zdbpyc/30min"); we prefix the cal.com origin
 *  unless an absolute URL was supplied. */
export function calBookingUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_CAL_LINK || "benjamin-sachwitz-zdbpyc/30min").trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://cal.com/${raw.replace(/^\/+/, "")}`;
}

/**
 * Send the PROSPECT a warm, on-brand confirmation right after they submit a
 * sales form — the second half of "email BOTH the owner AND the prospect".
 *
 * Uses the neutral platform chrome (no chapter brand color — this is a
 * Greekstack PLATFORM email to someone who isn't a tenant yet), thanks them,
 * promises a personal reply from the founder, and — since NEXT_PUBLIC_CAL_LINK
 * is live — surfaces a "Book a 15-min call" CTA so an eager prospect can grab
 * time immediately instead of waiting. One sentence is tailored per `kind`.
 *
 * Best-effort: sets `replyTo` to the owner inbox (so a prospect reply reaches a
 * human), swallows any error, and returns sendEmail's result (incl. the
 * `{ ok: true, mock: true }` no-op when Resend isn't configured). NEVER throws.
 */
export async function sendProspectConfirmation(opts: {
  to: string;
  name?: string | null;
  kind: "contact" | "call" | "quote";
}): Promise<{ ok: boolean; mock?: boolean; id?: string; error?: string }> {
  try {
    const first = (opts.name || "").trim().split(/\s+/)[0] || "there";
    const kindLine =
      opts.kind === "call"
        ? "We saw your request for a quick intro call and we'll be in touch to lock in a time."
        : opts.kind === "quote"
          ? "We got your custom-build request and we're already looking at how to tailor Greekstack to your chapter."
          : "We got your message and we're glad you reached out.";

    const bookUrl = calBookingUrl();
    const bodyHtml = `
      <p style="margin:0 0 14px;">Hi ${escHtml(first)},</p>
      <p style="margin:0 0 14px;">${escHtml(kindLine)}</p>
      <p style="margin:0 0 14px;">The founder personally reads and replies to every one of these — so you'll hear back from a real person, usually within a day. No autoresponder runaround.</p>
      <p style="margin:0 0 4px;">If you'd rather just talk it through, you can grab a 15-minute call whenever suits you:</p>`;

    const cta: EmailCta = { label: "Book a 15-min call", url: bookUrl };

    const html = renderEmail({
      chapterName: "Greekstack",
      heading: "We got your message — talk soon",
      bodyHtml,
      cta,
      footerNote: "You're receiving this because you contacted Greekstack. Just reply if you have anything to add.",
    });

    const text = renderEmailText({
      heading: "We got your message — talk soon",
      lines: [
        `Hi ${first},`,
        kindLine,
        "The founder personally reads and replies to every one of these — you'll hear back from a real person, usually within a day.",
        "Prefer to talk it through? Grab a 15-minute call whenever suits you:",
      ],
      cta,
      chapterName: "Greekstack",
    });

    return await sendEmail({
      to: opts.to,
      subject: "Thanks for reaching out to Greekstack",
      html,
      text,
      replyTo: salesContactEmail(),
    });
  } catch (err: any) {
    // Best-effort: a confirmation failure must never bubble up to the route.
    console.error("[sales-contact] sendProspectConfirmation failed:", err?.message || err);
    return { ok: false, error: err?.message || "Unknown error" };
  }
}
