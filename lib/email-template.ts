/**
 * Shared, white-label branded HTML email wrapper.
 *
 * WHY: every transactional email in the platform (brother/alumni invites,
 * bids, broadcasts, dues receipts, donation thank-yous, the send-email blast)
 * previously hand-rolled its own inline HTML — and most of them hardcoded the
 * Phi Sig cardinal red (#a3001a / #C8102E) masthead + CTA. A navy/gold chapter
 * therefore sent RED email. This module is the single source of truth for the
 * email chrome so a re-brand for any chapter (Beta Sigma @ Maryland,
 * Epsilon @ Drexel, a sorority, a co-ed pro org) propagates from one place.
 *
 * Design goals:
 *   - The masthead + CTA are tinted by the chapter's `brand.primaryHex`.
 *   - When no brand hex is configured we fall back to a NEUTRAL platform navy
 *     (`PLATFORM_NEUTRAL_HEX`) — never red, never a tenant color.
 *   - Table-based + inline styles only, so it renders in Gmail / Outlook / iOS.
 *   - Mobile-friendly: a single 600px content table that scales down.
 *   - The footer always carries the chapter name + a neutral platform line, and
 *     an optional unsubscribe / "Reply STOP to opt out" line for CAN-SPAM /
 *     CTIA where the message is a broadcast or marketing send.
 *
 * Pure + side-effect-free (no DB, no env) so it's safe to call from any route.
 */

/** Neutral platform brand color used when a chapter has no `brand.primaryHex`.
 *  Intentionally NOT red — a slate navy that reads as "the platform", so an
 *  unconfigured tenant never inherits the reference chapter's cardinal. */
export const PLATFORM_NEUTRAL_HEX = "#1F2937";

/** The neutral platform line shown in every footer. */
const PLATFORM_LINE = "Sent securely by your chapter on Greekstack.";

export type EmailCta = {
  label: string;
  url: string;
};

export type RenderEmailOptions = {
  /** The chapter's primary brand hex (cfg `brand.primaryHex`). Falls back to
   *  the neutral platform color when empty/invalid — NEVER red. */
  brandHex?: string | null;
  /** Chapter display name for the masthead eyebrow + footer (e.g.
   *  "Phi Sig USC", "Beta Sigma @ Maryland"). Falls back to "Your Chapter". */
  chapterName?: string | null;
  /** Optional second masthead line (e.g. school name) shown under chapterName. */
  chapterSubline?: string | null;
  /** The email's H1 headline. */
  heading: string;
  /** Pre-built, trusted inner HTML for the body. Callers that interpolate
   *  user/admin input MUST escape it before passing it here. */
  bodyHtml: string;
  /** Optional call-to-action button rendered in the brand color. */
  cta?: EmailCta | null;
  /** Optional small footer note (e.g. "Link expires in 30 days."). */
  footerNote?: string | null;
  /** When true, append a "Reply STOP to opt out" / unsubscribe line to the
   *  footer (broadcasts + marketing sends — CAN-SPAM / CTIA). */
  unsubscribe?: boolean;
  /** Override the default unsubscribe copy (e.g. an email-list send may want
   *  "You can unsubscribe at any time." instead of the SMS-flavored default). */
  unsubscribeText?: string | null;
};

/** #RGB or #RRGGBB validator — anything else falls back to the neutral color. */
function safeHex(hex: string | null | undefined): string {
  if (!hex) return PLATFORM_NEUTRAL_HEX;
  const v = hex.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v;
  return PLATFORM_NEUTRAL_HEX;
}

/** Minimal HTML-attribute/text escape for the few caller-supplied plain
 *  strings we drop into the chrome (heading, chapterName, footer note). Body
 *  HTML is trusted and escaped by the caller. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Render a complete, branded, responsive HTML email document.
 *
 * Returns a full `<!doctype html>` string ready to hand to Resend's `html`
 * field. Pair with `renderEmailText()` (or your own) for the plaintext part.
 */
export function renderEmail(opts: RenderEmailOptions): string {
  const brand = safeHex(opts.brandHex);
  const chapterName = esc((opts.chapterName || "Your Chapter").trim());
  const subline = opts.chapterSubline ? esc(opts.chapterSubline.trim()) : "";
  const heading = esc(opts.heading);
  const body = opts.bodyHtml; // trusted / pre-escaped by caller
  const footerNote = opts.footerNote ? esc(opts.footerNote) : "";

  const ctaBlock = opts.cta
    ? `
              <tr>
                <td style="padding:8px 0 4px;">
                  <a href="${esc(opts.cta.url)}" target="_blank" rel="noopener noreferrer"
                     style="display:inline-block;background:${brand};color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:600;font-size:15px;line-height:1;">
                    ${esc(opts.cta.label)}
                  </a>
                </td>
              </tr>`
    : "";

  const unsubText =
    opts.unsubscribeText ||
    "You can opt out of these messages at any time by replying STOP.";
  const unsubBlock = opts.unsubscribe
    ? `<div style="margin-top:10px;">${esc(unsubText)}</div>`
    : "";
  const noteBlock = footerNote
    ? `<div style="margin-top:10px;">${footerNote}</div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e6ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <!-- Masthead — tinted by the chapter brand color (neutral fallback). -->
          <tr>
            <td style="background:${brand};padding:22px 28px;color:#ffffff;">
              <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;opacity:.9;">${chapterName}</div>
              ${subline ? `<div style="font-size:12px;opacity:.8;margin-top:3px;">${subline}</div>` : ""}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 28px 8px;color:#0a0a0a;">
              <h1 style="font-size:21px;line-height:1.3;margin:0 0 12px;font-weight:700;color:#0a0a0a;">${heading}</h1>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.6;color:#3f3f46;">
                <tr>
                  <td style="padding-bottom:8px;">${body}</td>
                </tr>
                ${ctaBlock}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:18px 28px 26px;border-top:1px solid #eeeef2;color:#8a8a93;font-size:12px;line-height:1.6;">
              <div style="font-weight:600;color:#6b6b73;">${chapterName}</div>
              <div style="margin-top:4px;">${esc(PLATFORM_LINE)}</div>
              ${noteBlock}
              ${unsubBlock}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Convenience helper to build a sensible plaintext fallback from a heading +
 * a few lines + an optional CTA URL. Callers may also supply their own text.
 */
export function renderEmailText(opts: {
  heading: string;
  lines?: string[];
  cta?: EmailCta | null;
  chapterName?: string | null;
}): string {
  const parts: string[] = [opts.heading.trim()];
  for (const l of opts.lines || []) {
    if (l && l.trim()) parts.push(l.trim());
  }
  if (opts.cta) parts.push(`${opts.cta.label}: ${opts.cta.url}`);
  if (opts.chapterName) parts.push(`— ${opts.chapterName.trim()}`);
  return parts.join("\n\n");
}
