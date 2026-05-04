import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resolves an Instagram post's hero photo and proxies the bytes through our domain.
 * Uses Instagram's public /embed/ endpoint which doesn't require login (the regular
 * post URL hits a login wall and returns the IG logo as og:image).
 */
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const raw = decodeURIComponent(params.slug || "");

  // If the "slug" is actually a full URL (admin uploaded a direct image to Vercel Blob, etc.),
  // proxy it through this route so we apply the same caching headers.
  if (/^https?:\/\//.test(raw)) {
    try {
      const r = await fetch(raw, { cache: "no-store" });
      if (!r.ok) return transparentPixel();
      const buf = Buffer.from(await r.arrayBuffer());
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": r.headers.get("Content-Type") || "image/jpeg",
          "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        },
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
  // The embed page renders the post's main image in an <img class="EmbeddedMediaImage">
  // and also stashes higher-res variants in inline JSON.
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
          // Skip the generic "Login • Instagram" og:image (the brand logo)
          if (imgUrl && !/instagram\.com\/static\/.+InstagramLogo/i.test(imgUrl)) {
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
    const buf = Buffer.from(await imgRes.arrayBuffer());

    // Sanity check: real Phi Sig chapter photos from Instagram are 100KB+.
    // Anything under 30KB is almost certainly the IG branding/logo asset
    // returned by a login-wall fallback path. Reject so we don't poison
    // browser caches with the wrong image.
    if (buf.byteLength < 30_000) {
      throw new Error(`suspiciously small image: ${buf.byteLength} bytes`);
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": imgRes.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
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
