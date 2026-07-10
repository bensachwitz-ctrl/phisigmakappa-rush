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
  let base: string;
  if (/^https?:\/\//i.test(v)) {
    // A full URL is only embedded when it points at a KNOWN scheduler host. The
    // value is admin-supplied and rendered in an <iframe>, so an arbitrary host
    // (or a javascript:/data: scheme) must NEVER load — return "" so the caller
    // self-hides instead. Allowed: cal.com (+ subdomains), cal.diy (+ subdomains),
    // and self-hosted Cal instances whose host starts with "cal." (the documented
    // pattern, e.g. cal.phisigusc.com).
    let u: URL;
    try {
      u = new URL(v);
    } catch {
      return "";
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    if (!isAllowedSchedulerHost(u.hostname)) return "";
    base = v;
  } else {
    // Bare username / username/event-type slug → the canonical cal.com host.
    // Validate the slug shape so a stray scheme ("javascript:…") or junk can't be
    // pasted into the path; a real Cal handle is only word chars, -, _, ., and /.
    const slug = v.replace(/^\/+/, "");
    if (!/^[\w\-./]+$/.test(slug)) return "";
    base = `https://cal.com/${slug}`;
  }
  // Append the inline-embed + light-theme hints without clobbering any query
  // string the chapter already included on a self-hosted URL.
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}embed=true&theme=light`;
}

/** Allowlist for the embed host — cal.com / cal.diy families + self-hosted Cal
 *  instances (host label starting with "cal."). Prevents an admin-supplied URL
 *  from loading an arbitrary origin inside the booking iframe. */
export function isAllowedSchedulerHost(hostname: string): boolean {
  const host = (hostname || "").toLowerCase();
  if (!host) return false;
  return (
    host === "cal.com" ||
    host.endsWith(".cal.com") ||
    host === "cal.diy" ||
    host.endsWith(".cal.diy") ||
    host.startsWith("cal.")
  );
}
