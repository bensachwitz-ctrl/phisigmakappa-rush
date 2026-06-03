import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { getSubdomain } from "@/lib/prisma";

// NODE runtime (was edge): the manifest is per-tenant now and reads
// getSiteConfig() through the tenant-aware Prisma proxy, which needs nodejs.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeHex(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  const t = input.trim();
  return /^#([0-9a-fA-F]{3}){1,2}$/.test(t) ? t : fallback;
}

/**
 * Web app manifest. Lets a parent or rushee "Add to Home Screen" the rush site
 * and gets it a proper icon + theme color. Per-tenant: name / short_name /
 * description / theme_color all come from the current chapter's SiteConfig. On
 * the Greekstack marketing apex (no subdomain) it serves generic Greekstack
 * branding so no chapter identity leaks onto the apex install.
 */
export async function GET() {
  const host =
    headers().get("host") || headers().get("x-forwarded-host") || null;
  const onApex = getSubdomain(host) === null;

  let name: string;
  let shortName: string;
  let description: string;
  let themeColor: string;

  if (onApex) {
    name = "Greekstack — chapter rush & roster platform";
    shortName = "Greekstack";
    description =
      "Greekstack is the white-label platform for Greek-letter chapter rush, brotherhood management, and TCPA-compliant communications.";
    themeColor = "#0F172A";
  } else {
    const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
    const id = chapterIdentityFromCfg(cfg);
    name = `${id.chapterFullName} — Rush at ${id.schoolShort}`;
    shortName = id.appShortTitle;
    description = `${id.chapterFullName} chapter at ${id.schoolName}. Get on the rush interest list.`;
    themeColor = safeHex(cfg["brand.primaryHex"], "#C8102E");
  }

  return NextResponse.json(
    {
      name,
      short_name: shortName,
      description,
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#FFFFFF",
      theme_color: themeColor,
      orientation: "portrait-primary",
      icons: [
        {
          src: "/icon",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/apple-icon",
          sizes: "180x180",
          type: "image/png",
          purpose: "any",
        },
        // Maskable variant — Android adaptive-icon launchers (Pixel, Samsung
        // OneUI, etc.) clip the icon into the system shape. Without a maskable
        // entry the OS letterboxes our glyph; with it, the entire 512×512
        // canvas is available and the launcher's mask only crops the safe-zone
        // padding instead of the chapter wordmark itself.
        {
          src: "/maskable-icon",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        // Per-tenant now — must not be shared across hosts by a CDN. Keep it
        // private + short so Clemson never gets Phi Sig's cached manifest.
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    }
  );
}
