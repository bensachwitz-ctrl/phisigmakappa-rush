"use client";

/**
 * LoginEntry — the apex-accessible, premium SIGN-IN landing.
 * ─────────────────────────────────────────────────────────────────────────────
 * A SIMPLE, logo-anchored entry that routes a member INTO their chapter's login
 * with one decision at a time:
 *
 *   Step 1 — pick your SCHOOL   (searchable; auto-selected if only one exists).
 *   Step 2 — pick your CHAPTER  (the chapters at that school; auto-selected if
 *            the school has exactly one).
 *   Step 3 — pick your PORTAL   (Brother / Alumni).
 *   Enter  → the chapter's correct login URL (custom domain, or
 *            <subdomain>.<apex>/portal/<kind>), built defensively in
 *            lib/login-routing so it can never point at a broken URL.
 *
 * The school-first split (vs. one long combined list) is what the owner asked
 * for: "simple with the logo and choose school and chapter then." Progressive
 * disclosure keeps a first-time member from facing a wall of options, and any
 * singleton step auto-advances so a single-chapter deploy is nearly one tap.
 *
 * ADDITIVE + non-breaking: this is a nicer ENTRANCE in front of the unchanged
 * /portal/<brothers|alumni> login pages and their POST routes. It writes/redirects
 * only; it never authenticates.
 */

import * as React from "react";
import Link from "next/link";
import { GreekstackLogo, GreekstackWordmark } from "@/components/brand/greekstack-logo";

import { BrandGlyph } from "@/components/site/brand-glyph";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Search,
  ArrowRight,
  ArrowLeft,
  Check,
  Users,
  GraduationCap,
  ShieldCheck,
  ExternalLink,
  School as SchoolIcon,
  type LucideIcon,
} from "lucide-react";
import {
  buildChapterLoginUrl,
  chapterDestinationLabel,
  chapterMatchesQuery,
  chaptersForSchool,
  distinctSchools,
  schoolMatchesQuery,
  type ChapterRouteTarget,
  type PortalKind,
  type SchoolOption,
} from "@/lib/login-routing";
import { marketingSiteUrl, marketingSiteLabel } from "@/lib/sales-contact";

/**
 * A short, classical MONOGRAM (1-2 letters) for the medallion avatar, derived
 * from a chapter or school name (e.g. "Greekstack University" → "GU", "Phi
 * Sigma Kappa" → "PS"). Falls back to the first alpha char, then "GS". Pure.
 */
function monogramFor(name: string | null | undefined): string {
  const words = (name || "")
    .replace(/\[[^\]]*\]/g, " ") // drop "[Demo]" etc.
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w));
  if (words.length === 0) return "GS";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

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

  const schools = React.useMemo(() => distinctSchools(chapters), [chapters]);

  const [schoolQuery, setSchoolQuery] = React.useState("");
  const [chapterQuery, setChapterQuery] = React.useState("");
  const [school, setSchool] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<ChapterRouteTarget | null>(null);
  const [portal, setPortal] = React.useState<PortalKind | null>(null);

  // If there is exactly one school, preselect it so members start at "choose your
  // chapter" (still overridable via "Change" once >1 school exists).
  React.useEffect(() => {
    if (schools.length === 1 && !school) setSchool(schools[0].school);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schools.length]);

  // The chapters at the chosen school; auto-select when the school has exactly one.
  const chaptersAtSchool = React.useMemo(
    () => (school ? chaptersForSchool(chapters, school) : []),
    [chapters, school],
  );
  React.useEffect(() => {
    if (school && chaptersAtSchool.length === 1 && !selected) {
      setSelected(chaptersAtSchool[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school, chaptersAtSchool.length]);

  const filteredSchools = React.useMemo(
    () => schools.filter((s) => schoolMatchesQuery(s.school, schoolQuery)),
    [schools, schoolQuery],
  );
  const filteredChapters = React.useMemo(
    () => chaptersAtSchool.filter((c) => chapterMatchesQuery(c, chapterQuery)),
    [chaptersAtSchool, chapterQuery],
  );

  const continueHref =
    selected && portal ? buildChapterLoginUrl(selected, portal, currentHost) : "";

  // Which numbered step is the member on (drives the rail + card reveal).
  const stepNow: 1 | 2 | 3 = !school ? 1 : !selected ? 2 : 3;

  const resetToSchool = () => {
    setSchool(null);
    setSelected(null);
    setPortal(null);
    setChapterQuery("");
  };
  const resetToChapter = () => {
    setSelected(null);
    setPortal(null);
    setChapterQuery("");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden text-foreground">
      <div aria-hidden="true" className="fixed inset-0 z-[-10] bg-background" />
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

      <div className="relative z-10 mx-auto w-full max-w-xl px-4 pb-20 pt-8 sm:pt-12">
        {/* ── The logo — the classical navy seal + centered wordmark ──── */}
        <div className="text-center">
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
          <p className="mb-3 font-display text-xl font-bold uppercase leading-none tracking-[0.16em]">
            <span className="text-foreground">Greek</span>
            <span className="gs-gold-text">stack</span>
          </p>
          <span
            aria-hidden="true"
            className="pointer-events-none gs-greek-key mx-auto mb-4 w-24"
          />
          <h1 className="mt-1 text-balance text-3xl font-bold uppercase leading-[1.1] tracking-[0.06em] sm:text-4xl">
            Welcome back
          </h1>
          <p className="mx-auto mt-3 max-w-md text-pretty font-serif text-base italic leading-relaxed text-muted-foreground sm:text-lg">
            Choose your school and chapter, and we&apos;ll take you to the right
            sign-in.
          </p>
        </div>

        {/* ── Stepper (School → Chapter → Portal) ───────────────────── */}
        <Stepper current={stepNow} className="mt-8" />

        {/* ── Card ──────────────────────────────────────────────────── */}
        <div className="gs-glass mt-6 rounded-3xl p-5 sm:p-7">
          {/* STEP 1 — SCHOOL */}
          <section aria-labelledby="step1-h">
            <StepHeading index={1} id="step1-h" title="Choose your school" done={!!school} />

            {school ? (
              <SelectedRow
                icon={SchoolIcon}
                title={school}
                subtitle={
                  chaptersAtSchool.length === 1
                    ? "1 chapter"
                    : `${chaptersAtSchool.length} chapters`
                }
                monogram={monogramFor(school)}
                onChange={schools.length > 1 ? resetToSchool : undefined}
              />
            ) : (
              <SchoolPicker
                schools={filteredSchools}
                totalCount={schools.length}
                query={schoolQuery}
                onQuery={setSchoolQuery}
                onPick={(s) => {
                  setSchool(s);
                  setSchoolQuery("");
                }}
              />
            )}
          </section>

          {/* STEP 2 — CHAPTER (revealed once a school is chosen) */}
          <Reveal show={!!school}>
            <section aria-labelledby="step2-h">
              <StepHeading index={2} id="step2-h" title="Choose your chapter" done={!!selected} />

              {selected ? (
                <SelectedRow
                  icon={Users}
                  title={selected.name || selected.subdomain}
                  subtitle={chapterDestinationLabel(selected, currentHost)}
                  monogram={monogramFor(selected.name || selected.school || selected.subdomain)}
                  onChange={chaptersAtSchool.length > 1 ? resetToChapter : undefined}
                />
              ) : (
                <ChapterPicker
                  chapters={filteredChapters}
                  totalCount={chaptersAtSchool.length}
                  query={chapterQuery}
                  onQuery={setChapterQuery}
                  onPick={(c) => {
                    setSelected(c);
                    setChapterQuery("");
                  }}
                />
              )}
            </section>
          </Reveal>

          {/* STEP 3 — PORTAL (revealed once a chapter is chosen) */}
          <Reveal show={!!selected}>
            <section aria-labelledby="step3-h">
              <StepHeading index={3} id="step3-h" title="Choose your portal" done={!!portal} />
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <PortalCard
                  active={portal === "brothers"}
                  onSelect={() => setPortal("brothers")}
                  icon={Users}
                  img="gl-brotherhood"
                  title="Brother portal"
                  line="Active members and e-board. Dues, events, voting, and chapter tools."
                />
                <PortalCard
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
                  E-board officers are brothers - use the Brother portal. Full admin
                  access lives behind it.
                </span>
              </p>
            </section>
          </Reveal>

          {/* CONTINUE */}
          <div className="mt-7">
            {continueHref ? (
              <Button
                asChild
                variant="platform"
                size="xl"
                className="gs-sheen w-full font-display uppercase tracking-[0.12em]"
              >
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
                {!school
                  ? "Select your school to continue"
                  : !selected
                    ? "Select your chapter to continue"
                    : "Choose a portal to continue"}
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

        {/* ── Footer affordances (kept compact) ────────────────────── */}
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
          <MarketingSiteLink />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Sub-components ───────────────────────────── */

/** Smooth height/opacity reveal for a progressively-disclosed step. */
function Reveal({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid transition-all duration-500 ease-gs-spring motion-reduce:transition-none",
        show ? "mt-7 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">
        <div className="border-t border-border/60 pt-7">{children}</div>
      </div>
    </div>
  );
}

/** The numbered progress rail (School → Chapter → Portal). */
function Stepper({ current, className }: { current: 1 | 2 | 3; className?: string }) {
  const steps = [
    { n: 1 as const, label: "School" },
    { n: 2 as const, label: "Chapter" },
    { n: 3 as const, label: "Portal" },
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
                  "h-px w-5 rounded-full transition-colors duration-300 sm:w-8",
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
          done ? "bg-emerald-500/15 text-emerald-700" : "bg-blue-600/10 text-blue-700",
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

/** A refined classical search field (ivory surface, gold hairline + focus ring). */
function SearchField({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700/70"
        aria-hidden="true"
      />
      <input
        type="text"
        inputMode="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full rounded-xl border border-amber-600/30 bg-[#f4f1e6]/80 py-2.5 pl-10 pr-4 font-serif text-base italic text-[#16264e] shadow-sm outline-none transition placeholder:font-serif placeholder:italic placeholder:text-[#16264e]/45 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/40"
      />
    </div>
  );
}

/** Step 1 — the SCHOOL picker (searchable list of distinct schools). */
function SchoolPicker({
  schools,
  totalCount,
  query,
  onQuery,
  onPick,
}: {
  schools: SchoolOption[];
  totalCount: number;
  query: string;
  onQuery: (v: string) => void;
  onPick: (school: string) => void;
}) {
  return (
    <div className="mt-4">
      {totalCount > 4 ? (
        <SearchField
          value={query}
          onChange={onQuery}
          placeholder="Search for your school…"
          ariaLabel="Search for your school"
        />
      ) : null}

      <div className={cn("max-h-[19rem] overflow-y-auto rounded-xl", totalCount > 4 && "mt-3")}>
        {totalCount === 0 ? (
          <EmptyState variant="no-chapters" />
        ) : schools.length === 0 ? (
          <EmptyState variant="no-match" query={query} />
        ) : (
          <ul className="space-y-2">
            {schools.map((s) => (
              <li key={s.school}>
                <button
                  type="button"
                  onClick={() => onPick(s.school)}
                  className="gs-architrave-card group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 pt-4 text-left transition-all duration-200 ease-gs-spring hover:-translate-y-px hover:border-amber-500/55 hover:shadow-[0_14px_30px_-16px_rgba(200,144,28,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span
                    className="gs-medallion h-10 w-10 font-display text-[13px] font-semibold leading-none tracking-[0.04em]"
                    aria-hidden="true"
                  >
                    {monogramFor(s.school)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[15px] font-semibold tracking-[0.01em] text-[#16264e]">
                      {s.school}
                    </span>
                    <span className="block truncate font-serif text-[13px] italic text-[#16264e]/70">
                      {s.count === 1 ? "1 chapter" : `${s.count} chapters`}
                    </span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-amber-700/70 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-amber-600 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Step 2 — the CHAPTER picker (chapters within the chosen school). */
function ChapterPicker({
  chapters,
  totalCount,
  query,
  onQuery,
  onPick,
}: {
  chapters: ChapterRouteTarget[];
  totalCount: number;
  query: string;
  onQuery: (v: string) => void;
  onPick: (c: ChapterRouteTarget) => void;
}) {
  return (
    <div className="mt-4">
      {totalCount > 4 ? (
        <SearchField
          value={query}
          onChange={onQuery}
          placeholder="Search chapters…"
          ariaLabel="Search for your chapter"
        />
      ) : null}

      <div className={cn("max-h-[17rem] overflow-y-auto rounded-xl", totalCount > 4 && "mt-3")}>
        {totalCount === 0 ? (
          <EmptyState variant="no-chapters" />
        ) : chapters.length === 0 ? (
          <EmptyState variant="no-match" query={query} />
        ) : (
          <ul className="space-y-2">
            {chapters.map((c) => (
              <li key={c.subdomain}>
                <button
                  type="button"
                  onClick={() => onPick(c)}
                  className="gs-architrave-card group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 pt-4 text-left transition-all duration-200 ease-gs-spring hover:-translate-y-px hover:border-amber-500/55 hover:shadow-[0_14px_30px_-16px_rgba(200,144,28,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span
                    className="gs-medallion h-10 w-10 font-display text-[13px] font-semibold leading-none tracking-[0.04em]"
                    aria-hidden="true"
                  >
                    {monogramFor(c.name || c.school || c.subdomain)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[15px] font-semibold tracking-[0.01em] text-[#16264e]">
                      {c.name || c.subdomain}
                    </span>
                    {c.school ? (
                      <span className="block truncate font-serif text-[13px] italic text-[#16264e]/70">
                        {c.school}
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-amber-700/70 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-amber-600 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** A confirmed selection row (school or chapter) with an optional Change action. */
function SelectedRow({
  icon: Icon,
  title,
  subtitle,
  monogram,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  monogram: string;
  onChange?: () => void;
}) {
  return (
    <div className="gs-architrave-card mt-4 flex items-center gap-3 rounded-2xl px-3.5 py-3 pt-4">
      <span
        className="gs-medallion relative h-11 w-11 font-display text-sm font-semibold leading-none tracking-[0.04em]"
        aria-hidden="true"
      >
        {monogram}
        <Icon className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#16264e] p-0.5 text-amber-300 ring-1 ring-amber-300/40" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[15px] font-semibold tracking-[0.01em] text-[#16264e]">
          {title}
        </p>
        {subtitle ? (
          <p className="truncate font-serif text-[13px] italic text-[#16264e]/70">{subtitle}</p>
        ) : null}
      </div>
      {onChange ? (
        <button
          type="button"
          onClick={onChange}
          className="shrink-0 rounded-lg px-2.5 py-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-700 transition hover:bg-amber-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
        >
          Change
        </button>
      ) : null}
    </div>
  );
}

/** A selectable portal card (Step 3). */
function PortalCard({
  active,
  onSelect,
  icon: Icon,
  img,
  title,
  line,
}: {
  active: boolean;
  onSelect: () => void;
  icon: LucideIcon;
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
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-blue-500/15 to-cyan-400/10 transition-opacity duration-300",
          active ? "opacity-100" : "opacity-50 group-hover:opacity-100",
        )}
      />
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
      {img ? (
        <span className="relative">
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
      <span className="relative text-sm font-bold tracking-tight text-foreground">{title}</span>
      <span className="relative text-xs leading-relaxed text-muted-foreground">{line}</span>
    </button>
  );
}

/** Empty states — no chapters provisioned, or no search match. Route to /contact. */
function EmptyState({ variant, query }: { variant: "no-chapters" | "no-match"; query?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-amber-600/30 bg-[#f4f1e6]/50 px-5 py-8 text-center">
      <span className="gs-medallion mx-auto mb-3 h-12 w-12" aria-hidden="true">
        <SchoolIcon className="h-5 w-5" />
      </span>
      <p className="font-display text-sm font-semibold uppercase tracking-[0.08em] text-[#16264e]">
        {variant === "no-match" ? "Don’t see it?" : "No chapters here yet"}
      </p>
      <p className="mx-auto mt-1.5 max-w-xs font-serif text-[13px] italic leading-relaxed text-[#16264e]/70">
        {variant === "no-match" ? (
          <>
            We couldn&apos;t find a match
            {query ? <span className="font-medium"> for “{query.trim()}”</span> : ""}. It might be
            coming soon - let&apos;s talk.
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

/** The tasteful gold serif "greekstack.com" website link — opens in a new tab. */
function MarketingSiteLink() {
  const href = marketingSiteUrl();
  const label = marketingSiteLabel();
  return (
    <div className="flex flex-col items-center gap-2 pt-1">
      <span aria-hidden="true" className="pointer-events-none gs-greek-key gs-greek-key--gold w-20" />
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 font-serif text-base italic text-amber-700 underline-offset-4 transition hover:text-amber-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
      >
        Visit {label}
        <ExternalLink
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </a>
    </div>
  );
}

/** Soft, decorative color orbs behind the card — reduced-motion-safe (static). */
function AmbientOrbs() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[-8] overflow-hidden">
      <div className="absolute -left-24 top-[-10%] h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="absolute right-[-10%] top-1/3 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="absolute bottom-[-10%] left-1/3 h-72 w-72 rounded-full bg-blue-800/15 blur-3xl" />
    </div>
  );
}

export default LoginEntry;
