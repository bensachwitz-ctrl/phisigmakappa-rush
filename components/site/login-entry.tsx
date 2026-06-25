"use client";

/**
 * LoginEntry — the apex-accessible, premium SIGN-IN landing.
 * ─────────────────────────────────────────────────────────────────────────────
 * A two-step entry that routes a member INTO their chapter's existing login:
 *
 *   Step 1 — pick SCHOOL + CHAPTER (searchable, grouped by school, scales to
 *            hundreds; graceful "don't see your chapter?" → /contact).
 *   Step 2 — pick a PORTAL: Brother (members + e-board) or Alumni.
 *   Continue → the chapter's correct login URL (custom domain, or
 *              <subdomain>.<apex>/portal/<kind>/login), built defensively in
 *              lib/login-routing so it can never point at a broken URL.
 *
 * ADDITIVE + non-breaking: this is a nicer ENTRANCE in front of the unchanged
 * /portal/<brothers|alumni>/login pages and their POST routes. It writes/redirects
 * only; it never authenticates.
 *
 * On-brand with the apex marketing site: the frosted `gs-glass` surface, the
 * blue→sky platform gradient, the drifting `GreekLetterField` backdrop, the
 * `GreekstackWordmark` lockup, and the bold tracked-out subheader. Fully
 * responsive + reduced-motion-safe (the only motion is CSS that already disables
 * itself under prefers-reduced-motion, plus opacity/transform transitions).
 */

import * as React from "react";
import Link from "next/link";
import { GreekstackLogo, GreekstackWordmark } from "@/components/brand/greekstack-logo";

import { BrandGlyph } from "@/components/site/brand-glyph";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconSpark } from "@/components/brand/icons";
import {
  Search,
  ArrowRight,
  ArrowLeft,
  Check,
  Users,
  GraduationCap,
  Building2,
  ShieldCheck,
  ExternalLink,
  School as SchoolIcon,
  type LucideIcon,
} from "lucide-react";
import {
  buildChapterLoginUrl,
  chapterDestinationLabel,
  chapterMatchesQuery,
  groupChaptersBySchool,
  type ChapterRouteTarget,
  type PortalKind,
} from "@/lib/login-routing";

export interface LoginEntryProps {
  /** Active chapters from the central Tenant registry (server-fetched). */
  chapters: ChapterRouteTarget[];
}

export function LoginEntry({ chapters }: LoginEntryProps) {
  // Current host is only known in the browser; used by the routing helpers to
  // decide relative-vs-absolute and to render the destination label. Read after
  // mount so SSR is stable (no hydration mismatch).
  const [currentHost, setCurrentHost] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (typeof window !== "undefined") setCurrentHost(window.location.host);
  }, []);

  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<ChapterRouteTarget | null>(null);
  const [portal, setPortal] = React.useState<PortalKind | null>(null);

  // If exactly one chapter exists, preselect it so the common single-tenant
  // deploy is one tap to a portal (still fully overridable via "Change").
  React.useEffect(() => {
    if (chapters.length === 1 && !selected) setSelected(chapters[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters.length]);

  const filtered = React.useMemo(
    () => chapters.filter((c) => chapterMatchesQuery(c, query)),
    [chapters, query],
  );
  const groups = React.useMemo(
    () => groupChaptersBySchool(filtered),
    [filtered],
  );

  const continueHref =
    selected && portal
      ? buildChapterLoginUrl(selected, portal, currentHost)
      : "";

  return (
    <div className="relative min-h-screen overflow-x-hidden text-foreground">
      <div aria-hidden="true" className="fixed inset-0 z-[-10] bg-background" />
      {/* Drifting Greek letters rendered globally by app/layout.tsx. */}
      <AmbientOrbs />

      {/* Top brand bar — the canonical Greekstack lockup links home to the apex. */}
      <header className="relative z-20 w-full">
        <div className="container flex h-16 items-center justify-between">
          <Link
            href="/"
            className="group inline-flex shrink-0 items-center"
            aria-label="Greekstack home"
          >
            <GreekstackWordmark
              size="md"
              markClassName="h-8 w-8 transition-transform duration-300 ease-gs-spring group-hover:rotate-[-6deg] group-hover:scale-105"
            />
          </Link>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link href="/">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Back to site
            </Link>
          </Button>
        </div>
      </header>

      <main
        id="main-content"
        className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-20 pt-8 sm:pt-12"
      >
        {/* ── Heading — premium classical lockup ─────────────────────── */}
        <div className="text-center">
          {/* The elevated TEMPLE seal (navy), centered, with a soft brand halo —
              the classical brand anchor for the sign-in. Gentle entrance, reduced-
              motion-safe (animate-scale-in self-disables under reduce). */}
          <div className="relative mx-auto mb-5 inline-flex">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 rounded-[28px] bg-gradient-to-br from-blue-500/25 to-amber-400/20 blur-xl"
            />
            <GreekstackLogo
              variant="seal"
              title="Greekstack"
              className="h-16 w-16 rounded-2xl shadow-[0_12px_30px_-12px_rgba(11,27,58,0.6)] ring-1 ring-white/10 motion-safe:animate-scale-in"
            />
          </div>
          {/* "Greekstack" wordmark directly UNDER the seal — the centered lockup
              the owner's PHASE-3 screen specifies (Cinzel caps, gold STACK). */}
          <p className="mb-3 font-display text-xl font-bold uppercase leading-none tracking-[0.16em]">
            <span className="text-foreground">Greek</span>
            <span className="gs-gold-text">stack</span>
          </p>
          {/* Greek-key (meander) divider — the instantly-recognizable Greek-life
              motif (backed by .gs-greek-key in globals.css; static, decorative). */}
          <span
            aria-hidden="true"
            className="pointer-events-none gs-greek-key mx-auto mb-4 w-24"
          />
          {/* Cinzel eyebrow — inscriptional Roman caps set the classical voice. */}
          <p className="flex flex-wrap items-center justify-center gap-x-[0.4em] font-display text-[11px] font-semibold uppercase leading-none tracking-[0.28em] text-slate-900 sm:text-xs">
            <span>Sign in to your</span>
            <span className="gs-gold-text">chapter</span>
          </p>
          {/* H1 inherits the Cinzel display face site-wide; caps + tracking make
              the classical "WELCOME BACK" inscription. */}
          <h1 className="mt-4 text-balance text-3xl font-bold uppercase leading-[1.1] tracking-[0.06em] sm:text-4xl">
            Welcome back
          </h1>
          {/* Cormorant serif subhead — the elegant classical accent voice. */}
          <p className="mx-auto mt-3 max-w-md text-pretty font-serif text-base italic leading-relaxed text-muted-foreground sm:text-lg">
            Find your chapter, then choose your portal. We&apos;ll take you to the
            right sign-in.
          </p>
        </div>

        {/* ── Stepper ───────────────────────────────────────────────── */}
        <Stepper current={selected ? (portal ? 3 : 2) : 1} className="mt-8" />

        {/* ── Card ──────────────────────────────────────────────────── */}
        <div className="gs-glass mt-6 rounded-3xl p-5 sm:p-7">
          {/* STEP 1 — school + chapter */}
          <section aria-labelledby="step1-h">
            <StepHeading
              index={1}
              id="step1-h"
              title="Select your school & chapter"
              done={!!selected}
            />

            {selected ? (
              <SelectedChapterRow
                chapter={selected}
                currentHost={currentHost}
                onChange={() => {
                  setSelected(null);
                  setPortal(null);
                  setQuery("");
                }}
              />
            ) : (
              <ChapterPicker
                groups={groups}
                query={query}
                onQuery={setQuery}
                onPick={(c) => {
                  setSelected(c);
                }}
                totalCount={chapters.length}
                filteredCount={filtered.length}
              />
            )}
          </section>

          {/* STEP 2 — portal (revealed once a chapter is chosen) */}
          <div
            className={cn(
              "grid transition-all duration-500 ease-gs-spring motion-reduce:transition-none",
              selected
                ? "mt-7 grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <div className="border-t border-border/60 pt-7">
                <section aria-labelledby="step2-h">
                  <StepHeading
                    index={2}
                    id="step2-h"
                    title="Choose your portal"
                    done={!!portal}
                  />
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <PortalCard
                      kind="brothers"
                      active={portal === "brothers"}
                      onSelect={() => setPortal("brothers")}
                      icon={Users}
                      img="gl-brotherhood"
                      title="Brother portal"
                      line="Active members and e-board. Dues, events, voting, and chapter tools."
                    />
                    <PortalCard
                      kind="alumni"
                      active={portal === "alumni"}
                      onSelect={() => setPortal("alumni")}
                      icon={GraduationCap}
                      img="gl-letters"
                      title="Alumni portal"
                      line="Graduated members. Stay connected, give back, and mentor actives."
                    />
                  </div>
                  <p className="mt-3 inline-flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    <ShieldCheck
                      className="mt-px h-3.5 w-3.5 shrink-0 text-blue-600"
                      aria-hidden="true"
                    />
                    <span>
                      E-board officers are brothers - use the Brother portal. Full
                      admin access lives behind it.
                    </span>
                  </p>
                </section>
              </div>
            </div>
          </div>

          {/* CONTINUE — an anchor (real navigation to the chapter login) once a
              chapter + portal are chosen; otherwise a disabled button that names
              the next required choice. We never pass `disabled` to the anchor. */}
          <div className="mt-7">
            {continueHref ? (
              <Button asChild variant="platform" size="xl" className="gs-sheen w-full font-display uppercase tracking-[0.12em]">
                <a href={continueHref} className="group/btn">
                  Enter
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                variant="platform"
                size="xl"
                disabled
                className="w-full font-display uppercase tracking-[0.1em]"
              >
                {selected ? "Choose a portal to continue" : "Select your chapter to continue"}
              </Button>
            )}
            {continueHref && selected && portal ? (
              <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
                Taking you to{" "}
                <span className="font-medium text-foreground/80">
                  {portal === "brothers" ? "the Brother portal" : "the Alumni portal"}
                </span>{" "}
                for{" "}
                <span className="font-medium text-foreground/80">
                  {selected.name || selected.subdomain}
                </span>
                .
              </p>
            ) : null}
          </div>
        </div>

        {/* ── Footer affordances ───────────────────────────────────── */}
        <div className="mt-7 flex flex-col items-center gap-4 text-center">
          <NewChapterCta />
          <p className="text-xs text-muted-foreground">
            Trouble signing in?{" "}
            <Link
              href="/contact"
              className="font-medium text-blue-700 underline-offset-2 hover:underline"
            >
              Contact us
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

/* ───────────────────────────── Sub-components ───────────────────────────── */

/** The numbered progress rail (1 → 2 → done) above the card. */
function Stepper({ current, className }: { current: 1 | 2 | 3; className?: string }) {
  const steps = [
    { n: 1, label: "Chapter" },
    { n: 2, label: "Portal" },
  ];
  return (
    <ol
      className={cn("flex items-center justify-center gap-2 sm:gap-3", className)}
      aria-label="Progress"
    >
      {steps.map((s, i) => {
        const reached = current >= s.n;
        const complete = current > s.n;
        return (
          <li key={s.n} className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-300",
                  reached
                    ? "bg-gradient-to-b from-[#3b82f6] to-[#0ea5e9] text-white shadow-[0_4px_12px_-4px_rgba(37,99,235,0.6)]"
                    : "bg-muted text-muted-foreground",
                )}
                aria-current={current === s.n ? "step" : undefined}
              >
                {complete ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : s.n}
              </span>
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-300 sm:text-xs",
                  reached ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </span>
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px w-6 rounded-full transition-colors duration-300 sm:w-10",
                  current > s.n ? "bg-blue-500/70" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** "① Step title" header with a done check. */
function StepHeading({
  index,
  title,
  done,
  id,
}: {
  index: number;
  title: string;
  done?: boolean;
  id?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
          done
            ? "bg-emerald-500/15 text-emerald-700"
            : "bg-blue-600/10 text-blue-700",
        )}
        aria-hidden="true"
      >
        {done ? <Check className="h-4 w-4" /> : index}
      </span>
      <h2 id={id} className="text-base font-bold tracking-tight sm:text-lg">
        {title}
      </h2>
    </div>
  );
}

/** The searchable chapter picker (Step 1, unselected state). */
function ChapterPicker({
  groups,
  query,
  onQuery,
  onPick,
  totalCount,
  filteredCount,
}: {
  groups: ReturnType<typeof groupChaptersBySchool>;
  query: string;
  onQuery: (v: string) => void;
  onPick: (c: ChapterRouteTarget) => void;
  totalCount: number;
  filteredCount: number;
}) {
  return (
    <div className="mt-4">
      {/* Search box */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="text"
          inputMode="search"
          autoComplete="off"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={
            totalCount > 1
              ? "Search by school or chapter name…"
              : "Search chapters…"
          }
          aria-label="Search for your school or chapter"
          className="w-full rounded-xl border border-border bg-background/80 py-2.5 pl-10 pr-4 text-sm text-foreground shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      {/* Results */}
      <div className="mt-3 max-h-[19rem] overflow-y-auto rounded-xl">
        {totalCount === 0 ? (
          <EmptyState variant="no-chapters" />
        ) : filteredCount === 0 ? (
          <EmptyState variant="no-match" query={query} />
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.school}>
                <div className="mb-1.5 flex items-center gap-1.5 px-1">
                  <SchoolIcon
                    className="h-3.5 w-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {group.school}
                  </h3>
                </div>
                <ul className="space-y-1.5">
                  {group.chapters.map((c) => (
                    <li key={c.subdomain}>
                      <button
                        type="button"
                        onClick={() => onPick(c)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-border bg-background/70 px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-px hover:border-blue-500/50 hover:bg-background hover:shadow-[0_10px_24px_-14px_rgba(37,99,235,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 active:scale-[0.99]"
                      >
                        <span
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600/10 to-sky-500/10 text-blue-700 ring-1 ring-inset ring-blue-600/15"
                          aria-hidden="true"
                        >
                          <Building2 className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {c.name || c.subdomain}
                          </span>
                          {c.school ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {c.school}
                            </span>
                          ) : null}
                        </span>
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-blue-600"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Selected-chapter confirmation row with a Change action (Step 1, done state). */
function SelectedChapterRow({
  chapter,
  currentHost,
  onChange,
}: {
  chapter: ChapterRouteTarget;
  currentHost: string | null;
  onChange: () => void;
}) {
  const dest = chapterDestinationLabel(chapter, currentHost);
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-50/60 px-3.5 py-3">
      <span
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#0ea5e9] text-white shadow-[0_6px_16px_-6px_rgba(37,99,235,0.6)]"
        aria-hidden="true"
      >
        <Building2 className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">
          {chapter.name || chapter.subdomain}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {chapter.school ? `${chapter.school} · ` : ""}
          {dest}
        </p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
      >
        Change
      </button>
    </div>
  );
}

/** A selectable portal card (Step 2). Now showcases a bespoke glassy Greek-life
 *  icon tile (the same frosted blue→gold app-icons used across the marketing
 *  site) as its visual anchor, with a soft brand glow behind it that warms on
 *  select — so the sign-in page reads as on-brand and premium, not generic. The
 *  lucide `icon` is kept as a graceful fallback if no `img` is supplied. */
function PortalCard({
  active,
  onSelect,
  icon: Icon,
  img,
  title,
  line,
}: {
  kind: PortalKind;
  active: boolean;
  onSelect: () => void;
  icon: LucideIcon;
  /** <BrandGlyph> concept key for the bespoke glassy tile, e.g. "gl-brotherhood". */
  img?: string;
  title: string;
  line: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "group relative flex flex-col items-start gap-2.5 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 active:scale-[0.99]",
        active
          ? "border-blue-500/70 bg-blue-50/70 shadow-[0_12px_30px_-16px_rgba(37,99,235,0.6)]"
          : "border-border bg-background/70 hover:-translate-y-px hover:border-blue-500/40 hover:shadow-[0_10px_24px_-16px_rgba(37,99,235,0.45)]",
      )}
    >
      {/* Soft corner bloom — shared marketing-card language, brightens on select. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-blue-500/15 to-cyan-400/10 transition-opacity duration-300",
          active ? "opacity-100" : "opacity-50 group-hover:opacity-100",
        )}
      />
      {/* Selected check */}
      <span
        className={cn(
          "absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full transition-all duration-200",
          active
            ? "scale-100 bg-gradient-to-b from-[#3b82f6] to-[#0ea5e9] text-white opacity-100"
            : "scale-75 opacity-0",
        )}
        aria-hidden="true"
      >
        <Check className="h-3 w-3" />
      </span>
      {/* Bespoke brand glyph tile (falls back to the lucide chip if no glyph). */}
      {img ? (
        <span className="relative">
          {/* warm brand glow behind the tile */}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-blue-500/25 to-amber-400/20 blur-md transition-opacity duration-300",
              active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          />
          <BrandGlyph
            name={img}
            size="md"
            className="relative transition-transform duration-300 ease-gs-spring group-hover:scale-110 group-hover:-rotate-6"
          />
        </span>
      ) : (
        <span
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200",
            active
              ? "bg-gradient-to-br from-[#3b82f6] to-[#0ea5e9] text-white shadow-[0_6px_16px_-6px_rgba(37,99,235,0.6)]"
              : "bg-blue-600/10 text-blue-700 group-hover:bg-blue-600/15",
          )}
        >
          <Icon className="h-5 w-5" aria-hidden={true} />
        </span>
      )}
      <span className="relative text-sm font-bold tracking-tight text-foreground">
        {title}
      </span>
      <span className="relative text-xs leading-relaxed text-muted-foreground">{line}</span>
    </button>
  );
}

/** Empty states — no chapters provisioned, or no search match. Both route to /contact. */
function EmptyState({
  variant,
  query,
}: {
  variant: "no-chapters" | "no-match";
  query?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background/50 px-5 py-8 text-center">
      <span
        className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-600/10 text-blue-700"
        aria-hidden="true"
      >
        <IconSpark className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-foreground">
        {variant === "no-match"
          ? "Don’t see your chapter?"
          : "No chapters here yet"}
      </p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
        {variant === "no-match" ? (
          <>
            We couldn&apos;t find a chapter matching
            {query ? <span className="font-medium"> “{query.trim()}”</span> : " that"}.
            It might be coming soon - let&apos;s talk.
          </>
        ) : (
          <>Your chapter might be on the way. Tell us who you are and we&apos;ll get you set up.</>
        )}
      </p>
      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link href="/contact">
          Talk to us
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

/** Bottom CTA inviting a brand-new chapter to launch their own site. */
function NewChapterCta() {
  return (
    <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-border bg-background/60 px-5 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
      <div className="flex items-center gap-3">
        {/* Bespoke "trophy" brand glyph — a premium, on-brand anchor for the
            "launch your own chapter" invite (replaces the generic sparkle). */}
        <BrandGlyph name="trophy" size="md" className="shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            New chapter? Launch your own site.
          </p>
          <p className="text-xs text-muted-foreground">
            Your branded chapter platform, live the same day - free to start.
          </p>
        </div>
      </div>
      <Button asChild variant="ghost" size="sm" className="shrink-0 text-blue-700">
        <Link href="/onboard">
          Get started
          <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

/** Soft, decorative color orbs behind the card — reduced-motion-safe (static). */
function AmbientOrbs() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[-8] overflow-hidden"
    >
      <div className="absolute -left-24 top-[-10%] h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="absolute right-[-10%] top-1/3 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="absolute bottom-[-10%] left-1/3 h-72 w-72 rounded-full bg-blue-800/15 blur-3xl" />
    </div>
  );
}

export default LoginEntry;
