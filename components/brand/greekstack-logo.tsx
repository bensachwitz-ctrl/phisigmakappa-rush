import * as React from "react";

export function GreekstackLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-8 w-8"}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="50%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#7F1D1D" />
        </linearGradient>
      </defs>
      {/* Top Pillar Ring */}
      <path
        d="M6 10 C6 7.8 10.5 6 16 6 C21.5 6 26 7.8 26 10 C26 12.2 21.5 14 16 14 C10.5 14 6 12.2 6 10 Z"
        fill="url(#logo-grad)"
      />
      {/* Middle Pillar Ring */}
      <path
        d="M6 17 C6 15.3 10.5 14 16 14 C21.5 14 26 15.3 26 17 L26 19 C26 20.7 21.5 22 16 22 C10.5 22 6 20.7 6 19 Z"
        fill="url(#logo-grad)"
        opacity="0.85"
      />
      {/* Base Pillar Ring */}
      <path
        d="M6 24 C6 22.3 10.5 21 16 21 C21.5 21 26 22.3 26 24 L26 25 C26 26.7 21.5 28 16 28 C10.5 28 6 26.7 6 25 Z"
        fill="url(#logo-grad)"
        opacity="0.7"
      />
      {/* Vertical flutes on columns */}
      <path
        d="M10 10 L10 24 M16 14 L16 28 M22 10 L22 24"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
