import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Web app manifest. Lets a parent or rushee "Add to Home Screen" the rush site
 * and gets it a proper icon + theme color. Also satisfies legacy crawlers that
 * 404-noise the console looking for a manifest.
 */
export function GET() {
  return NextResponse.json(
    {
      name: "Phi Sigma Kappa Gamma Triton — Rush at USC",
      short_name: "Phi Sig USC",
      description:
        "Phi Sigma Kappa Gamma Triton chapter at the University of South Carolina. Get on the Fall 2026 rush interest list.",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#FFFFFF",
      theme_color: "#C8102E",
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
