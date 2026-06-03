import { NextResponse } from "next/server";
import { getChapterIdentity } from "@/lib/chapter-identity";
import { getSiteConfig } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Web app manifest. Lets a parent or rushee "Add to Home Screen" the rush site
 * and gets it a proper icon + theme color. Also satisfies legacy crawlers that
 * 404-noise the console looking for a manifest.
 */
export async function GET() {
  let identity;
  let themeColor = "#C8102E";
  try {
    identity = await getChapterIdentity();
    const cfg = await getSiteConfig();
    themeColor = cfg["brand.primaryHex"] || themeColor;
  } catch (e) {
    identity = {
      chapterFullName: "Phi Sigma Kappa Gamma Triton",
      appShortTitle: "Phi Sig USC",
      schoolName: "University of South Carolina",
      schoolShort: "USC",
    };
  }

  const currentYear = new Date().getFullYear();

  return NextResponse.json(
    {
      name: `${identity.chapterFullName} — Rush at ${identity.schoolShort}`,
      short_name: identity.appShortTitle,
      description: `${identity.chapterFullName} chapter at the ${identity.schoolName}. Get on the Fall '${currentYear % 100}' rush interest list.`,
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
        "Cache-Control": "public, max-age=86400",
      },
    }
  );
}
