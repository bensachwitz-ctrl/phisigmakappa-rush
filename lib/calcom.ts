/**
 * Resolve a chapter's configured Cal.com / Cal.diy handle (the
 * `calendar.calDiyUrl` SiteConfig value, set on /admin/settings → Calendar)
 * into a bookable embed URL.
 *
 * The single settings field intentionally accepts THREE shapes so a chapter can
 * paste whatever their scheduler gives them without a second key:
 *   • a bare Cal.com username        → "phisigusc"
 *   • a username + event-type slug   → "phisigusc/rush-coffee"
 *   • a full self-hosted Cal.diy URL → "https://cal.phisigusc.com/meeting"
 *
 * Returns "" when unset/blank so callers render nothing (never a broken iframe).
 * Pure + isomorphic (no deps) so it is safe to import from client and server.
 */
export function calcomEmbedUrl(raw: string | undefined | null): string {
  const v = (raw || "").trim();
  if (!v) return "";
  // A full http(s) URL (self-hosted Cal.diy or any booking link) is used as-is;
  // anything else is treated as a Cal.com username / username/event-type slug.
  const base = /^https?:\/\//i.test(v)
    ? v
    : `https://cal.com/${v.replace(/^\/+/, "")}`;
  // Append the inline-embed + light-theme hints without clobbering any query
  // string the chapter already included on a self-hosted URL.
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}embed=true&theme=light`;
}
