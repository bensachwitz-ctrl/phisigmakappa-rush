"use client";

import * as React from "react";
import { IconSubdomain, IconCheck, IconSpark, IconClose, IconBranding } from "@/components/brand/icons";
import { GREEK_ORGS, type GreekOrg, type OrgType } from "@/lib/greek-orgs";
import { cn } from "@/lib/utils";

/**
 * ORGANIZATION PRESET PICKER — the premium "preset library" on the identity
 * step. Lets a chapter pick ANY of the preloaded Greek organizations
 * (see GREEK_ORGS.length) and instantly auto-fill the wizard (name, short,
 * glyph, and the brand palette),
 * while leaving every field fully editable afterward. A "Custom / not listed"
 * choice clears the selection for fully manual entry.
 *
 * Owns NO wizard state — it surfaces the user's pick through `onPick` (or
 * `onCustom`) and the parent decides what to write. `selectedName` is passed
 * back in so the currently-chosen org stays visibly highlighted.
 */

const TABS: { id: OrgType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "fraternity", label: "Fraternities" },
  { id: "sorority", label: "Sororities" },
  { id: "nphc", label: "NPHC" },
];

export function OrgPresetPicker({
  selectedName,
  onPick,
  onCustom,
}: {
  selectedName: string;
  onPick: (org: GreekOrg) => void;
  onCustom: () => void;
}) {
  const [tab, setTab] = React.useState<OrgType | "all">("all");
  const [query, setQuery] = React.useState("");

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return GREEK_ORGS.filter((o) => {
      if (tab !== "all" && o.type !== tab) return false;
      if (!q) return true;
      return (
        o.name.toLowerCase().includes(q) ||
        o.short.toLowerCase().includes(q) ||
        o.glyph.toLowerCase().includes(q)
      );
    });
  }, [tab, query]);

  // Is the current selection a known preset (vs. a custom/manual identity)?
  const matchedPreset = React.useMemo(
    () => GREEK_ORGS.find((o) => o.name === selectedName),
    [selectedName]
  );

  return (
    <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-b from-blue-500/[0.07] to-white/[0.02] p-4 shadow-inner sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-400/10 text-sky-300 ring-1 ring-blue-500/20">
            <IconSpark className="h-4 w-4 text-amber-400" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white">Start from a preset</h3>
            <p className="text-xs text-slate-400">
              Pick your organization to auto-fill letters &amp; colors — edit anything after.
            </p>
          </div>
        </div>
        {matchedPreset && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/[0.12] px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
            <IconCheck className="h-3.5 w-3.5" /> {matchedPreset.short}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative mt-3.5">
        <IconSubdomain className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search organizations, letters, or nicknames…"
          aria-label="Search Greek organizations"
          className="h-10 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-9 text-sm text-white placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <IconClose className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Type tabs */}
      <div
        role="tablist"
        aria-label="Filter by organization type"
        className="mt-3 flex flex-wrap gap-1.5"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                active
                  ? "border-sky-400/50 bg-sky-500/20 text-sky-100"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-slate-200"
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Card grid (scrollable) */}
      <div className="mt-3 max-h-[19rem] overflow-y-auto pr-1 [scrollbar-width:thin]">
        {results.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-slate-400">
            No organizations match &ldquo;{query}&rdquo;. Try the{" "}
            <span className="font-semibold text-slate-200">Custom</span> option below.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {results.map((org) => {
              const active = org.name === selectedName;
              return (
                <button
                  key={org.name}
                  type="button"
                  onClick={() => onPick(org)}
                  aria-pressed={active}
                  title={`${org.name} (${org.glyph})`}
                  className={cn(
                    "group relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                    active
                      ? "border-sky-400/60 bg-sky-500/[0.12] shadow-lg shadow-blue-950/40"
                      : "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07]"
                  )}
                >
                  {active && (
                    <span className="absolute right-1.5 top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-400 text-slate-950">
                      <IconCheck className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                  {/* Glyph badge driven by the org's own palette */}
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-black tracking-tight text-white shadow-md ring-1 ring-white/15"
                    style={{ background: `linear-gradient(160deg, ${org.primary}, ${org.dark})` }}
                    aria-hidden="true"
                  >
                    {org.glyph}
                  </span>
                  <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-slate-100">
                    {org.name}
                  </span>
                  {/* Palette swatches */}
                  <span className="flex items-center gap-1" aria-hidden="true">
                    {[org.primary, org.dark, org.soft].map((c, i) => (
                      <span
                        key={i}
                        className="h-2.5 w-2.5 rounded-full ring-1 ring-white/20"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom / not listed */}
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-300 ring-1 ring-white/10">
            <IconBranding className="h-4 w-4" />
          </span>
          <p className="min-w-0 text-xs text-slate-300">
            Not listed? <span className="text-slate-400">Enter your details manually below.</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onCustom}
          className={cn(
            "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
            !matchedPreset
              ? "border-sky-400/50 bg-sky-500/15 text-sky-100"
              : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"
          )}
        >
          Custom / not listed
        </button>
      </div>
    </div>
  );
}
