import { ImageResponse } from "next/og";

// Greekstack platform favicon — "The Keystone Stack" mark (pediment + gold
// keystone + stacked column tiers + Greek-key plinth) on the royal-blue→sky
// gradient. Mirrors components/brand/greekstack-logo.tsx so the browser tab
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
 * Shared Satori-friendly render of the Greekstack mark. Satori draws an inline
 * <svg> child, so we keep the SAME geometry as the React component (40×40 grid,
 * symmetric about x=20). Used by icon / apple-icon at different pixel sizes.
 */
export function GreekstackMark({ size, radius }: { size: number; radius: number }) {
  return (
    <div style={{ display: "flex", width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ic-body" x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3B82F6" />
            <stop offset="0.5" stopColor="#2563EB" />
            <stop offset="1" stopColor="#0EA5E9" />
          </linearGradient>
          <linearGradient id="ic-key" x1="13" y1="6" x2="27" y2="15" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FBBF24" />
            <stop offset="1" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="40" height="40" rx={(radius / size) * 40} fill="url(#ic-body)" />
        {/* pediment (apex dips to cradle the keystone) */}
        <path d="M9.4 16.4 L20 10.0 L30.6 16.4" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        {/* gold keystone wedge (trapezoid, wider at top) */}
        <path d="M16.5 6.0 L23.5 6.0 L21.7 11.6 L18.3 11.6 Z" fill="url(#ic-key)" />
        {/* stacked column tiers */}
        <rect x="13.6" y="18.4" width="12.8" height="3.7" rx="1.5" fill="#FFFFFF" />
        <rect x="14.9" y="23.1" width="10.2" height="3.7" rx="1.5" fill="#FFFFFF" fillOpacity="0.82" />
        <rect x="16.2" y="27.8" width="7.6" height="3.7" rx="1.5" fill="#FFFFFF" fillOpacity="0.66" />
        {/* plinth + meander notches */}
        <rect x="9.0" y="32.6" width="22" height="3.1" rx="1.4" fill="#FFFFFF" />
        <rect x="13.1" y="33.4" width="2.0" height="1.5" rx="0.4" fill="url(#ic-body)" />
        <rect x="19.0" y="32.6" width="2.0" height="1.6" rx="0.4" fill="url(#ic-body)" />
        <rect x="24.9" y="33.4" width="2.0" height="1.5" rx="0.4" fill="url(#ic-body)" />
      </svg>
    </div>
  );
}
