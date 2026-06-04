"use client";

import * as React from "react";
import { IconCheck, IconBranding } from "@/components/brand/icons";
import { COMMON_BRAND_COLORS } from "@/lib/greek-orgs";
import { cn } from "@/lib/utils";

/**
 * COLOR PRESETS — quick-pick swatch chips on the brand step, rendered from
 * COMMON_BRAND_COLORS. Clicking a chip sets the primary color (the parent then
 * auto-suggests dark + soft via `shade()`), and the chip highlights when it
 * matches the live primary. Sits ALONGSIDE the existing color inputs, which
 * remain the source of truth for any custom hex.
 */
export function ColorPresets({
  primaryColor,
  onPick,
}: {
  primaryColor: string;
  onPick: (hex: string) => void;
}) {
  const current = primaryColor.trim().toLowerCase();

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
      <p className="mb-2.5 flex items-center gap-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
        <IconBranding className="h-3.5 w-3.5 text-sky-300" /> Quick color presets
      </p>
      <div className="flex flex-wrap gap-2">
        {COMMON_BRAND_COLORS.map((c) => {
          const active = c.hex.toLowerCase() === current;
          return (
            <button
              key={c.hex}
              type="button"
              onClick={() => onPick(c.hex)}
              aria-pressed={active}
              title={`${c.name} ${c.hex}`}
              className={cn(
                "group inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[11px] font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                active
                  ? "border-sky-400/60 bg-sky-500/15 text-sky-100 shadow-sm"
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
              )}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-white/25"
                style={{ backgroundColor: c.hex }}
                aria-hidden="true"
              >
                {active && <IconCheck className="h-3 w-3 text-white drop-shadow" strokeWidth={3} />}
              </span>
              {c.name}
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 px-0.5 text-[11px] text-slate-400">
        Picking a preset sets your primary and auto-suggests matching dark &amp; soft tints — all
        still editable above.
      </p>
    </div>
  );
}
