import { ImageResponse } from "next/og";

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
          background: "linear-gradient(135deg, #C8102E 0%, #A20D26 100%)",
          color: "white",
          fontFamily: "Georgia, serif",
          fontWeight: 700,
          fontSize: 78,
          letterSpacing: -2,
        }}
      >
        ΦΣΚ
      </div>
    ),
    { ...size }
  );
}
