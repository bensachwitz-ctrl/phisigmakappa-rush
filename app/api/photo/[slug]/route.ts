import { NextResponse } from "next/server";
import crypto from "crypto";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  if (/^https?:\/\//.test(raw)) {
    try {
      const r = await fetch(raw, { cache: "no-store" });
      if (!r.ok) return transparentPixel();
      const original = Buffer.from(await r.arrayBuffer());
      const originalCt = r.headers.get("Content-Type") || "image/jpeg";
      const { buf, contentType } = await negotiateFormat(original, originalCt, accept, reqWidth);
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
      }).then((r) => (r.ok ? r.text() : ""));
      if (!html) continue;

      for (const re of patterns) {
        const m = html.match(re);
        if (m?.[1]) {
          imgUrl = m[1].replace(/&amp;/g, "&").replace(/\\u0026/g, "&").replace(/\\\//g, "/");
          // Skip Instagram's generic branding/logo fallbacks. These appear when
          // a post is private, deleted, age-gated, or the embed page falls
          // back to the IG app icon/login splash. Any of these patterns means
          // we got the wrong image and should fall through to the next pattern
          // or candidate URL.
          const isIgBranding = /instagram\.com\/static\/.+(InstagramLogo|InstagramApp|InstagramSplash|branding|app[-_]?icon|favicon|glyph)/i.test(imgUrl)
            || /instagram\.com\/static\/images\//i.test(imgUrl)
            || /\/static\/bundles\//i.test(imgUrl);
          if (imgUrl && !isIgBranding) {
            break;
          }
          imgUrl = null;
        }
      }
      if (imgUrl) break;
    } catch {
      continue;
    }
  }

  if (!imgUrl) {
    return transparentPixel();
  }

  try {
    const imgRes = await fetch(imgUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.instagram.com/",
      },
      cache: "no-store",
    });
    if (!imgRes.ok) throw new Error(`img status ${imgRes.status}`);
    const original = Buffer.from(await imgRes.arrayBuffer());

    // Sanity check: real Phi Sig chapter photos from Instagram are 100KB+.
    // Anything under 60KB is almost certainly an IG branding/logo asset
    // returned by a login-wall or private-post fallback path (the IG app
    // icon at high res tops out around 50KB). Reject so we don't poison
    // browser caches with the wrong image — the client gets a transparent
    // pixel and the page-level <img> falls back to the heraldic-Crest tile.
    if (original.byteLength < 60_000) {
      throw new Error(`suspiciously small image: ${original.byteLength} bytes`);
    }

    const originalCt = imgRes.headers.get("Content-Type") || "image/jpeg";
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
