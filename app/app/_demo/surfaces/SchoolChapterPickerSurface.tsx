import React from "react";
import {
  IconArrowLeft,
  IconChevronRight,
  IconGraduation,
  IconSearch,
} from "@/components/brand/icons";
import { GreekstackWordmark } from "@/components/brand/greekstack-logo";
import { searchSchools } from "@/lib/schools";
import {
  groupPickerBySchool,
  pickerChapterMatches,
  brandSecondary,
  type PickerChapter,
} from "@/lib/app-picker";
import type { DemoContext } from "../context";

/**
 * SchoolChapterPickerSurface — the iOS /app COLD-START entry (the very first
 * screen the Capacitor shell at greekstack.vercel.app/app lands on when there's
 * no saved session and no ?demo).
 *
 * A two-step, mobile-first, School → Chapter picker built from the REAL central
 * Tenant registry (merged with the inert demo chapters so it's never empty):
 *
 *   Step "school"  — search + tap a SCHOOL that actually has ≥1 active chapter.
 *                    Typeahead falls back to lib/schools.ts so a member can find
 *                    their campus even mid-type; only schools WITH chapters are
 *                    tappable (others show a soft "coming soon" affordance).
 *   Step "chapter" — that school's chapters, each with its letters chip + a
 *                    Demo/Live badge. Tapping advances to the per-chapter login
 *                    (real → /api/mobile/auth) or the instant demo (mock).
 *
 * GS brand: royal-blue → gold on a deep slate shell; 44pt targets; search input
 * inputMode="search"; reduced-motion-safe (CSS transitions self-disable); native
 * selection haptic via window.GreekStackNative (inert on web). No raw hardcoded
 * brand hex outside the GS tokens + the per-chapter brand colors pulled from the
 * resolved brand. No Stripe anywhere.
 */

const GS_BLUE = "#1D4ED8";
const GS_BLUE_DEEP = "#0B2A6B";
const GS_GOLD = "#D4AF37";

export function renderSchoolChapterPicker(ctx: DemoContext) {
  const {
    pickerChapters,
    pickerStep,
    setPickerStep,
    pickerSchool,
    setPickerSchool,
    pickerQuery,
    setPickerQuery,
    hasRealChapters,
    handlePickPickerChapter,
    enterDemoShowcase,
  } = ctx;

  // Surfaces are PLAIN functions of `ctx` (no hooks of their own — see
  // context.ts). The computations below are cheap array filters over a small
  // registry, so they run inline each render with no memoization needed.

  // Schools that actually have ≥1 chapter (real or demo), grouped + sorted.
  const groups = groupPickerBySchool(pickerChapters);

  // School-step: filter the school groups by the query; if nothing matches a
  // school WITH chapters, surface typeahead suggestions from the full catalog so
  // the member still sees their campus (tappable only when it has chapters).
  const schoolQuery = pickerStep === "school" ? pickerQuery : "";
  const q = schoolQuery.trim().toLowerCase();
  const matchedGroups = !q
    ? groups
    : groups.filter(
        (g) =>
          g.school.toLowerCase().includes(q) ||
          g.chapters.some((c) => pickerChapterMatches(c, q)),
      );

  // Catalog typeahead (schools that DON'T yet have chapters) — only when the
  // member's query matches nothing in the live set, so we never bury real picks.
  const haveSchools = new Set(groups.map((g) => g.school.toLowerCase()));
  const catalogSuggestions =
    !schoolQuery.trim() || matchedGroups.length > 0
      ? []
      : searchSchools(schoolQuery.trim(), 4).filter(
          (s) => !haveSchools.has(s.name.toLowerCase()),
        );

  // Chapter-step: the chosen school's chapters.
  const schoolChapters = pickerSchool
    ? groups.find((x) => x.school === pickerSchool)?.chapters ?? []
    : [];

  const fireHaptic = () => {
    try {
      window.GreekStackNative?.hapticSelection?.();
    } catch {
      /* web has no haptics */
    }
  };

  const onPickSchool = (school: string) => {
    fireHaptic();
    setPickerSchool(school);
    setPickerQuery("");
    setPickerStep("chapter");
  };

  const onBackToSchools = () => {
    fireHaptic();
    setPickerSchool(null);
    setPickerStep("school");
    setPickerQuery("");
  };

  return (
    <div
      className="gs-app-picker relative flex flex-1 flex-col overflow-hidden text-left"
      style={{
        background: `radial-gradient(120% 80% at 80% -10%, ${GS_BLUE}26, transparent 55%), linear-gradient(165deg, ${GS_BLUE_DEEP} 0%, #0b1220 58%, #070b14 100%)`,
      }}
    >
      {/* Soft brand orbs (static — reduced-motion-safe) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-10 h-56 w-56 rounded-full blur-3xl"
        style={{ backgroundColor: `${GS_BLUE}24` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 top-1/3 h-48 w-48 rounded-full blur-3xl"
        style={{ backgroundColor: `${GS_GOLD}1a` }}
      />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="relative shrink-0 px-6 pb-4 pt-7">
        <div className="flex items-center justify-between">
          {/* GS wordmark on the dark shell: override the --foreground token to
              white so the "Greek" half reads light ("stack" keeps its gradient
              via gs-gradient-text). */}
          <span style={{ ["--foreground" as string]: "0 0% 100%" }}>
            <GreekstackWordmark size="sm" />
          </span>
          {pickerStep === "chapter" && (
            <button
              type="button"
              onClick={onBackToSchools}
              aria-label="Back to schools"
              className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-white/10 px-3 text-xs font-semibold text-white/90 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 motion-reduce:transition-none"
            >
              <IconArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Schools
            </button>
          )}
        </div>

        <p
          className="mt-5 text-[11px] font-extrabold uppercase leading-none tracking-[0.22em]"
          style={{ color: GS_GOLD }}
        >
          {pickerStep === "school" ? "Find your chapter" : pickerSchool}
        </p>
        <h1 className="mt-2 text-balance text-[26px] font-bold leading-[1.1] tracking-tight text-white">
          {pickerStep === "school" ? "Welcome back." : "Pick your chapter"}
        </h1>
        <p className="mt-1.5 max-w-[18rem] text-pretty text-[13px] leading-relaxed text-slate-300">
          {pickerStep === "school"
            ? "Choose your school, then your chapter. We'll take you to the right sign-in."
            : "Tap your chapter to sign in to its branded app."}
        </p>
      </div>

      {/* ── Search (school step only) ────────────────────────────────────── */}
      {pickerStep === "school" && (
        <div className="relative shrink-0 px-6 pb-3">
          <IconSearch
            className="pointer-events-none absolute left-9 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            inputMode="search"
            autoComplete="off"
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            placeholder="Search your school…"
            aria-label="Search for your school"
            className="min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.06] py-3 pl-10 pr-4 text-sm text-white shadow-inner outline-none transition placeholder:text-slate-400 focus:border-white/30 focus:ring-2 focus:ring-white/20 motion-reduce:transition-none"
          />
        </div>
      )}

      {/* ── List ─────────────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        {pickerStep === "school" ? (
          <SchoolList
            groups={matchedGroups}
            catalogSuggestions={catalogSuggestions}
            onPick={onPickSchool}
            query={schoolQuery}
            hasRealChapters={hasRealChapters}
          />
        ) : (
          <ChapterList
            chapters={schoolChapters}
            onPick={(c) => {
              fireHaptic();
              handlePickPickerChapter(c);
            }}
          />
        )}
      </div>

      {/* ── Footer: explore the demo ─────────────────────────────────────── */}
      <div className="relative shrink-0 border-t border-white/10 px-6 py-4 text-center">
        <button
          type="button"
          onClick={enterDemoShowcase}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-slate-200 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 motion-reduce:transition-none"
        >
          Just exploring? See a live demo
          <IconChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────── School step ────────────────────────────── */

function SchoolList({
  groups,
  catalogSuggestions,
  onPick,
  query,
  hasRealChapters,
}: {
  groups: Array<{ school: string; chapters: PickerChapter[] }>;
  catalogSuggestions: ReturnType<typeof searchSchools>;
  onPick: (school: string) => void;
  query: string;
  hasRealChapters?: boolean;
}) {
  if (groups.length === 0 && catalogSuggestions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-5 py-10 text-center">
        <span
          className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white"
          style={{ background: `linear-gradient(140deg, ${GS_BLUE}, ${GS_GOLD})` }}
          aria-hidden="true"
        >
          <IconGraduation className="h-6 w-6" />
        </span>
        <p className="text-sm font-semibold text-white">
          {query ? "No chapters there yet" : "No chapters yet"}
        </p>
        <p className="mx-auto mt-1 max-w-[16rem] text-xs leading-relaxed text-slate-400">
          {query
            ? `We couldn't find a chapter at "${query.trim()}". It might be coming soon.`
            : "Chapters appear here as they launch."}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5" aria-label="Schools with chapters">
      {groups.map((g) => (
        <li key={g.school}>
          <button
            type="button"
            onClick={() => onPick(g.school)}
            className="group flex min-h-[60px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-px hover:border-white/25 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ background: `linear-gradient(140deg, ${GS_BLUE}, ${GS_BLUE_DEEP})` }}
              aria-hidden="true"
            >
              <IconGraduation className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-white">{g.school}</span>
              <span className="block truncate text-[12px] text-slate-400">
                {g.chapters.length} chapter{g.chapters.length === 1 ? "" : "s"}
              </span>
            </span>
            <IconChevronRight
              className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white motion-reduce:transition-none"
              aria-hidden="true"
            />
          </button>
        </li>
      ))}

      {/* Catalog typeahead — campuses without chapters yet (not tappable). */}
      {catalogSuggestions.length > 0 && (
        <li className="pt-2">
          <p className="px-1 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Not on Greekstack yet
          </p>
          <ul className="space-y-2">
            {catalogSuggestions.map((s) => (
              <li
                key={s.name}
                className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5"
              >
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-300"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                  aria-hidden="true"
                >
                  <IconGraduation className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-slate-300">
                    {s.name}
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">Coming soon</span>
                </span>
              </li>
            ))}
          </ul>
        </li>
      )}
    </ul>
  );
}

/* ────────────────────────────── Chapter step ───────────────────────────── */

function ChapterList({
  chapters,
  onPick,
}: {
  chapters: PickerChapter[];
  onPick: (c: PickerChapter) => void;
}) {
  if (chapters.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-5 py-10 text-center text-sm text-slate-300">
        No chapters at this school yet.
      </div>
    );
  }
  return (
    <ul className="space-y-2.5" aria-label="Chapters">
      {chapters.map((c) => {
        const sec = brandSecondary(c.brand);
        const isDemo = c.source === "demo";
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onPick(c)}
              className="group flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-px hover:border-white/25 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-[15px] font-extrabold text-white shadow-sm"
                style={{
                  background: c.brand.crestUrl
                    ? "transparent"
                    : `linear-gradient(140deg, ${c.brand.primaryColor}, ${sec})`,
                }}
                aria-hidden="true"
              >
                {c.brand.crestUrl ? (
                  <img src={c.brand.crestUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  c.brand.letters
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold text-white">
                    {(c.name || c.subdomain).replace(/\s*\[Demo\]\s*$/i, "")}
                  </span>
                  <span
                    className={
                      isDemo
                        ? "rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-300 ring-1 ring-amber-400/30"
                        : "rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30"
                    }
                    style={{ backgroundColor: isDemo ? "rgba(212,175,55,0.12)" : "rgba(16,185,129,0.12)" }}
                  >
                    {isDemo ? "Demo" : "Live"}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-slate-400">
                  {c.brand.letters} · {c.school || "Greekstack chapter"}
                </span>
              </span>
              <IconChevronRight
                className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white motion-reduce:transition-none"
                aria-hidden="true"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
