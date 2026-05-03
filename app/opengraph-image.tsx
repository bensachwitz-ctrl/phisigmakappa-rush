import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Phi Sigma Kappa @ USC — Fall Rush 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background:
            "linear-gradient(135deg, #C8102E 0%, #A20D26 50%, #6e0918 100%)",
          color: "#FFFFFF",
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
          padding: 80,
        }}
      >
        {/* Pattern dots */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.18) 1.5px, transparent 1.5px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Greek letters */}
        <div
          style={{
            position: "absolute",
            right: -40,
            top: -60,
            fontSize: 540,
            fontWeight: 800,
            opacity: 0.12,
            color: "#FFFFFF",
            letterSpacing: -8,
            fontFamily: "Georgia, serif",
            lineHeight: 1,
          }}
        >
          ΦΣΚ
        </div>

        {/* Content stack */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#C8102E",
                fontSize: 32,
                fontWeight: 700,
                fontFamily: "Georgia, serif",
              }}
            >
              ΦΣΚ
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 14,
                  letterSpacing: 6,
                  textTransform: "uppercase",
                  opacity: 0.85,
                }}
              >
                Phi Sigma Kappa
              </div>
              <div style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>
                Gamma Triton · University of South Carolina
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
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
              Fall Rush 2026 — Interest list now open
            </div>
            <div
              style={{
                fontSize: 110,
                fontWeight: 700,
                lineHeight: 1.02,
                marginTop: 24,
                letterSpacing: -3,
              }}
            >
              The chapter that built<br />
              the men of Carolina.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              fontSize: 22,
            }}
          >
            <div style={{ display: "flex", gap: 28 }}>
              <span>60+ brothers</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>3.45 GPA</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>Founded 1873</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
              phisigmakappa.vercel.app
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
