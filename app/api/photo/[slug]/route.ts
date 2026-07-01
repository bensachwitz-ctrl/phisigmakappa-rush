import { NextResponse } from "next/server";
import crypto from "crypto";
import { lookup as dnsLookup } from "dns/promises";
import net from "net";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hard cap on bytes we will pull from any remote host before bailing. Real
// chapter photos are well under this; the cap stops a malicious/garbage URL
// from streaming gigabytes through our function (memory + bandwidth DoS).
const MAX_REMOTE_BYTES = 12 * 1024 * 1024; // 12 MB

// Per-request wall-clock ceiling for any single external fetch (Instagram
// embed HTML + CDN image bytes). A stalled/slow upstream must not hang the
// function; on timeout the fetch is aborted and the caller falls through to
// its existing fallback/placeholder path.
const REMOTE_FETCH_TIMEOUT_MS = 8000;

/**
 * SSRF allowlist for the arbitrary-URL proxy branch. ONLY these host suffixes
 * may be fetched: Instagram's CDNs and our own Vercel Blob store. This mirrors
 * the `img-src` allowlist in next.config.js. Anything else (internal services,
 * cloud metadata endpoints, file://, etc.) is rejected before any network I/O.
 */
function isAllowedProxyHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "cdninstagram.com" ||
    h.endsWith(".cdninstagram.com") ||
    h === "fbcdn.net" ||
    h.endsWith(".fbcdn.net") ||
    h.endsWith(".vercel-storage.com")
  );
}

/**
 * Reject IPs that point back at our own infrastructure or private networks.
 * Covers loopback, RFC-1918 / RFC-4193 private ranges, link-local (including
 * the 169.254.169.254 cloud-metadata endpoint), CGNAT, and unspecified addrs —
 * for both IPv4 and IPv6 (including IPv4-mapped IPv6 like ::ffff:169.254.169.254).
 */
function isBlockedAddress(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) return isBlockedIpv4(ip);
  if (kind === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::" ) return true;
    // IPv4-mapped / IPv4-compatible — extract the embedded v4 and re-check.
    const v4mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4mapped) return isBlockedIpv4(v4mapped[1]);
    // Unique-local fc00::/7 and link-local fe80::/10.
    if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true;
    if (/^fe[89ab][0-9a-f]:/.test(lower)) return true;
    return false;
  }
  // Not a parseable IP — treat as blocked (we only fetch resolved literals).
  return true;
}

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a >= 224) return true; // multicast + reserved (224.0.0.0/4, 240.0.0.0/4)
  return false;
}

/**
 * Safely fetch a remote image with full SSRF protection:
 *  - host must be on the allowlist
 *  - every resolved IP must be public (no private/loopback/link-local)
 *  - redirects are disabled (a 30x to an internal host can't smuggle us in)
 *  - the response must declare an image/* content-type
 *  - the body is capped at MAX_REMOTE_BYTES, enforced while streaming
 * Returns null on any violation; the caller renders a transparent pixel.
 */
async function safeFetchImage(
  rawUrl: string
): Promise<{ buf: Buffer; contentType: string } | null> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!isAllowedProxyHost(parsed.hostname)) return null;

  // Resolve DNS and confirm EVERY address is public before connecting. This
  // closes DNS-rebinding to an allowlisted name that points at an internal IP.
  try {
    const records = await dnsLookup(parsed.hostname, { all: true });
    if (!records.length) return null;
    for (const rec of records) {
      if (isBlockedAddress(rec.address)) return null;
    }
  } catch {
    return null;
  }

  // Bound the connection: a stalled/slow CDN must not hang the function.
  // On timeout the AbortController fires, fetch rejects, and we fall through
  // to `return null` (caller renders a transparent pixel).
  let res: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);
  try {
    res = await fetch(parsed.toString(), {
      redirect: "manual", // never follow a 30x into an internal host
      cache: "no-store",
      headers: { Accept: "image/*" },
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) return null; // redirects (3xx) land here too — rejected

  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (!ct.startsWith("image/")) return null;

  // Reject early if the declared length already blows the cap.
  const declaredLen = parseInt(res.headers.get("content-length") || "", 10);
  if (Number.isFinite(declaredLen) && declaredLen > MAX_REMOTE_BYTES) return null;

  // Stream with a hard byte ceiling so a lying/absent Content-Length can't
  // exhaust memory.
  const body = res.body;
  if (!body) return null;
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_REMOTE_BYTES) {
          await reader.cancel().catch(() => {});
          return null;
        }
        chunks.push(value);
      }
    }
  } catch {
    return null;
  }
  return { buf: Buffer.concat(chunks), contentType: ct.split(";")[0].trim() };
}

// 30 days at the edge, 24h at the browser. URL is keyed by Instagram slug, which
// is itself stable per post — so the bytes effectively are immutable at this URL.
//
// Vary: Accept covers AVIF/WebP/JPEG variants (3-way negotiation).
// Vary: Width is added to disambiguate per-?w= variants when responsive
// srcset is in play, so a phone request never mistakenly receives a 4K asset
// (or vice versa) cached at the same URL.
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=2592000, immutable",
  "CDN-Cache-Control": "public, max-age=2592000, stale-while-revalidate=2592000, immutable",
  "Vercel-CDN-Cache-Control": "public, max-age=2592000, stale-while-revalidate=2592000, immutable",
  Vary: "Accept",
};

// Allowed widths — the only DPR/viewport multipliers we actually emit in
// srcset. Restricting the set prevents a `?w=99999` cache-key explosion attack
// and lets the edge cache hit ratio stay near 100%.
const ALLOWED_WIDTHS = new Set([320, 480, 640, 960, 1280, 1600, 1920]);
function clampWidth(input: string | null): number | null {
  if (!input) return null;
  const n = parseInt(input, 10);
  if (!Number.isFinite(n)) return null;
  if (ALLOWED_WIDTHS.has(n)) return n;
  // Snap to nearest allowed width if a client sends an odd value.
  let best: number = 640;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const w of ALLOWED_WIDTHS) {
    const d = Math.abs(w - n);
    if (d < bestDist) { best = w; bestDist = d; }
  }
  return best;
}

/**
 * Negotiate the best image format the client supports. Prefer AVIF (≈ 25-35%
 * smaller than WebP at equivalent quality), fall back to WebP, fall back to
 * the original. Falls back silently to the original at every step if sharp
 * can't read the input (corrupt JPEG, animated GIF, etc.).
 */
async function negotiateFormat(
  buf: Buffer,
  originalContentType: string,
  accept: string | null,
  resizeWidth: number | null
): Promise<{ buf: Buffer; contentType: string }> {
  const lower = (accept || "").toLowerCase();
  const wantsAvif = lower.includes("image/avif");
  const wantsWebp = lower.includes("image/webp");

  // Helper: optionally resize to the requested width. We never upscale.
  // If the source is smaller than the requested width, sharp's `withoutEnlargement`
  // returns the original size — preserving sharpness on already-small assets.
  const pipeline = () => {
    let p = sharp(buf, { failOn: "none" }).rotate();
    if (resizeWidth) {
      p = p.resize({ width: resizeWidth, withoutEnlargement: true });
    }
    return p;
  };

  // Try AVIF first — biggest savings.
  if (wantsAvif) {
    try {
      const avif = await pipeline().avif({ quality: 60, effort: 4 }).toBuffer();
      if (avif.byteLength < buf.byteLength) {
        return { buf: avif, contentType: "image/avif" };
      }
    } catch {
      // fall through to WebP
    }
  }

  // WebP — universally supported, 16-30% smaller than JPEG.
  if (wantsWebp) {
    try {
      const webp = await pipeline().webp({ quality: 80, effort: 4 }).toBuffer();
      if (webp.byteLength < buf.byteLength) {
        return { buf: webp, contentType: "image/webp" };
      }
    } catch {
      // fall through to original
    }
  }

  // No preferred format requested OR transcoding lost. Still resize the
  // original if a width was requested — saves bandwidth on phones that
  // happen to have an Accept-image-policy stripped by their proxy.
  if (resizeWidth) {
    try {
      const resized = await pipeline().jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      if (resized.byteLength < buf.byteLength) {
        return { buf: resized, contentType: "image/jpeg" };
      }
    } catch {
      // fall through to original bytes
    }
  }

  return { buf, contentType: originalContentType };
}

/**
 * Build a strong, content-derived ETag. Hash of the bytes ensures revalidation
 * works correctly across width/format variants — two clients requesting the
 * same URL with the same Accept + width get the same ETag and can 304 cleanly.
 */
function buildETag(buf: Buffer): string {
  const h = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 16);
  return `"${h}"`;
}

/**
 * Resolves an Instagram post's hero photo and proxies the bytes through our
 * domain. Uses Instagram's public /embed/ endpoint which doesn't require login
 * (the regular post URL hits a login wall and returns the IG logo as og:image).
 *
 * If the request `Accept` header includes `image/webp` (every modern browser
 * does), we transcode to WebP at q=80 — typically 30-50% smaller than IG's JPEG.
 */
export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const accept = req.headers.get("accept");
  const raw = decodeURIComponent(params.slug || "");
  const reqUrl = new URL(req.url);
  const reqWidth = clampWidth(reqUrl.searchParams.get("w"));
  const ifNoneMatch = req.headers.get("if-none-match");

  // If the "slug" is actually a full URL (admin uploaded a direct image to
  // Vercel Blob, etc.), proxy it through this route so we apply caching + WebP.
  // SSRF-hardened: safeFetchImage enforces a host allowlist (IG CDNs + our
  // Vercel Blob only), blocks private/loopback/link-local IPs after DNS,
  // disables redirects, and requires an image/* content-type within a size cap.
  if (/^https?:\/\//.test(raw)) {
    const fetched = await safeFetchImage(raw);
    if (!fetched) return transparentPixel();
    try {
      const { buf, contentType } = await negotiateFormat(
        fetched.buf,
        fetched.contentType,
        accept,
        reqWidth
      );
      const etag = buildETag(buf);
      if (ifNoneMatch && ifNoneMatch === etag) {
        return new NextResponse(null, { status: 304, headers: { ETag: etag, ...CACHE_HEADERS } });
      }
      return new NextResponse(buf as unknown as BodyInit, {
        status: 200,
        headers: { "Content-Type": contentType, ETag: etag, ...CACHE_HEADERS },
      });
    } catch {
      return transparentPixel();
    }
  }

  const slug = raw.replace(/[^A-Za-z0-9_-]/g, "");
  if (!slug) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const candidates = [
    `https://www.instagram.com/p/${slug}/embed/captioned/`,
    `https://www.instagram.com/p/${slug}/embed/`,
  ];

  // Patterns to find image URLs inside Instagram's embed HTML.
  const patterns = [
    /class="EmbeddedMediaImage"[^>]*\bsrc="([^"]+)"/i,
    /<img[^>]*class="[^"]*EmbeddedMediaImage[^"]*"[^>]*src="([^"]+)"/i,
    /"display_url"\s*:\s*"([^"]+)"/i,
    /<meta\s+property="og:image"\s+content="([^"]+)"/i,
    /<meta\s+content="([^"]+)"\s+property="og:image"/i,
  ];

  let imgUrl: string | null = null;

  for (const url of candidates) {
    // Bound each embed-HTML fetch: a stalled IG endpoint aborts at the timeout
    // and lands in the catch below, which `continue`s to the next candidate
    // (and ultimately the transparent-pixel fallback if all candidates fail).
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);
    try {
      const html = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        },
        redirect: "follow",
        cache: "no-store",
        signal: controller.signal,
      }).then((r) => (r.ok ? r.text() : ""));
      if (!html) continue;

      // Sanity gate: if the embed HTML doesn't contain post-specific
      // markup (EmbeddedMediaImage class, display_url JSON, or a Caption
      // div), Instagram returned the generic "this page isn't available"
      // shell — its og:image is the IG hero/branding asset, not a real
      // post. Skip extracting from this candidate.
      const hasPostMarkup =
        /class="EmbeddedMediaImage"/i.test(html) ||
        /"display_url"\s*:/i.test(html) ||
        /class="Caption/i.test(html) ||
        /class="EmbedHeader"/i.test(html);
      if (!hasPostMarkup) continue;

      for (const re of patterns) {
        const m = html.match(re);
        if (m?.[1]) {
          imgUrl = m[1].replace(/&amp;/g, "&").replace(/\\u0026/g, "&").replace(/\\\//g, "/");
          // Skip Instagram's generic branding/logo fallbacks. These appear
          // when a post is private, deleted, age-gated, or the embed page
          // falls back to the IG app icon/login splash. Reject anything
          // not served from a known IG CDN host (real post photos always
          // come from *.cdninstagram.com or *.fbcdn.net).
          const isIgBranding =
            /instagram\.com\/static\/.+(InstagramLogo|InstagramApp|InstagramSplash|branding|app[-_]?icon|favicon|glyph)/i.test(imgUrl)
            || /instagram\.com\/static\/images\//i.test(imgUrl)
            || /\/static\/bundles\//i.test(imgUrl);
          const isCdnHosted =
            /\.cdninstagram\.com\//i.test(imgUrl) ||
            /\.fbcdn\.net\//i.test(imgUrl);
          if (imgUrl && !isIgBranding && isCdnHosted) {
            break;
          }
          imgUrl = null;
        }
      }
      if (imgUrl) break;
    } catch {
      continue;
    } finally {
      clearTimeout(timer);
    }
  }

  if (!imgUrl) {
    return transparentPixel();
  }

  // Bound the CDN image fetch (headers + body read). A stalled upstream aborts
  // at the timeout, the throw is caught below, and we return a transparent
  // pixel — same fallback as any other image-fetch failure.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);
  try {
    let original: Buffer;
    let originalCt: string;
    try {
      const imgRes = await fetch(imgUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://www.instagram.com/",
        },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!imgRes.ok) throw new Error(`img status ${imgRes.status}`);
      original = Buffer.from(await imgRes.arrayBuffer());
      originalCt = imgRes.headers.get("Content-Type") || "image/jpeg";
    } finally {
      clearTimeout(timer);
    }

    // Sanity check: real Phi Sig chapter photos from Instagram are 100KB+.
    // Anything under 60KB is almost certainly an IG branding/logo asset
    // returned by a login-wall or private-post fallback path (the IG app
    // icon at high res tops out around 50KB). Reject so we don't poison
    // browser caches with the wrong image — the client gets a transparent
    // pixel and the page-level <img> falls back to the heraldic-Crest tile.
    if (original.byteLength < 60_000) {
      throw new Error(`suspiciously small image: ${original.byteLength} bytes`);
    }

    const { buf, contentType } = await negotiateFormat(original, originalCt, accept, reqWidth);
    const etag = buildETag(buf);

    // Honor If-None-Match — clients that already have this exact byte sequence
    // get a 304 with no body. Saves bandwidth post the 30-day max-age window
    // when the photo proxy revalidates.
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, ...CACHE_HEADERS } });
    }
    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: { "Content-Type": contentType, ETag: etag, ...CACHE_HEADERS },
    });
  } catch {
    return transparentPixel();
  }
}

function transparentPixel() {
  // 1x1 transparent GIF
  const transparent = Buffer.from([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
    0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
    0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
  ]);
  return new NextResponse(transparent, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "public, max-age=300",
    },
  });
}
