import { NextResponse } from "next/server";
import { getSiteConfig } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/site-config/public
 *
 * Returns the PUBLIC, footer-relevant slice of this tenant's SiteConfig so a
 * "use client" page (e.g. /alumni/onboard/[token], /portal/reset-password,
 * /portal/alumni/register) can render <PublicFooterClient/> without rendering
 * the async server <PublicFooter/> inside its client tree (which throws
 * "Error: Not implemented." at request time).
 *
 * SECURITY: only the keys the public footer actually displays are returned —
 * the same chapter-identity / contact / anti-hazing values already rendered in
 * the page footer on every server-rendered page. No secrets (Stripe keys,
 * webhook secrets, listmonk creds, internal flags) are ever in this allow-list,
 * so this endpoint exposes nothing that isn't already public on the marketing
 * site. The tenant is resolved from the request Host by the Prisma proxy, so a
 * request to chapter-a.greekstack.app only ever returns chapter A's config.
 */

// Explicit allow-list of the ONLY keys the public footer reads. Anything not in
// this set is dropped before the response leaves the server.
const PUBLIC_FOOTER_KEYS = [
  "chapter.fraternityName",
  "chapter.fraternityShort",
  "chapter.greekLetters",
  "chapter.greekLettersGlyphs",
  "chapter.schoolName",
  "chapter.schoolShort",
  "chapter.foundingYear",
  "chapter.nationalName",
  "chapter.nationalHqUrl",
  "chapter.cardinalPrinciples",
  "chapter.orgType",
  "brand.logoUrl",
  "contact.advisorName",
  "contact.advisorTitle",
  "contact.advisorEmail",
  "contact.rushEmail",
  "contact.rushPhone",
  "contact.address",
  "contact.cityState",
  "antiHazing.hotline",
  "antiHazing.hotlineUrl",
] as const;

export async function GET() {
  let cfg: Record<string, string> = {};
  try {
    cfg = await getSiteConfig();
  } catch {
    cfg = {};
  }

  const out: Record<string, string> = {};
  for (const key of PUBLIC_FOOTER_KEYS) {
    if (cfg[key] !== undefined) out[key] = cfg[key];
  }

  return NextResponse.json(
    { ok: true, config: out },
    {
      // Short edge cache: the footer rarely changes and is identical for every
      // visitor of a given chapter, so a brief shared cache cuts the per-request
      // DB round-trip without ever serving stale data for long.
      headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
    },
  );
}
