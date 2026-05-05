import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * Maskable PWA icon — 512×512 with extra padding around the glyph so Android's
 * adaptive-icon launchers can clip into circles, squares, squircles, or
 * teardrops without cutting off the chapter mark. The "safe zone" per
 * https://web.dev/maskable-icon/ is the central 80% (≈ 410px circle),
 * so the ΦΣΚ glyph is sized to comfortably fit within that radius.
 */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #C8102E 0%, #A20D26 100%)",
          color: "white",
          fontFamily: "Georgia, serif",
          fontWeight: 700,
          fontSize: 180,
          letterSpacing: -4,
        }}
      >
        ΦΣΚ
      </div>
    ),
    { width: 512, height: 512 }
  );
}
