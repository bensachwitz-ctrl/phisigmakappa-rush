import { ImageResponse } from "next/og";

// Greekstack platform favicon — the brand mark on the royal-blue→sky→gold
// gradient, shown consistently across the apex + every tenant tab (replaces the
// old hardcoded Phi Sig "ΦΣΚ" cardinal icon that leaked onto every chapter).
// Edge runtime so @vercel/og loads its bundled font reliably (node runtime
// breaks on Windows paths with spaces).
export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 36,
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
