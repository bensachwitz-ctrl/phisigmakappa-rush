import { ImageResponse } from "next/og";
import { GreekstackMark } from "./icon";

// Greekstack Apple touch icon — the same "Keystone Stack" mark as app/icon.tsx,
// rendered at 180×180 on the royal-blue→sky platform gradient (replaces the old
// hardcoded Phi Sig "ΦΣΚ"). iOS applies its own rounded mask, so we let the
// gradient chip fill the full square with a soft corner radius.
export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<GreekstackMark size={180} radius={40} />, { ...size });
}
