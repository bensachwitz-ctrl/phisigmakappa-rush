import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { getSubdomain } from "@/lib/prisma";

// NODE runtime (was edge): the social-share card is per-tenant now, so it reads
// getSiteConfig() which goes through the tenant-aware Prisma proxy — and Prisma
// requires the nodejs runtime. On the Greekstack marketing apex (no subdomain)
// it renders generic Greekstack branding instead of any one chapter.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Greekstack — chapter rush, brotherhood & TCPA-compliant comms";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function safeHex(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  const t = input.trim();
  return /^#([0-9a-fA-F]{3}){1,2}$/.test(t) ? t : fallback;
}

export default async function Image() {
  const host =
    headers().get("host") || headers().get("x-forwarded-host") || null;
  const onApex = getSubdomain(host) === null;

  // Apex → generic Greekstack marketing card. No chapter identity leaks here.
  if (onApex) {
    return new ImageResponse(<GreekstackCard />, { ...size });
  }

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const id = chapterIdentityFromCfg(cfg);
  const primary = safeHex(cfg["brand.primaryHex"], "#C8102E");
  const primaryDark = safeHex(cfg["brand.primaryDarkHex"], "#A20D26");

  const glyphs = id.fraternityLetters; // e.g. "ΦΣΚ"
  const eyebrow = id.fraternityName; // e.g. "Phi Sigma Kappa"
  const subRow = `${id.greekLetters} · ${id.schoolName}`;
  const brothers = cfg["stats.brothers"] || "";
  const gpa = cfg["stats.gpa"] || "";
  const founded = id.foundingYear ? `Founded ${id.foundingYear}` : "";
  const stats = [
    brothers && `${brothers} brothers`,
    gpa && `${gpa} GPA`,
    founded,
  ].filter(Boolean) as string[];
  const url = (
    process.env.NEXT_PUBLIC_SITE_URL || `https://${host || "greeklifesystems.vercel.app"}`
  ).replace(/^https?:\/\//, "");
  const headline = `Rush ${id.fraternityShort} at ${id.schoolShort}.`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 50%, #2a0a10 100%)`,
          color: "#FFFFFF",
          fontFamily: "Inter, system-ui, sans-serif",
          padding: 64,
          position: "relative",
        }}
      >
        {/* Pattern dots layer */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.18) 1.5px, transparent 1.5px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Watermark Greek letters — corner, well above the text columns */}
        <div
          style={{
            position: "absolute",
            right: -60,
            top: -180,
            fontSize: 360,
            fontWeight: 800,
            opacity: 0.1,
            color: "#FFFFFF",
            letterSpacing: -8,
            fontFamily: "Georgia, serif",
            lineHeight: 1,
            display: "flex",
          }}
        >
          {glyphs}
        </div>

        {/* TOP: brand row */}
        <div style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 16, position: "relative" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: primary,
              fontSize: 32,
              fontWeight: 700,
              fontFamily: "Georgia, serif",
            }}
          >
            {glyphs}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 14,
                letterSpacing: 6,
                textTransform: "uppercase",
                opacity: 0.85,
              }}
            >
              {eyebrow}
            </div>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 600, marginTop: 2 }}>
              {subRow}
            </div>
          </div>
        </div>

        {/* MIDDLE: headline */}
        <div style={{ display: "flex", flexShrink: 0, flexDirection: "column", gap: 24, position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: 999,
              padding: "8px 18px",
              fontSize: 18,
              fontWeight: 500,
            }}
          >
            Rush interest list now open
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: -3,
            }}
          >
            {headline}
          </div>
        </div>

        {/* BOTTOM: stats + url */}
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            fontSize: 22,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", gap: 28 }}>
            {stats.map((s, i) => (
              <div key={s} style={{ display: "flex", gap: 28 }}>
                {i > 0 && <span style={{ display: "flex", opacity: 0.5 }}>·</span>}
                <span style={{ display: "flex" }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
            {url}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

/**
 * Generic Greekstack marketing card for the apex (no subdomain). Deliberately
 * carries ZERO chapter identity — no Phi Sig, no Gamma Triton, no USC.
 */
function GreekstackCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #334155 100%)",
        color: "#FFFFFF",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 64,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.12) 1.5px, transparent 1.5px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 16, position: "relative" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0F172A",
            fontSize: 34,
            fontWeight: 800,
          }}
        >
          GS
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 14, letterSpacing: 6, textTransform: "uppercase", opacity: 0.85 }}>
            Greekstack
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 600, marginTop: 2 }}>
            The chapter site that runs itself
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexShrink: 0, flexDirection: "column", gap: 24, position: "relative" }}>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, lineHeight: 1.04, letterSpacing: -3 }}>
          Rush, roster & comms for every Greek chapter.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          fontSize: 22,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", gap: 28 }}>
          <span style={{ display: "flex" }}>Per-chapter white-label</span>
          <span style={{ display: "flex", opacity: 0.5 }}>·</span>
          <span style={{ display: "flex" }}>TCPA-compliant SMS</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
          greeklifesystems.vercel.app
        </div>
      </div>
    </div>
  );
}
