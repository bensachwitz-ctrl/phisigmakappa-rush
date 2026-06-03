"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GreekstackLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: number;
  light?: boolean;
}

export function GreekstackLogo({
  className,
  iconOnly = false,
  size = 36,
  light = false,
}: GreekstackLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 drop-shadow-sm transition-transform duration-300 hover:scale-105"
        aria-hidden="true"
      >
        <defs>
          {/* Linear gradient mapping from rich amber/gold to deep crimson */}
          <linearGradient id="gs-brand-grad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" /> {/* Amber 500 */}
            <stop offset="50%" stopColor="#DC2626" /> {/* Red 600 */}
            <stop offset="100%" stopColor="#991B1B" /> {/* Red 800 */}
          </linearGradient>
        </defs>

        {/* Isometric Greek column server stack */}
        {/* Top Architrave (Header block) */}
        <path
          d="M 8 8 C 8 6.8 9.2 6 11 6 L 37 6 C 38.8 6 40 6.8 40 8 L 40 10 C 40 11.2 38.8 12 37 12 L 11 12 C 9.2 12 8 11.2 8 10 Z"
          fill="url(#gs-brand-grad)"
        />

        {/* Database / Server stack layers representing classical column drums */}
        {/* Top Drum Layer */}
        <path
          d="M 12 15 L 36 15 C 37.5 15 38.5 15.8 38.5 17.2 L 38.5 20.2 C 38.5 21.6 37.5 22.4 36 22.4 L 12 22.4 C 10.5 22.4 9.5 21.6 9.5 20.2 L 9.5 17.2 C 9.5 15.8 10.5 15 12 15 Z"
          fill="url(#gs-brand-grad)"
          opacity="0.85"
        />

        {/* Middle Drum Layer */}
        <path
          d="M 12 24 L 36 24 C 37.5 24 38.5 24.8 38.5 26.2 L 38.5 29.2 C 38.5 30.6 37.5 31.4 36 31.4 L 12 31.4 C 10.5 31.4 9.5 30.6 9.5 29.2 L 9.5 26.2 C 9.5 24.8 10.5 24 12 24 Z"
          fill="url(#gs-brand-grad)"
          opacity="0.92"
        />

        {/* Bottom Drum Layer */}
        <path
          d="M 12 33 L 36 33 C 37.5 33 38.5 33.8 38.5 35.2 L 38.5 38.2 C 38.5 39.6 37.5 40.4 36 40.4 L 12 40.4 C 10.5 40.4 9.5 39.6 9.5 38.2 L 9.5 35.2 C 9.5 33.8 10.5 33 12 33 Z"
          fill="url(#gs-brand-grad)"
        />

        {/* Vertical flutes representing structural pillars / code connections */}
        <line x1="16" y1="15" x2="16" y2="40" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" opacity="0.35" />
        <line x1="24" y1="15" x2="24" y2="40" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" opacity="0.45" />
        <line x1="32" y1="15" x2="32" y2="40" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" opacity="0.35" />

        {/* Tech junctions / white circular nodes representing structured data API points */}
        <circle cx="16" cy="18.7" r="1.2" fill="#FFFFFF" />
        <circle cx="24" cy="18.7" r="1.2" fill="#FFFFFF" />
        <circle cx="32" cy="18.7" r="1.2" fill="#FFFFFF" />

        <circle cx="16" cy="27.7" r="1.2" fill="#FFFFFF" />
        <circle cx="24" cy="27.7" r="1.2" fill="#FFFFFF" />
        <circle cx="32" cy="27.7" r="1.2" fill="#FFFFFF" />

        <circle cx="16" cy="36.7" r="1.2" fill="#FFFFFF" />
        <circle cx="24" cy="36.7" r="1.2" fill="#FFFFFF" />
        <circle cx="32" cy="36.7" r="1.2" fill="#FFFFFF" />

        {/* Pedestal Base Step */}
        <path
          d="M 6 43 C 6 42.2 7.2 41.6 9 41.6 L 39 41.6 C 40.8 41.6 42 42.2 42 43 L 42 44.5 C 42 44.9 41.4 45.2 40.5 45.2 L 7.5 45.2 C 6.6 45.2 6 44.9 6 44.5 Z"
          fill="url(#gs-brand-grad)"
        />
      </svg>

      {!iconOnly && (
        <span className={cn(
          "font-display text-lg font-extrabold tracking-tight select-none",
          light ? "text-white" : "text-maroon-950"
        )}>
          Greek<span className="text-maroon-700">stack</span>
        </span>
      )}
    </div>
  );
}
