/**
 * lib/safe-image-url.ts — gate an image URL before it is rendered into an
 * `<img src>` or persisted as a site-builder section image.
 *
 * Two attack classes are closed here:
 *
 *   • XSS — a pasted `javascript:…`, `data:text/html,…`, or `vbscript:…` value
 *     is not a real image. If it reached an `<img src>` (or, worse, was later
 *     reused in an href / CSS url()) it could execute. Only http(s),
 *     protocol-relative, root-relative, and raster `data:image/*` values pass.
 *
 *   • SSRF / internal probing — an `http://localhost/…`, `http://127.0.0.1/…`,
 *     `http://10.x/…`, `http://169.254.x/…` (etc.) value makes the admin's — and
 *     every published-site visitor's — browser fetch an internal host. Loopback,
 *     private, link-local, and `.local` / `.internal` hosts are rejected.
 *
 * Pure, dependency-free, isomorphic — safe to import from both server routes and
 * `"use client"` components, and unit-testable in node vitest.
 */

/**
 * IPv4 ranges that must never be fetched from a browser on the user's behalf:
 * `0.0.0.0/8`, loopback `127.0.0.0/8`, link-local `169.254.0.0/16`, and the
 * RFC-1918 private blocks `10/8`, `192.168/16`, `172.16-31/12`.
 */
const PRIVATE_V4 =
  /^(?:0|10|127)\.|^169\.254\.|^192\.168\.|^172\.(?:1[6-9]|2\d|3[0-1])\./;

/** Any ASCII control char (incl. tab/newline) — a scheme-obfuscation vector. */
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;

/** True if `host` is a loopback / private / link-local / internal name. */
function isPrivateHost(host: string): boolean {
  // Strip IPv6 brackets and normalize case.
  const h = host.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  // IPv6 loopback / unspecified / unique-local (fc00::/7) / link-local (fe80::/10).
  if (h === "::1" || h === "::") return true;
  if (/^f[cd][0-9a-f]{2}:/.test(h)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(h)) return true;
  // IPv4 loopback / private / link-local / unspecified.
  if (h === "0.0.0.0") return true;
  if (PRIVATE_V4.test(h)) return true;
  return false;
}

/**
 * True if `raw` is safe to place in an `<img src>` or persist as a section image.
 * Rejects dangerous schemes (XSS) and loopback/private hosts (SSRF); allows
 * http(s) to public hosts, protocol-relative URLs, root-relative paths, and
 * raster `data:image/*` payloads (e.g. the dev-mock WebP the uploader returns).
 */
export function isSafeImageUrl(raw: string | null | undefined): boolean {
  if (raw == null) return false;
  const s = String(raw).trim();
  if (!s) return false;
  // Embedded control chars / newlines are a classic scheme-obfuscation trick
  // ("java\tscript:"), and never legitimate in an image URL.
  if (CONTROL_CHARS.test(s)) return false;

  // data: — only real raster image payloads (never data:text/html or SVG, which
  // can carry script in some render contexts).
  if (/^data:/i.test(s)) {
    return /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|x-icon)[;,]/i.test(s);
  }

  // Root-relative ("/img/x.png") is same-origin and safe. Protocol-relative
  // ("//host/x.png") needs host inspection, so it falls through to URL parsing.
  if (s.startsWith("/") && !s.startsWith("//")) return true;

  let url: URL;
  try {
    url = new URL(s.startsWith("//") ? `https:${s}` : s);
  } catch {
    return false;
  }
  const scheme = url.protocol.toLowerCase();
  if (scheme !== "http:" && scheme !== "https:") return false;
  if (isPrivateHost(url.hostname)) return false;
  return true;
}

/**
 * Sanitize an image URL for storage / render: the trimmed URL when
 * {@link isSafeImageUrl} passes, otherwise the empty string (so an unsafe value
 * is dropped rather than persisted or rendered).
 */
export function sanitizeImageUrl(raw: string | null | undefined): string {
  return isSafeImageUrl(raw) ? String(raw).trim() : "";
}
