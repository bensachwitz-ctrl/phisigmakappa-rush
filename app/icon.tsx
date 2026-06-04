import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { getSubdomain } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";

// Node runtime so we can resolve the per-tenant chapter config (Prisma). The
// browser-tab icon now reflects the CURRENT chapter (its glyph + brand color)
// on a subdomain, and the Greekstack platform mark on the apex — no more Phi
// Sig "ΦΣΚ" leaking onto every tenant's tab.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  let host = "";
  try {
    host = headers().get("host") || "";
  } catch {}
  const subdomain = getSubdomain(host);

  // Apex (no subdomain) → Greekstack platform mark on the indigo→violet→cyan gradient.
  if (!subdomain) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #22D3EE 100%)",
            color: "white",
            fontFamily: "Georgia, serif",
            fontWeight: 800,
            fontSize: 34,
            letterSpacing: -1,
            borderRadius: 14,
          }}
        >
          G
        </div>
      ),
      { ...size }
    );
  }

  // Tenant → the chapter's own glyph + brand color.
  let glyph = "ΦΣ";
  let primary = "#C8102E";
  let dark = "#A20D26";
  try {
    const cfg = await getSiteConfig();
    glyph = (cfg["chapter.fraternityLetters"] || cfg["chapter.greekLettersGlyphs"] || "ΦΣ").trim().slice(0, 3);
    primary = cfg["brand.primaryHex"] || primary;
    dark = cfg["brand.primaryDarkHex"] || dark;
  } catch {}

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${primary} 0%, ${dark} 100%)`,
          color: "white",
          fontFamily: "Georgia, serif",
          fontWeight: 700,
          fontSize: glyph.length > 2 ? 22 : 28,
          letterSpacing: -1,
          borderRadius: 12,
        }}
      >
        {glyph}
      </div>
    ),
    { ...size }
  );
}
