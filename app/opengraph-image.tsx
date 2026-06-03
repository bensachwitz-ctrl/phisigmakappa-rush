import { ImageResponse } from "next/og";
import { getChapterIdentity } from "@/lib/chapter-identity";
import { getSiteConfig } from "@/lib/site-config";
import { headers } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Chapter Recruitment — Fall Rush";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const identity = await getChapterIdentity().catch(() => ({
    fraternityName: "Phi Sigma Kappa",
    fraternityShort: "Phi Sig",
    greekLetters: "Gamma Triton",
    greekLettersGlyphs: "ΓΤ",
    schoolName: "University of South Carolina",
    schoolShort: "USC",
    charterYear: "1975",
    foundingYear: "1873",
    fraternityLetters: "ΦΣΚ",
    chapterFullName: "Phi Sigma Kappa Gamma Triton",
    chapterAttribution: "Phi Sig USC",
    ogAlt: "Phi Sigma Kappa @ USC",
  }));

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const primaryColor = cfg["brand.primaryHex"] || "#C8102E";
  const primaryDark = cfg["brand.primaryDarkHex"] || "#A20D26";
  const primarySoft = cfg["brand.primarySoftHex"] || "#FCEFF1";

  const reqHeaders = headers();
  const host = reqHeaders.get("host") || "phisigmakappa.vercel.app";

  const statsBrothers = cfg["stats.brothers"] || "60+";
  const statsGpa = cfg["stats.gpa"] || "3.45";
  const statsYears = cfg["stats.years"] || "50+";
  const statsYearsLabel = cfg["stats.years.label"] || "Years strong";

  const currentYear = new Date().getFullYear();
  const rushYearLabel = `Fall Rush ${currentYear}`;

  const ogTitle = cfg["seo.ogTitle"] || `The chapter that built the men of ${identity.schoolShort === "USC" ? "Carolina" : identity.schoolShort}.`;
  const glyphs = identity.fraternityLetters || "ΦΣΚ";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryDark} 50%, #1e0206 100%)`,
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

        {/* Watermark Greek letters */}
        <div
          style={{
            position: "absolute",
            right: -60,
            top: -180,
            fontSize: 360,
            fontWeight: 800,
            opacity: 0.10,
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
              color: primaryColor,
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
              {identity.fraternityName}
            </div>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 600, marginTop: 2 }}>
              {identity.greekLetters} · {identity.schoolName}
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
            {rushYearLabel} — Interest list now open
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: -3,
            }}
          >
            {ogTitle}
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
            <span style={{ display: "flex" }}>{statsBrothers} brothers</span>
            <span style={{ display: "flex", opacity: 0.5 }}>·</span>
            <span style={{ display: "flex" }}>{statsGpa} GPA</span>
            <span style={{ display: "flex", opacity: 0.5 }}>·</span>
            <span style={{ display: "flex" }}>{statsYears} {statsYearsLabel}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
            {host}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
