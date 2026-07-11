import React from "react";
import Link from "next/link";
import { RushForm } from "@/components/site/rush-form";
import { ScheduleList } from "@/components/site/schedule-list";
import { Seal, Crest } from "@/components/brand/wordmark";
import { Scene } from "@/components/brand/scene";
import { InstagramFeed } from "@/components/site/instagram-feed";
import { SmartImage, AvatarImage } from "@/components/site/smart-image";
import { Reveal } from "@/components/site/reveal";
import {
  Tilt3DCard, Magnetic, Parallax, Reveal3D, Reveal3DItem, FloatingOrbs, AnimatedCounter,
} from "@/components/site/anim";
import {
  IconPin, IconMail as IconMailDuo, IconInstagram as IconInstagramDuo,
  IconHouse, IconSparkle, IconShieldCheck as IconShieldCheckDuo,
  IconCheckCircle as IconCheckCircleDuo,
} from "@/components/brand/icons/chapter";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { IconChip } from "@/components/ui/icon-chip";
import { imageSrc, avatarSrc } from "@/lib/image-url";
import {
  ArrowRight, ShieldCheck, Quote, Star, Calendar, Award, Instagram,
  CheckCircle2,
} from "lucide-react";
import { cleanUrl, cleanMailto, cleanTel, titleCaseAddress } from "@/lib/utils";
import { SiteIcon, siteIconNameFor } from "@/components/site/site-icon";
import { getComponentSet } from "@/lib/site-generator/component-sets";
import { cn } from "@/lib/utils";
import type { SectionContext } from "./types";
import {
  BRAND_TILT_GLOW, SectionEyebrow, ContactPill, chipIconFor,
} from "./helpers";

/**
 * buildSectionMap — the 15 homepage section renderers, SHARED across all three
 * templates. Moved out of chapter-landing.tsx's inline sectionMap (the closure
 * over `cfg`/`identity`/`stats`/… is now threaded through `ctx: SectionContext`).
 * The `hero` key is supplied by the caller (renderer picks the hero variant from
 * cfg["website.template"]); every other section body is identical regardless of
 * template, so switching templates only changes the hero + the default order.
 *
 * Section visibility gates (show.statsStrip, !!cfg["spotlight.name"], eboard
 * length, etc.) are unchanged — preserved verbatim so behavior matches today.
 * A few bodies read `ctx.template` for a thin layout-variant CLASS swap (Bold's
 * promoted stat grid, Modern/Bold dividers) — never a structural fork.
 */
export function buildSectionMap(
  ctx: SectionContext,
  hero: React.ReactNode,
): Record<string, React.ReactNode> {
  const {
    cfg, identity, terms, isPhiSig,
    stats, eboard, VALUES, TIMELINE, FAQ, HIGHLIGHTS, RECENT, FEED,
    nextEvent, webcalUrl, termLabelShort, termLabelLong, customQuestions,
    template, componentSet, iconFamily,
  } = ctx;

  // The chosen component set (buttons/cards/nav/badges/inputs) + icon family flow
  // into the section chrome so a preset actually restyles rendered components, not
  // just the section order. `set` carries the class tokens; icons draw from the
  // ONE chosen family via <SiteIcon>. Applied at representative, contained seams
  // (the highlights band + the values cards) so a set/family swap is visible while
  // the finely-tuned hero + heavy sections stay byte-stable.
  const set = getComponentSet(componentSet);
  // Radius for the 3D-tilt WRAPPER around a set-styled card, matched to the set's
  // corner language so the wrapper's clip never fights the card's own corners.
  const cardWrapRadius =
    set.radius === "round" ? "rounded-3xl" : set.radius === "sharp" ? "rounded-md" : "rounded-2xl";

  // Bold promotes the stats strip to a big-type 2×2 grid; the other templates
  // keep the original 4-up band. A class swap on the existing markup, not a fork.
  const statsGridClass =
    template === "bold"
      ? "relative container section-y grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-10"
      : "relative container section-y-tight grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-8 sm:gap-8";
  const statsNumClass =
    template === "bold"
      ? "text-3xl sm:text-5xl font-bold tracking-tight leading-none"
      : "text-2xl sm:text-3xl font-semibold tracking-tight leading-none";

  return {
    hero,
    stats: (
      <>
        {cfg["show.statsStrip"] !== "false" && (
      <section className="relative bg-gradient-to-br from-phisig-red via-phisig-red to-phisig-red-dark text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-15" aria-hidden />
        {/* Soft top sheen for depth against the hero above */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" aria-hidden />
        <div className="absolute -right-20 -top-20 opacity-10">
          <Seal className="w-[300px] h-[300px] text-white" aria-hidden="true" />
        </div>
        <Reveal3D
          stagger={0.1}
          className={statsGridClass}
        >
          {stats.map((s) => (
            <Reveal3DItem key={s.label} className="group flex items-center gap-4">
              <span className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 shrink-0 shadow-lg shadow-black/10 transition-transform duration-300 group-hover:scale-105 group-hover:bg-white/20">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <div className={statsNumClass}>
                  <AnimatedCounter value={s.num} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
                </div>
                <div className="mt-1 text-xs opacity-85">{s.label}</div>
                {s.sub && <div className="text-[10px] opacity-65 mt-0.5">{s.sub}</div>}
              </div>
            </Reveal3DItem>
          ))}
        </Reveal3D>
      </section>
      )}
      </>
    ),
    highlights: (
      <>
        {cfg["show.highlightsBanner"] !== "false" && (
      <section className="border-b border-border bg-gradient-to-b from-secondary/40 to-secondary/10 overflow-hidden">
        <div className="container py-5 flex flex-wrap items-center gap-2 sm:gap-2.5 justify-center">
          {HIGHLIGHTS.map((h) => (
            // Chip chrome comes from the chosen component set's `badge` token, and
            // the glyph is drawn from the chosen icon family — so switching preset
            // visibly restyles this row (pill vs square vs block) and reweights its
            // icons, while the hover lift stays consistent across sets.
            <span
              key={h.label}
              className={cn(
                set.badge,
                "group gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
              )}
            >
              <SiteIcon
                family={iconFamily}
                name={siteIconNameFor(h.icon)}
                className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110"
              />
              <span>{h.label}</span>
            </span>
          ))}
        </div>
      </section>
      )}
      </>
    ),
    values: (
      <>
        {cfg["show.values"] !== "false" && (
      <section className="container section-y">
        <Reveal3D className="max-w-2xl mb-10">
          <span className="inline-flex items-center rounded-full border border-phisig-red/20 bg-phisig-red-soft/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-phisig-red">
            Three principles
          </span>
          <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight [text-wrap:balance]">
            {identity.cardinalPrinciples.split(/,\s*/).join(". ")}.
          </h2>
        </Reveal3D>
        {/* Staggered 3D reveal as the grid scrolls in; each card is a
            cursor-tracked 3D tilt with a brand-colored glow. */}
        <Reveal3D stagger={0.09} className="grid md:grid-cols-3 gap-4 sm:gap-5">
          {VALUES.map((v) => (
            <Reveal3DItem key={v.title} className="h-full">
              {/* Card surface comes from the chosen component set — soft-rounded,
                  sharp editorial rule, or brutal offset shadow — so a preset swap
                  visibly re-skins these cards. The tilt wrapper radius tracks the
                  set so its clip never fights the card corners. */}
              <Tilt3DCard max={8} glareColor={BRAND_TILT_GLOW} className={cn("h-full", cardWrapRadius)}>
                <div className={cn(set.card, "h-full p-6 sm:p-7 relative overflow-hidden group transition-colors")}>
                  <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-gradient-to-br from-phisig-red-soft/60 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" aria-hidden />
                  <IconChip icon={chipIconFor(v.icon)} tone="brand" size="lg" className="relative transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3" />
                  <h3 className="relative mt-5 text-xl font-semibold tracking-tight">{v.title}</h3>
                  <p className="relative mt-2 text-sm text-muted-foreground leading-relaxed">{v.body}</p>
                  <Crest className="absolute -bottom-4 -right-4 h-20 w-20 text-phisig-red opacity-[0.08]" aria-hidden="true" />
                </div>
              </Tilt3DCard>
            </Reveal3DItem>
          ))}
        </Reveal3D>
      </section>
      )}
      </>
    ),
    register: (
      <>
        <section id="register" className="relative bg-phisig-mist border-y border-border scroll-mt-20 overflow-hidden">
        {/* Themed aurora + grid wash behind the form — brand-toned, reduced-motion
            safe via the foundation component. Sits at the section's base layer;
            the form card renders above it untouched. */}
        <AnimatedBackground
          variant="aurora-grid"
          tone="brand"
          className="absolute inset-0 -z-0 opacity-60"
        />
        <div className="relative container section-y">
          <Reveal3D className="max-w-xl mx-auto text-center mb-8">
            <IconChip icon={IconSparkle} tone="brand" size="md" className="mx-auto mb-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-phisig-red">
              Get on the list
            </span>
            <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">
              Drop your number.
            </h2>
            <p className="mt-3 text-muted-foreground text-base sm:text-lg">
              No spam, no ceremony - about 60 seconds. We'll text the second the
              {" "}{termLabelShort} schedule drops.
            </p>
            {/* Trust signals — frosted glass chips (the section's aurora frosts
                through them) with custom brand check icons. They lift on hover
                so the conversion section feels considered + premium. */}
            <ul className="mt-5 inline-flex flex-wrap justify-center items-center gap-2 text-xs text-muted-foreground">
              <li className="gs-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-transform duration-300 hover:-translate-y-0.5">
                <IconCheckCircleDuo className="h-3.5 w-3.5 text-phisig-red" />
                Goes straight to the rush chair
              </li>
              <li className="gs-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-transform duration-300 hover:-translate-y-0.5">
                <IconCheckCircleDuo className="h-3.5 w-3.5 text-phisig-red" />
                Up to 8 texts per cycle, opt out anytime
              </li>
              <li className="gs-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-transform duration-300 hover:-translate-y-0.5">
                <IconCheckCircleDuo className="h-3.5 w-3.5 text-phisig-red" />
                Never sold or shared
              </li>
            </ul>
            <p className="mt-4 text-[11px] text-muted-foreground">
              18+, or 17 with a parent's permission.{" "}
              <Link href="/privacy" className="text-phisig-red hover:underline">Privacy</Link>{" "}·{" "}
              <Link href="/parents" className="text-phisig-red hover:underline">For parents</Link>.
            </p>
          </Reveal3D>
          {/* The conversion form itself is left exactly as shipped — no motion
              wrapper around it, so submit / validation / focus are untouched. */}
          <div className="max-w-3xl mx-auto">
            <RushForm socialHandle={cfg["contact.instagramHandle"] || undefined} socialUrl={cleanUrl(cfg["contact.instagramUrl"]) || undefined} customQuestions={customQuestions} />
          </div>
        </div>
      </section>
      </>
    ),
    instagram: (
      <>
        {cfg["show.instagramFeed"] !== "false" && (
      <section className="container section-y">
        <Reveal3D className="grid lg:grid-cols-[1fr_2fr] gap-8 items-end mb-8">
          <div>
            <SectionEyebrow>{cfg["contact.instagramHandle"]}</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">A year in the life.</h2>
          </div>
          <p className="text-muted-foreground max-w-xl leading-relaxed">
            Philanthropy events, {terms.collective.toLowerCase()} before finals, the chapter formal
            (FIPG-compliant, third-party vendor, sober transportation), and dry
            tailgates on game day. The {identity.greekLetters} chapter shows up - all year.{" "}
            <span className="text-phisig-red font-medium">{identity.tagline}</span>
          </p>
        </Reveal3D>
        <InstagramFeed
          count={9}
          posts={FEED}
          handle={cfg["contact.instagramHandle"] || undefined}
          handleUrl={cleanUrl(cfg["contact.instagramUrl"]) || undefined}
        />

        {/* Recent activity strip — staggered 3D reveal + cursor-tracked tilt. */}
        <Reveal3D stagger={0.08} className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {RECENT.map((r) => (
            <Reveal3DItem key={r.title} className="h-full">
              <Tilt3DCard max={7} glareColor={BRAND_TILT_GLOW} className="h-full rounded-2xl">
                <div className="h-full rounded-2xl border border-border bg-card p-5 transition-colors hover:border-phisig-red/30">
                  <div className="flex items-center gap-2.5">
                    <IconChip icon={chipIconFor(r.icon)} tone="brand" size="sm" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">{r.tag}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-snug">{r.title}</p>
                </div>
              </Tilt3DCard>
            </Reveal3DItem>
          ))}
        </Reveal3D>

        <div className="mt-8 text-center">
          <Link
            href={cleanUrl(cfg["contact.instagramUrl"])}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 text-sm font-medium text-phisig-red hover:underline"
          >
            <Instagram className="h-4 w-4" aria-hidden="true" /> Follow {cfg["contact.instagramHandle"]} for the latest
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </section>
      )}
      </>
    ),
    timeline: (
      <>
        {cfg["show.timeline"] !== "false" && (
      <section className="border-y border-border bg-secondary/40">
        <div className="container section-y">
          <Reveal3D className="max-w-2xl mb-10">
            <SectionEyebrow>How rush works</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight [text-wrap:balance]">
              Three weeks. Zero pressure.
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl leading-relaxed">
              We're not interested in hazing or hoops. We're interested in finding the right {terms.membersLower}.
            </p>
          </Reveal3D>
          <ol className="grid md:grid-cols-3 gap-3 sm:gap-4">
            {TIMELINE.map((t, i) => (
              // The <li> stays the grid cell (holds the connector that points at
              // the next step). Inside, a staggered 3D reveal + cursor-tracked
              // brand-glow tilt on the card surface itself.
              <li key={t.week} className="relative">
                <Reveal3D delay={i * 0.09} className="h-full">
                  <Tilt3DCard max={7} glareColor={BRAND_TILT_GLOW} className="h-full rounded-2xl">
                    <div className="relative h-full rounded-2xl border border-border bg-card p-6 transition-colors hover:border-phisig-red/30">
                      <span className="inline-flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-phisig-red to-phisig-red-dark text-[11px] font-bold text-white shadow-sm shadow-phisig-red/30">
                          {i + 1}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                          {t.week}
                        </span>
                      </span>
                      <h3 className="mt-3 text-base font-semibold">{t.title}</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{t.body}</p>
                      <span className="absolute top-5 right-5 text-2xl font-semibold text-phisig-red opacity-15">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                  </Tilt3DCard>
                </Reveal3D>
                {i < TIMELINE.length - 1 && (
                  <span className="hidden md:block absolute top-1/2 -right-2.5 h-0.5 w-5 bg-phisig-red/30 z-10" aria-hidden />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>
      )}
      </>
    ),
    schedule: (
      <>
        <section id="schedule" className="relative section-y scroll-mt-20 overflow-hidden">
        {/* Faint brand-tinted grid band for depth behind the schedule. The dot
            grid + masked fade match the hero so the page reads as one set. */}
        <div className="absolute inset-0 -z-10 bg-dot-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_72%)]" aria-hidden />
        <div className="container">
        <Reveal3D className="grid lg:grid-cols-[1fr_2fr] gap-8 items-end mb-8">
          <div>
            <SectionEyebrow>{termLabelShort} calendar</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
              Upcoming events
            </h2>
          </div>
          <div className="space-y-4 max-w-xl">
            <p className="text-muted-foreground">
              Full {termLabelShort} {terms.recruit.toLowerCase()} schedule drops in August. Get on the interest list above - 
              we&apos;ll text everyone the second it&apos;s live. Private events go out by invitation only.
            </p>
            {/* Hide calendar-subscribe CTAs while the rush schedule hasn't
                been published yet. A user clicking through to a 0-event .ics
                feed gets nothing and feels like the site is broken. Once the
                rush chair adds the first public event in /admin/events, both
                CTAs appear automatically (nextEvent goes non-null). */}
            {nextEvent && (
              <div className="flex flex-wrap gap-2">
                <a
                  href={webcalUrl}
                  className="inline-flex items-center gap-1.5 rounded-full border border-phisig-red/30 bg-white px-3 py-1.5 text-xs font-medium text-phisig-red hover:bg-phisig-red-soft transition-colors"
                >
                  <Calendar className="h-3 w-3" aria-hidden="true" /> Subscribe in Apple Calendar
                </a>
                <a
                  href="/api/events.ics"
                  download="chapter-rush.ics"
                  className="inline-flex items-center gap-1.5 rounded-full border border-phisig-red/30 bg-white px-3 py-1.5 text-xs font-medium text-phisig-red hover:bg-phisig-red-soft transition-colors"
                >
                  <Calendar className="h-3 w-3" aria-hidden="true" /> Download .ics
                </a>
              </div>
            )}
          </div>
        </Reveal3D>
        {/* ScheduleList is a client island that renders the live event cards —
            left untouched so its own data fetching / states keep working. */}
        <div className="max-w-3xl">
          <ScheduleList />
        </div>
        </div>
      </section>
      </>
    ),
    testimonial: (
      <>
        {/* ANTI-FABRICATION: render ONLY when the chapter has opted in AND supplied
            a REAL quote. A blank quote hides the section entirely, so a chapter that
            flips show.testimonial on without adding a quote shows nothing rather than
            a canned/invented one. No fabricated author or rating is rendered. */}
        {cfg["show.testimonial"] !== "false" && (cfg["testimonial.quote"] || "").trim() !== "" && (
      <section className="border-t border-border bg-gradient-to-b from-phisig-red-soft/40 via-background to-background">
        <div className="container section-y">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <Reveal3D>
              <Quote className="h-8 w-8 text-phisig-red mb-3" aria-hidden="true" />
              <blockquote className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug">
                &ldquo;{cfg["testimonial.quote"]}&rdquo;
              </blockquote>
              {(cfg["testimonial.author"] || "").trim() !== "" && (
              <div className="mt-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-phisig-red text-white flex items-center justify-center font-semibold text-sm">
                  {cfg["testimonial.author"]
                    .split(/\s+/)
                    .map((s) => s[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">{cfg["testimonial.author"]} {cfg["testimonial.classYear"]}</span>
                    {cfg["testimonial.attribution"] && (<> · {cfg["testimonial.attribution"]}</>)}
                  </p>
                </div>
              </div>
              )}
            </Reveal3D>
            {/* Heritage scene card — gentle scroll parallax + cursor-tracked 3D
                tilt with a brand-colored glow. */}
            <Parallax translateY={28}>
              <Tilt3DCard max={8} glareColor={BRAND_TILT_GLOW} className="rounded-2xl">
                <Scene theme="tradition" size="tall" caption={`Founded ${identity.foundingYear}. ${identity.greekLetters} at ${identity.schoolShort} since ${identity.charterYear}.`} />
              </Tilt3DCard>
            </Parallax>
          </div>
        </div>
      </section>
      )}
      </>
    ),
    spotlight: (
      <>
        {cfg["show.spotlight"] !== "false" && !!cfg["spotlight.name"] && (
      <section className="container section-y">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
          <Reveal3D className="order-2 lg:order-1">
            <SectionEyebrow>{terms.member} of the Month</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
              Real {terms.membersLower}. Real recognition.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed max-w-xl">
              Every month the chapter recognizes a {terms.memberLower} who's gone above and beyond - in
              the classroom, in service, on the field, in leadership.{" "}
              {cfg["spotlight.bio"]}
            </p>
            {(() => {
              // Achievement bullets are per-member — drive them from a
              // pipe/newline-delimited `spotlight.bullets` chapter-config value;
              // fall back to the member's role only (never hardcoded chapter copy).
              const bullets = (cfg["spotlight.bullets"] || cfg["spotlight.role"] || "")
                .split(/\s*[|\n]\s*/)
                .map((s) => s.trim())
                .filter(Boolean);
              return bullets.length > 0 ? (
                <ul className="mt-6 space-y-2.5 text-sm">
                  {bullets.map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-phisig-red shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              ) : null;
            })()}
            <p className="mt-6 text-sm text-phisig-red font-medium">
              {identity.tagline}
            </p>
          </Reveal3D>
          <div className="order-1 lg:order-2 relative">
            {/* Spotlight photo links out to Instagram — kept as a real <a>
                inside the tilt so the click-through still works. */}
            <Tilt3DCard max={8} glareColor={BRAND_TILT_GLOW} className="rounded-2xl">
              <a
                href={/^https?:\/\//.test(cfg["spotlight.slug"]) ? cfg["spotlight.slug"] : `https://www.instagram.com/p/${cfg["spotlight.slug"]}/`}
                target="_blank"
                rel="noreferrer noopener"
                className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-border bg-secondary shadow-xl shadow-phisig-red/10 block"
              >
                <SmartImage
                  src={imageSrc(cfg["spotlight.slug"], { w: 640, h: 800, crop: "fill", gravity: "auto" })}
                  alt={`${terms.member} of the Month - ${cfg["spotlight.name"]}`}
                  width={640}
                  height={800}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  fallbackLabel={`${terms.member} of the Month`}
                  crestClassName="h-20 w-20"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[10px] font-semibold text-phisig-red shadow-sm">
                    <Star className="h-3 w-3" aria-hidden="true" />{cfg["spotlight.month"] ? <>{cfg["spotlight.month"]} · </> : null}{terms.member} of the Month
                  </span>
                  <p className="mt-2 text-white text-xl font-semibold tracking-tight">
                    {cfg["spotlight.name"]}
                  </p>
                  <p className="text-white/95 text-xs">
                    {cfg["spotlight.role"]}
                  </p>
                </div>
              </a>
            </Tilt3DCard>
            <div className="absolute -top-3 -left-3 hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-phisig-red text-white shadow-lg shadow-phisig-red/30 rotate-[-6deg] pointer-events-none z-20">
              <Star className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>
      )}
      </>
    ),
    eboard: (
      <>
        {cfg["show.eboard"] !== "false" && eboard.length > 0 && (
      <section className="border-t border-border">
        <div className="container section-y">
          <Reveal3D className="grid lg:grid-cols-[1fr_2fr] gap-8 items-end mb-8">
            <div>
              <SectionEyebrow>Chapter leadership</SectionEyebrow>
              <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
                Meet the e-board.
              </h2>
            </div>
            <p className="text-muted-foreground max-w-xl leading-relaxed">
              The {identity.greekLetters} chapter elects its leadership annually. These are the {terms.membersLower}
              running the show - happy to talk to anyone who wants to learn more.
            </p>
          </Reveal3D>
          {/* Leadership grid — staggered 3D reveal; each card tilts toward the
              cursor with a brand glow. */}
          <Reveal3D stagger={0.07} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {eboard.map((m) => (
              <Reveal3DItem key={m.name} className="h-full">
                <Tilt3DCard max={9} glareColor={BRAND_TILT_GLOW} className="h-full rounded-2xl">
                  <div className="group relative h-full rounded-2xl border border-border bg-card p-5 overflow-hidden transition-colors hover:border-phisig-red/30">
                    <AvatarImage
                      src={m.headshotUrl ? avatarSrc(m.headshotUrl, 112) : ""}
                      alt={`${m.name}, ${m.role}`}
                      initials={m.name.split(" ").map((s) => s[0]).join("")}
                      width={56}
                      height={56}
                      loading="lazy"
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-phisig-red/20 ring-offset-2 ring-offset-card shadow-md shadow-phisig-red/20"
                      fallbackClassName="h-14 w-14 rounded-full text-base shadow-md shadow-phisig-red/20 ring-2 ring-phisig-red/20 ring-offset-2 ring-offset-card"
                    />
                    <div className="mt-4">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-phisig-red font-semibold">
                        {m.role}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold">{m.name}</p>
                    </div>
                    <Crest className="absolute -bottom-3 -right-3 h-16 w-16 text-phisig-red opacity-10" aria-hidden="true" />
                  </div>
                </Tilt3DCard>
              </Reveal3DItem>
            ))}
          </Reveal3D>
        </div>
      </section>
      )}
      </>
    ),
    about: (
      <>
        <section id="about" className="container section-y scroll-mt-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Reveal3D>
            <SectionEyebrow>About the chapter</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
              Founded in {identity.foundingYear}.<br/> Built for what's next.
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              {cfg["about.history"]}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Parents and prospective members:{" "}
              <span className="font-medium text-foreground">{cfg["contact.advisorName"]}</span>
              {cfg["contact.advisorTitle"] && (<>, {cfg["contact.advisorTitle"]}</>)} - {" "}
              <a href={cleanMailto(cfg["contact.advisorEmail"])} className="text-phisig-red hover:underline font-medium">
                {cfg["contact.advisorEmail"]}
              </a>{cfg["contact.rushPhone"] && (
                <>{" "}· <a href={cleanTel(cfg["contact.rushPhone"])} className="text-phisig-red hover:underline font-medium">{cfg["contact.rushPhone"]}</a></>
              )}.
            </p>

            <ul className="mt-6 space-y-2.5 stagger">
              {[
                "Top-tier academic support and mentorship",
                `Year-round philanthropy with ${cfg["philanthropy.beneficiary"]}`,
                // Region-neutral by default so no tenant claims a geography it
                // doesn't have; a chapter can override with its real footprint.
                cfg["about.alumniLine"] || "Strong, engaged alumni network",
                `${terms.collective} that lasts well beyond graduation`,
              ].filter(Boolean).map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-phisig-red shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>

            {/* Heritage block — the original Phi Sigma Kappa coat of arms in
                gold-and-red engraving alongside three cardinal-red Greek
                glyphs. Both pulled from the supplied chapter brand kit. Sits
                here in the About section so a parent or rushee scrolling for
                "is this a real chapter" answer gets the visual confirmation
                of national heritage in one glance. */}
            <div className="mt-7 rounded-xl border border-phisig-red/15 bg-gradient-to-br from-phisig-red-soft/30 via-white to-phisig-red-soft/10 p-4 flex items-center gap-4">
              {isPhiSig ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/brand/coat-of-arms-vintage.jpg"
                  alt={`Original ${identity.fraternityName} coat of arms - engraved ${identity.foundingYear}`}
                  width={84}
                  height={104}
                  loading="lazy"
                  decoding="async"
                  className="h-[84px] w-auto rounded-md ring-1 ring-phisig-red/10 shadow-sm shrink-0"
                />
              ) : (
                <Crest className="h-[104px] w-auto text-phisig-red shrink-0" aria-hidden="true" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-phisig-red font-semibold">Heritage</p>
                {/* Headline heritage claim is GATED: only assert "one of the
                    oldest" when the org is genuinely old (founded before 1950)
                    OR the chapter supplied its own line. Otherwise lead with a
                    safe, true statement so no tenant ships a false-age claim. */}
                <p className="mt-1 text-sm font-semibold leading-snug">
                  {cfg["about.heritageLine"] ||
                    (identity.foundingYear && Number(identity.foundingYear) < 1950
                      ? "One of the oldest Greek letter societies in the country."
                      : `Proud heritage, carried forward at ${identity.schoolName || "our campus"}.`)}
                </p>
                {(identity.foundingLocation || identity.foundingYear) && (
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {[
                      identity.foundingYear
                        ? `${identity.fraternityName} was founded${identity.foundingLocation ? ` at ${identity.foundingLocation}` : ""} in ${identity.foundingYear}.`
                        : "",
                      identity.greekLetters && identity.schoolName && identity.charterYear
                        ? `${identity.greekLetters} has carried the chapter forward at ${identity.schoolName} since ${identity.charterYear}.`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              <ContactPill icon={IconPin} label={titleCaseAddress(cfg["contact.address"])} sub={titleCaseAddress(cfg["contact.cityState"])} />
              <ContactPill icon={IconMailDuo} label={cfg["contact.rushEmail"]} sub="Rush questions" />
              <ContactPill icon={IconInstagramDuo} label={cfg["contact.instagramHandle"]} sub="Daily chapter life" />
            </div>

            <div className="mt-8 rounded-xl border border-phisig-red/20 bg-phisig-red-soft/40 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-phisig-red mt-0.5 shrink-0" aria-hidden="true" />
                <div className="text-xs leading-relaxed">
                  <p className="font-semibold text-foreground">Zero-tolerance anti-hazing policy.</p>
                  <p className="mt-1 text-muted-foreground">
                    {cfg["antiHazing.body"]}{" "}
                    Concerns can be reported anonymously to{" "}
                    <span className="text-foreground font-medium">{cfg["contact.advisorName"]}</span> at{" "}
                    <a className="text-phisig-red hover:underline" href={cleanMailto(cfg["contact.advisorEmail"])}>{cfg["contact.advisorEmail"]}</a>, or via the national anti-hazing hotline{" "}
                    <a className="text-phisig-red hover:underline font-medium" href={cleanUrl(cfg["antiHazing.hotlineUrl"])} target="_blank" rel="noreferrer noopener">{cfg["antiHazing.hotline"]}</a>.
                  </p>
                </div>
              </div>
            </div>
          </Reveal3D>

          <div className="relative">
            {/* About photo — upgraded from the static CSS .tilt to a real
                cursor-tracked 3D tilt with a brand glow. Stays a working <a>
                out to Instagram; the floating badges stay pinned outside it. */}
            <Tilt3DCard max={8} glareColor={BRAND_TILT_GLOW} className="rounded-2xl">
              <a
                href={/^https?:\/\//.test(cfg["about.slug"]) ? cfg["about.slug"] : `https://www.instagram.com/p/${cfg["about.slug"]}/`}
                target="_blank"
                rel="noreferrer noopener"
                className="aspect-[4/5] rounded-2xl overflow-hidden border border-border bg-secondary shadow-xl block relative"
              >
                <SmartImage
                  src={imageSrc(cfg["about.slug"], { w: 640, h: 800, crop: "fill", gravity: "auto" })}
                  alt={cfg["about.caption"] || `${identity.greekLetters} chapter life`}
                  width={640}
                  height={800}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: cfg["about.objectPosition"] || "50% 50%" }}
                  fallbackLabel={cfg["about.caption"] || "Chapter life"}
                  crestClassName="h-20 w-20"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-6 left-6 right-6 text-white pointer-events-none">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[10px] font-semibold text-phisig-red shadow-sm">
                    <Award className="h-3 w-3" aria-hidden="true" /> {cfg["about.caption"] || "Chapter formal"}
                  </span>
                  <p className="mt-3 text-xl font-semibold tracking-tight leading-snug">
                    {terms.collective} you can count on - every weekend, every milestone, every year.
                  </p>
                  <p className="mt-1 text-xs text-white/95">{identity.tagline}{cfg["contact.instagramHandle"] ? <> · {cfg["contact.instagramHandle"]}</> : null}</p>
                </div>
              </a>
            </Tilt3DCard>
            <div className="absolute -bottom-5 -left-5 hidden sm:block w-48 rounded-2xl border border-border bg-white shadow-xl p-4 animate-float z-30">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Cardinal Principles
              </p>
              <p className="mt-1.5 text-sm font-semibold tracking-tight leading-snug">
                {terms.collective}<br/>Scholarship<br/>Character
              </p>
            </div>
            <div className="absolute -top-5 -right-5 hidden sm:flex h-20 w-20 items-center justify-center rounded-full bg-phisig-red text-white shadow-xl shadow-phisig-red/30 animate-pulse-ring z-30">
              <span className="text-center leading-tight">
                <span className="block text-[10px] uppercase tracking-[0.16em] opacity-80">Since</span>
                <span className="block text-lg font-semibold">{identity.foundingYear}</span>
              </span>
            </div>
          </div>
        </div>
      </section>
      </>
    ),
    faq: (
      <>
        {cfg["show.faq"] !== "false" && (
      <section className="border-y border-border bg-secondary/30">
        <div className="container section-y">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-10">
            <Reveal3D>
              <SectionEyebrow>FAQ</SectionEyebrow>
              <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
                Common questions.
              </h2>
              <p className="mt-3 text-muted-foreground max-w-md">
                Got something else? DM us on{" "}
                <Link
                  href={cleanUrl(cfg["contact.instagramUrl"])}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-phisig-red hover:underline font-medium"
                >
                  {cfg["contact.instagramHandle"]}
                </Link>{" "}
                or email{" "}
                <a href={cleanMailto(cfg["contact.rushEmail"])} className="text-foreground font-medium hover:underline">{cfg["contact.rushEmail"]}</a>.
              </p>
            </Reveal3D>
            {/* FAQ accordions reveal in a stagger; native <details>/<summary>
                disclosure stays fully functional inside the motion wrapper. */}
            <Reveal3D as="ul" stagger={0.06} className="space-y-3">
              {FAQ.map((item) => (
                <Reveal3DItem
                  as="li"
                  key={item.q}
                  className="group rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-phisig-red/40 hover:shadow-md"
                >
                  <details className="cursor-pointer">
                    <summary className="flex items-center justify-between gap-4 px-5 py-4 list-none">
                      <span className="text-base font-medium tracking-tight">{item.q}</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-phisig-red-soft text-phisig-red shrink-0 transition-transform group-open:rotate-45">
                        <ArrowRight className="h-3.5 w-3.5 -rotate-45 group-open:rotate-0 transition-transform" aria-hidden="true" />
                      </span>
                    </summary>
                    <div className="px-5 pb-5 -mt-1">
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                    </div>
                  </details>
                </Reveal3DItem>
              ))}
            </Reveal3D>
          </div>
        </div>
      </section>
      )}
      </>
    ),
    where: (
      <>
        {cfg["show.whereWeLive"] !== "false" && (
      <section className="container section-y">
        {/* Single-column: the prior left tile hardcoded one chapter's Movember
            Instagram post, which would leak onto every tenant. There is no
            chapter-agnostic "house photo" cfg key, so per white-label policy the
            photo tile is omitted (better than showing another chapter's post)
            and the address + contact cards carry this section. */}
        <div className="max-w-3xl mx-auto">
          <Reveal3D>
            <SectionEyebrow>Where we live</SectionEyebrow>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
              The house at {titleCaseAddress(cfg["contact.address"])}.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              The {identity.fraternityName} chapter house sits at <span className="text-foreground font-medium">{titleCaseAddress(cfg["contact.address"])}</span>, close
              to campus. It&apos;s where the cookouts,
              chapter meetings, and Bid Nights happen - and where most rushes meet the chapter
              for the first time.
            </p>
            {/* Contact tiles reveal in a stagger; each stays a real link. */}
            <Reveal3D stagger={0.08} className="mt-6 grid sm:grid-cols-2 gap-3">
              <Reveal3DItem className="h-full">
                <Link
                  href={cleanUrl(cfg["contact.mapsUrl"])}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group lift block h-full rounded-xl border border-border bg-card p-4 transition-shadow hover:border-phisig-red/40 hover:shadow-md hover:shadow-phisig-red/10 min-h-[60px]"
                >
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                    <IconPin className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" /> Address
                  </div>
                  <p className="mt-1.5 text-sm font-semibold">{titleCaseAddress(cfg["contact.address"])}</p>
                  <p className="text-xs text-muted-foreground">{titleCaseAddress(cfg["contact.cityState"])}</p>
                </Link>
              </Reveal3DItem>
              <Reveal3DItem className="h-full">
                <Link
                  href={cleanUrl(cfg["contact.instagramUrl"])}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group lift block h-full rounded-xl border border-border bg-card p-4 transition-shadow hover:border-phisig-red/40 hover:shadow-md hover:shadow-phisig-red/10 min-h-[60px]"
                >
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                    <IconInstagramDuo className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" /> Daily updates
                  </div>
                  <p className="mt-1.5 text-sm font-semibold">{cfg["contact.instagramHandle"]}</p>
                  <p className="text-xs text-muted-foreground">Follow for chapter life</p>
                </Link>
              </Reveal3DItem>
              <Reveal3DItem className="h-full">
                <Link
                  href={cleanMailto(cfg["contact.rushEmail"])}
                  className="group lift block h-full rounded-xl border border-border bg-card p-4 transition-shadow hover:border-phisig-red/40 hover:shadow-md hover:shadow-phisig-red/10 min-h-[60px]"
                >
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                    <IconMailDuo className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" /> Rush questions
                  </div>
                  <p className="mt-1.5 text-sm font-semibold">{cfg["contact.rushEmail"]}</p>
                  <p className="text-xs text-muted-foreground">We reply within 24 hours</p>
                </Link>
              </Reveal3DItem>
              <Reveal3DItem className="h-full">
                <Link
                  href={cleanUrl(cfg["chapter.schoolUrl"])}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group lift block h-full rounded-xl border border-border bg-card p-4 transition-shadow hover:border-phisig-red/40 hover:shadow-md hover:shadow-phisig-red/10 min-h-[60px]"
                >
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
                    <IconHouse className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" /> {identity.schoolShort} chapter info
                  </div>
                  <p className="mt-1.5 text-sm font-semibold">{identity.schoolShort} FSL</p>
                  <p className="text-xs text-muted-foreground">Fraternity &amp; Sorority Life</p>
                </Link>
              </Reveal3DItem>
            </Reveal3D>
          </Reveal3D>
        </div>
      </section>
      )}
      </>
    ),
    cta: (
      <>
        <section className="container pb-16 sm:pb-20">
        <Reveal className="rounded-3xl bg-gradient-to-br from-phisig-red via-phisig-red-dark to-phisig-red-dark text-white p-10 sm:p-16 relative overflow-hidden shadow-2xl shadow-phisig-red/30 ring-1 ring-white/10">
          <div className="absolute inset-0 bg-grid opacity-15" aria-hidden />
          {/* Soft top-light radial for depth */}
          <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(255,255,255,0.18),transparent_70%)]" aria-hidden />
          <div className="absolute -right-12 -bottom-12 opacity-15">
            <Seal className="w-[420px] h-[420px] text-white" aria-hidden="true" />
          </div>
          <div className="absolute right-[8%] top-[12%] opacity-10 hidden sm:block animate-float">
            <Crest className="h-32 w-32 text-white" aria-hidden="true" />
          </div>
          {/* Soft white orb glints drifting inside the brand panel for life.
              (The panel is already the brand color, so the orbs are light
              highlights rather than a competing hue.) */}
          <FloatingOrbs
            colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.12)", "rgba(255,255,255,0.10)"]}
            blur={80}
            className="opacity-80"
          />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
              {termLabelLong}
            </span>
            <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight [text-wrap:balance]">
              Get on the interest list.
            </h2>
            <p className="mt-3 text-white/95 max-w-md text-base sm:text-lg leading-relaxed">
              Sixty seconds - name, contact, profile. We'll text the second the schedule drops in August.
            </p>
            {/* Equal-width CTA pair — same grid system as the hero pair. */}
            <div className="mt-8 grid w-full max-w-[22rem] grid-cols-1 gap-3 md:w-fit md:max-w-none md:grid-flow-col md:auto-cols-fr">
              {/* Primary final CTA — magnetic. Real <Link> inside stays intact. */}
              <Magnetic strength={18} innerStrength={5} className="w-full">
                <Button asChild size="xl" variant="secondary" className="group cta-shine press w-full">
                  <Link href={cfg["hero.cta.href"] || "#register"}>
                    Sign me up
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </Button>
              </Magnetic>
              <Magnetic strength={10} innerStrength={3} className="w-full">
                <Button asChild size="xl" variant="outline" className="w-full border-white/40 text-white bg-white/5 hover:bg-white/15 hover:text-white press">
                  <Link href={cleanUrl(cfg["contact.instagramUrl"])} target="_blank">
                    <Instagram className="h-4 w-4" aria-hidden="true" /> Follow us
                  </Link>
                </Button>
              </Magnetic>
            </div>
          </div>
        </Reveal>
      </section>
      </>
    ),
  };
}
