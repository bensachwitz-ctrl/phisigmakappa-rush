import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxies an Instagram post's og:image so we can render real chapter photos
 * without iframe embeds. Slug = the path segment in instagram.com/p/<slug>/.
 *
 * Returns the image bytes with permissive cache headers so Vercel's edge cache
 * keeps them around. If we can't extract the image, returns 302 to a fallback.
 */
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const slug = (params.slug || "").replace(/[^A-Za-z0-9_-]/g, "");
  if (!slug) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const postUrl = `https://www.instagram.com/p/${slug}/`;

  try {
    const html = await fetch(postUrl, {
      headers: {
        // Pretend to be a normal browser so Instagram serves the public meta tags.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
        "Accept-Language": "en-US,en;q=0.9",
      },
      // Instagram sometimes 301-redirects to a login wall — follow up to 5 hops
      redirect: "follow",
      cache: "no-store",
    }).then((r) => (r.ok ? r.text() : ""));

    if (!html) throw new Error("empty");

    // Try multiple og: variants — Instagram has changed these over time
    const ogMatch =
      html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/) ||
      html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/) ||
      html.match(/"display_url":"([^"]+)"/);

    if (!ogMatch?.[1]) throw new Error("no og:image");

    let imgUrl = ogMatch[1].replace(/&amp;/g, "&").replace(/\\u0026/g, "&");

    const imgRes = await fetch(imgUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.instagram.com/",
      },
      cache: "no-store",
    });

    if (!imgRes.ok) throw new Error(`img status ${imgRes.status}`);

    const buf = Buffer.from(await imgRes.arrayBuffer());

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": imgRes.headers.get("Content-Type") || "image/jpeg",
        // Cache aggressively at the edge — Instagram URLs rotate but the photo we
        // return here stays the same for the same slug.
        "Cache-Control": "public, max-age=86400, s-maxage=2592000, immutable",
      },
    });
  } catch (err) {
    // Fall through — return a transparent 1x1 so <img> doesn't show a broken icon
    const transparent = Buffer.from(
      "47 49 46 38 39 61 01 00 01 00 80 00 00 00 00 00 00 00 00 21 F9 04 01 00 00 00 00 2C 00 00 00 00 01 00 01 00 00 02 02 44 01 00 3B"
        .split(" ")
        .map((h) => parseInt(h, 16))
    );
    return new NextResponse(transparent, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "public, max-age=300",
      },
    });
  }
}
