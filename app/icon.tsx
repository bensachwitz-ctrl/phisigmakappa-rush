import { ImageResponse } from "next/og";

// Greekstack platform favicon — "The Stacked G" mark: a bold monogram G whose
// counter holds a stack of three layered bars (a gold "keystone" cap + two
// fading ink layers), so the icon reads as Greek·STACK. Royal-blue→sky gradient
// chip. Mirrors components/brand/greekstack-logo.tsx EXACTLY so the browser tab
// matches the in-app brand. Replaces the old hardcoded Phi Sig "ΦΣΚ" cardinal
// icon that leaked onto every chapter.
// Edge runtime so @vercel/og loads its bundled font reliably (the node runtime
// breaks on Windows paths with spaces).
export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<GreekstackMark size={64} radius={14} />, { ...size });
}

/**
 * Shared Satori-friendly render of the Greekstack mark. The G is a FILLED
 * annular-sector path (not a stroked-dashed circle) so it renders identically
 * in Satori and in the browser — the outer/inner arcs wind opposite ways, so the
 * default fill leaves the counter hollow. Same 40×40 geometry as the React
 * component, centered at (20,20). Used by icon / apple-icon at different sizes.
 */
export function GreekstackMark({ size, radius }: { size: number; radius: number }) {
  return (
    <div style={{ display: "flex", width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ic-body" x1="5" y1="3" x2="35" y2="37" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3B82F6" />
            <stop offset="0.5" stopColor="#2563EB" />
            <stop offset="1" stopColor="#0EA5E9" />
          </linearGradient>
          <linearGradient id="ic-ring" x1="20" y1="6" x2="20" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#E8F1FF" />
          </linearGradient>
          <linearGradient id="ic-key" x1="22" y1="14" x2="33" y2="27" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FBBF24" />
            <stop offset="1" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="40" height="40" rx={(radius / size) * 40} fill="url(#ic-body)" />
        {/* G — filled ring with a flat mouth on the right */}
        <path d="M 31.55 28.087 A 14.1 14.1 0 1 1 31.55 11.913 L 27.127 15.01 A 8.7 8.7 0 1 0 27.127 24.99 Z" fill="url(#ic-ring)" />
        {/* stacked crossbar: gold keystone layer + two fading white layers */}
        <rect x="19.4" y="16.2" width="8" height="1.9" rx="0.95" fill="url(#ic-key)" />
        <rect x="19.4" y="19.05" width="8" height="1.9" rx="0.95" fill="#FFFFFF" fillOpacity="0.92" />
        <rect x="19.4" y="21.9" width="8" height="1.9" rx="0.95" fill="#FFFFFF" fillOpacity="0.7" />
      </svg>
    </div>
  );
}
