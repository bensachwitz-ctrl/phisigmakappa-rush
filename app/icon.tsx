import { ImageResponse } from "next/og";

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
          background: "linear-gradient(135deg, #C8102E 0%, #A20D26 100%)",
          color: "white",
          fontFamily: "Georgia, serif",
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: -1,
          borderRadius: 12,
        }}
      >
        ΦΣΚ
      </div>
    ),
    { ...size }
  );
}
