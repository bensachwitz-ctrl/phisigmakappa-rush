import { ImageResponse } from "next/og";

// Greekstack Apple touch icon — the brand mark on the royal-blue→sky→gold
// platform gradient (matches app/icon.tsx; replaces the old hardcoded Phi Sig "ΦΣΚ").
export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2563EB 0%, #38BDF8 55%, #F59E0B 100%)",
          color: "white",
          fontFamily: "Georgia, serif",
          fontWeight: 800,
          fontSize: 104,
          letterSpacing: -2,
        }}
      >
        G
      </div>
    ),
    { ...size }
  );
}
