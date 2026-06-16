import React from "react";
import Link from "next/link";
import { Crest } from "@/components/brand/wordmark";
import {
  TypewriterCycle, Tilt3DCard, Magnetic, Parallax, FloatingOrbs, Spotlight, Grain,
} from "@/components/site/anim";
import {
  IconPin, IconInstagram as IconInstagramDuo, IconBolt,
  IconShieldCheck as IconShieldCheckDuo,
} from "@/components/brand/icons/chapter";
import { RushCountdown } from "@/components/site/rush-countdown";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cleanUrl, titleCaseAddress } from "@/lib/utils";
import { FloatingSymbols } from "@/components/site/floating-symbols";
import type { SectionContext } from "./types";
import {
  BRAND_ORB_COLORS, BRAND_TILT_GLOW, BrandShimmer, PostTile, iconFor,
} from "./helpers";

/**
 * HeroClassic — the original Crest hero (the AnimatedBackground aurora block).
 * Moved here VERBATIM from chapter-landing.tsx's inline `hero:` sectionMap entry
 * so it is visually identical to the pre-generator build. It is the default
 * (cfg["website.template"] === "classic") and the fallback for any unknown
 * template value, so an un-customized / apex chapter renders byte-identical.
 */
export function HeroClassic(ctx: SectionContext): React.ReactNode {
  const {
    cfg, identity, terms, nextEvent,
    heroEyebrow, heroLead, heroTail, heroHighlight, heroHighlightPhrases,
  } = ctx;
  return (
    <>
      {/* AnimatedBackground (tone="brand") paints drifting aurora blobs in the
          chapter color behind the hero; it renders a relative, isolated,
          overflow-hidden box, so it stands in for the old hero <section>. The
          gradient + dot-grid + floating glyphs layer underneath via negative z. */}
      <AnimatedBackground variant="aurora" tone="brand" className="overflow-hidden">
        <div className="absolute inset-0 -z-30 bg-gradient-to-br from-phisig-red-soft via-white to-phisig-red-soft/40" aria-hidden />
        <div className="absolute inset-0 -z-20 bg-dot-grid opacity-30" aria-hidden />
        {/* Soft top vignette so the nav reads cleanly over the aurora wash */}
        <div className="absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-white/70 to-transparent" aria-hidden />
        <FloatingSymbols
          greekLettersGlyphs={identity.greekLettersGlyphs}
          fraternityLetters={identity.fraternityLetters}
        />
        {/* Drifting brand-colored orbs for an "alive" depth layer behind the
            hero copy. Tinted to THIS chapter's brand (never platform indigo);
            decorative (aria-hidden + pointer-events-none) and reduced-motion
            safe inside the primitive. */}
        <FloatingOrbs colors={BRAND_ORB_COLORS} blur={100} className="-z-10 opacity-70" />
        {/* Tactile film-grain over the aurora wash for a premium, printed-poster
            depth. Static (no motion), self-contained data-URI, decorative. */}
        <Grain className="-z-10" opacity={0.05} />
        {/* Cursor-tracked brand spotlight — a soft radial glow in the CHAPTER
            color that follows the pointer across the hero for interactive depth.
            Fine-pointer-only + reduced-motion-safe (renders nothing on touch),
            so it never costs a phone user anything. Brand-tinted, never blue. */}
        <Spotlight
          size={520}
          color="hsl(var(--primary) / 0.16)"
          edgeColor="hsl(var(--primary) / 0.07)"
          className="-z-10"
        />
        {/* Faint brand-tinted grid that parallaxes on scroll for real depth.
            Masked to fade at the edges so it never competes with the headline. */}
        <Parallax
          aria-hidden="true"
          translateY={64}
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--primary)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.05)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_at_50%_30%,black_20%,transparent_70%)]"
        >
          <span />
        </Parallax>
        {/* Floating hero shield — the chapter's OWN brand-tinted Crest (SVG,
            recolors per-tenant via --brand-primary), not a static Phi-Sig-red
            PNG. Given a glassmorphic 3D treatment: a frosted brand-glow disc
            behind it, a soft orbit drift, and a deep brand drop-shadow so it
            reads as a premium 3D mark hovering in the hero for ANY chapter. */}
        <div className="absolute right-[7%] top-[9%] -z-10 hidden md:block animate-float [animation-delay:1s] select-none pointer-events-none">
          <div className="relative h-[360px] w-[360px] animate-orbit-slow" style={{ animationDuration: "45s" }}>
            {/* Frosted brand-glow halo behind the shield */}
            <div
              aria-hidden="true"
              className="absolute inset-[8%] rounded-[42%] bg-[radial-gradient(circle_at_35%_30%,hsl(var(--primary)/0.32),hsl(var(--primary)/0.10)_55%,transparent_72%)] blur-2xl"
            />
            <div
              aria-hidden="true"
              className="absolute inset-[14%] rounded-[40%] border border-white/40 bg-white/30 backdrop-blur-md shadow-[0_30px_70px_-20px_hsl(var(--primary)/0.45)]"
            />
            <Crest className="absolute inset-[18%] h-[64%] w-[64%] drop-shadow-[0_18px_40px_hsl(var(--primary)/0.40)]" />
          </div>
        </div>

        <div className="container section-y">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14 items-center">
            <div className="max-w-2xl animate-slide-up">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-phisig-red/20 bg-white/95 backdrop-blur px-3 py-1 text-xs font-medium text-phisig-red shadow-sm animate-heartbeat">
                <span className="h-1.5 w-1.5 rounded-full bg-phisig-red animate-pulse" />
                {heroEyebrow}
              </span>
              <RushCountdown
                startsAt={nextEvent ? nextEvent.startsAt.toISOString() : null}
                endsAt={nextEvent?.endsAt ? nextEvent.endsAt.toISOString() : null}
                eventName={nextEvent ? nextEvent.name : null}
                eventLocation={nextEvent ? nextEvent.location : null}
              />
            </div>
            <h1 className="mt-5 text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] [text-wrap:balance]">
              {heroLead}{" "}<br className="hidden sm:block" />
              {heroTail}{" "}
              <span className="relative inline-block text-phisig-red">
                {/* Kinetic highlight: types through rush value-props then settles
                    on the real highlight word. SSR/first-paint = the real word
                    (LCP-safe), brand-colored caret. */}
                <TypewriterCycle
                  phrases={heroHighlightPhrases}
                  settleText={heroHighlight}
                  ssrText={heroHighlight}
                  caretClassName="bg-phisig-red"
                />
                {/* Hand-drawn brand underline that scales with the word */}
                <span
                  className="absolute -bottom-1 left-0 h-[0.18em] w-full rounded-full bg-gradient-to-r from-phisig-red to-phisig-red-dark opacity-70"
                  aria-hidden="true"
                />
              </span>.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
              {cfg["hero.subline"]}
            </p>
            {/* Equal-width CTA pair (owner round-5): stacked (<md) both fill
                the same max-w-[22rem] column; in a row (md+) the w-fit grid +
                auto-cols-fr sizes BOTH columns to the wider button. */}
            <div className="mt-7 grid w-full max-w-[22rem] grid-cols-1 items-center gap-3 md:w-fit md:max-w-none md:grid-flow-col md:auto-cols-fr">
              {/* Primary rush CTA — magnetic pull toward the cursor, now ringed
                  by a slow CHAPTER-brand shimmer (BrandShimmer) that blooms on
                  hover so the conversion action glows. The real <Link> stays
                  focusable/navigable inside; both magnetism and the shimmer spin
                  are inert for keyboard + reduced-motion users. */}
              <Magnetic strength={16} innerStrength={5} className="w-full">
                <BrandShimmer className="w-full rounded-full">
                  <Button asChild variant="gradient" size="xl" className="group cta-shine press w-full">
                    <Link href={cfg["hero.cta.href"] || "#register"}>
                      {cfg["hero.cta.label"] || "Get on the interest list"}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                  </Button>
                </BrandShimmer>
              </Magnetic>
              <Magnetic strength={10} innerStrength={3} className="w-full">
                <Button asChild variant="outline" size="xl" className="press w-full bg-white/70 backdrop-blur">
                  <Link href="#about">About the chapter</Link>
                </Button>
              </Magnetic>
            </div>

            {/* Credibility row — upgraded from flat translucent pills to frosted
                glass chips (.gs-glass) with custom brand duotone icons. Each
                lifts a hair on hover for a tactile, premium micro-interaction.
                The icons inherit the chapter color via text-phisig-red. */}
            <div className="mt-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="gs-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-phisig-red/90 transition-transform duration-300 hover:-translate-y-0.5">
                <IconPin className="h-3.5 w-3.5 text-phisig-red" /> <span className="text-foreground/80">{titleCaseAddress(cfg["contact.address"])}, {titleCaseAddress(cfg["contact.cityState"])}</span>
              </span>
              <span className="gs-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-phisig-red/90 transition-transform duration-300 hover:-translate-y-0.5">
                <IconBolt className="h-3.5 w-3.5 text-phisig-red" /> <span className="text-foreground/80">Reply within 24 hours</span>
              </span>
              <span className="gs-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-phisig-red/90 transition-transform duration-300 hover:-translate-y-0.5">
                <IconShieldCheckDuo className="h-3.5 w-3.5 text-phisig-red" /> <span className="text-foreground/80">{identity.greekLetters} chapter</span>
              </span>
              <Link
                href={cleanUrl(cfg["contact.instagramUrl"])}
                target="_blank"
                rel="noreferrer noopener"
                className="group/ig inline-flex items-center gap-1.5 rounded-full border border-phisig-red/25 bg-phisig-red-soft/60 px-3 py-1.5 font-medium text-phisig-red backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-phisig-red-soft hover:shadow-md hover:shadow-phisig-red/15"
              >
                <IconInstagramDuo className="h-3.5 w-3.5 text-phisig-red transition-transform duration-300 group-hover/ig:scale-110" /> {cfg["contact.instagramHandle"]}
              </Link>
            </div>
            </div>

            {/* Hero photo collage — real chapter posts via Instagram embed.
                The grid tilts in 3D toward the cursor with a brand-colored
                glow; the "Since {year}" badge stays pinned outside the tilt. */}
            <div className="relative animate-slide-up [animation-delay:200ms]">
              <Tilt3DCard max={7} glareColor={BRAND_TILT_GLOW} className="rounded-2xl gs-float-shadow">
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:gap-4">
                  <PostTile
                    slug={cfg["hero.tile1.slug"]}
                    caption={cfg["hero.tile1.caption"]}
                    icon={iconFor(cfg["hero.tile1.icon"])}
                    className="col-span-2 aspect-[4/5] sm:aspect-[4/4]"
                    priority
                  />
                  <PostTile
                    slug={cfg["hero.tile2.slug"]}
                    caption={cfg["hero.tile2.caption"] || terms.collective}
                    icon={iconFor(cfg["hero.tile2.icon"])}
                    className="aspect-square"
                  />
                  <PostTile
                    slug={cfg["hero.tile3.slug"]}
                    caption={cfg["hero.tile3.caption"]}
                    icon={iconFor(cfg["hero.tile3.icon"])}
                    className="aspect-square"
                  />
                </div>
              </Tilt3DCard>
              <div className="absolute -right-4 -top-4 hidden lg:flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shadow-xl shadow-phisig-red/40 ring-4 ring-white/80 z-10 pointer-events-none animate-float">
                <span className="text-center leading-tight">
                  <span className="block text-[9px] uppercase tracking-[0.16em] opacity-80">Since</span>
                  <span className="block text-base font-semibold">{identity.foundingYear}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Bouncing scroll cue — invites the rushee down into the page.
              Decorative chevron is aria-hidden; the link itself is a real
              in-page anchor for keyboard users. */}
          <div className="mt-12 flex justify-center animate-slide-up [animation-delay:480ms]">
            <Link
              href="#register"
              aria-label="Scroll to the rush sign-up form"
              className="group inline-flex flex-col items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-phisig-red"
            >
              <span className="uppercase tracking-[0.18em]">Scroll</span>
              <ChevronDown className="h-5 w-5 animate-bounce" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </AnimatedBackground>
    </>
  );
}
