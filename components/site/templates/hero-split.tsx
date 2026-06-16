import React from "react";
import Link from "next/link";
import {
  TypewriterCycle, Tilt3DCard, Magnetic, FloatingOrbs, Grain,
} from "@/components/site/anim";
import {
  IconPin, IconInstagram as IconInstagramDuo, IconBolt,
  IconShieldCheck as IconShieldCheckDuo,
} from "@/components/brand/icons/chapter";
import { RushCountdown } from "@/components/site/rush-countdown";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cleanUrl, titleCaseAddress } from "@/lib/utils";
import { FloatingSymbols } from "@/components/site/floating-symbols";
import type { SectionContext } from "./types";
import {
  BRAND_ORB_COLORS, BRAND_TILT_GLOW, BrandShimmer, PostTile, iconFor,
} from "./helpers";

/**
 * HeroSplit — the "Modern Split" template hero.
 *
 * An asymmetric two-column layout (copy left, IG collage right) over a clean
 * light surface, with a GOLD accent band driven by cfg["brand.secondaryHex"]
 * (the `bg-brand-secondary` / `text-brand-secondary` tokens — see tailwind
 * config). When cfg["brand.heroImageUrl"] is set, it renders full-bleed behind
 * the copy with a brand-tinted scrim; otherwise the surface is the brand soft
 * wash. Reuses the SAME PostTile collage + Tilt3DCard as the classic hero, so
 * no new section component is introduced.
 */
export function HeroSplit(ctx: SectionContext): React.ReactNode {
  const {
    cfg, identity, terms, nextEvent,
    heroEyebrow, heroLead, heroTail, heroHighlight, heroHighlightPhrases,
  } = ctx;
  const heroImage = (cfg["brand.heroImageUrl"] || "").trim();
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Base surface: brand soft wash (no photo) or the chapter hero photo. */}
      {heroImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-30 h-full w-full object-cover"
            loading="eager"
            decoding="async"
          />
          {/* Brand-tinted scrim so the left copy stays readable over any photo. */}
          <div className="absolute inset-0 -z-20 bg-gradient-to-r from-white/95 via-white/85 to-white/30 lg:to-transparent" aria-hidden />
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(120%_120%_at_0%_0%,hsl(var(--primary)/0.10),transparent_55%)]" aria-hidden />
        </>
      ) : (
        <div className="absolute inset-0 -z-30 bg-gradient-to-br from-phisig-red-soft via-white to-phisig-red-soft/30" aria-hidden />
      )}
      <FloatingSymbols
        greekLettersGlyphs={identity.greekLettersGlyphs}
        fraternityLetters={identity.fraternityLetters}
      />
      <FloatingOrbs colors={BRAND_ORB_COLORS} blur={110} className="-z-10 opacity-50" />
      <Grain className="-z-10" opacity={0.04} />
      {/* GOLD accent band — the secondary brand color, the visual signature of
          the Modern template. Pure decoration; sits at the very top edge. */}
      <div className="absolute inset-x-0 top-0 -z-10 h-1.5 bg-brand-secondary/80" aria-hidden />

      <div className="container section-y">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          {/* ── Copy column ───────────────────────────────────────────── */}
          <div className="max-w-2xl animate-slide-up">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-secondary/40 bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-phisig-red shadow-sm backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-secondary" />
                {heroEyebrow}
              </span>
              <RushCountdown
                startsAt={nextEvent ? nextEvent.startsAt.toISOString() : null}
                endsAt={nextEvent?.endsAt ? nextEvent.endsAt.toISOString() : null}
                eventName={nextEvent ? nextEvent.name : null}
                eventLocation={nextEvent ? nextEvent.location : null}
              />
            </div>
            <h1 className="mt-5 text-4xl font-bold leading-[0.95] tracking-tight [text-wrap:balance] sm:text-6xl lg:text-7xl">
              {heroLead}{" "}<br className="hidden sm:block" />
              {heroTail}{" "}
              <span className="relative inline-block text-phisig-red">
                <TypewriterCycle
                  phrases={heroHighlightPhrases}
                  settleText={heroHighlight}
                  ssrText={heroHighlight}
                  caretClassName="bg-phisig-red"
                />
                {/* Modern underline uses the GOLD accent so the headline carries
                    the secondary brand color. */}
                <span
                  className="absolute -bottom-1 left-0 h-[0.16em] w-full rounded-full bg-brand-secondary opacity-80"
                  aria-hidden="true"
                />
              </span>.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {cfg["hero.subline"]}
            </p>
            <div className="mt-7 grid w-full max-w-[22rem] grid-cols-1 items-center gap-3 md:w-fit md:max-w-none md:grid-flow-col md:auto-cols-fr">
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
                className="group/ig inline-flex items-center gap-1.5 rounded-full border border-brand-secondary/30 bg-brand-secondary/10 px-3 py-1.5 font-medium text-phisig-red backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-secondary/20"
              >
                <IconInstagramDuo className="h-3.5 w-3.5 text-phisig-red transition-transform duration-300 group-hover/ig:scale-110" /> {cfg["contact.instagramHandle"]}
              </Link>
            </div>
          </div>

          {/* ── Collage column (reuses the classic PostTile grid) ─────── */}
          <div className="relative animate-slide-up [animation-delay:160ms]">
            <Tilt3DCard max={7} glareColor={BRAND_TILT_GLOW} className="rounded-2xl gs-float-shadow">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:gap-4">
                <PostTile
                  slug={cfg["hero.tile1.slug"]}
                  caption={cfg["hero.tile1.caption"]}
                  icon={iconFor(cfg["hero.tile1.icon"])}
                  className="col-span-2 aspect-[4/3]"
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
            {/* GOLD "Since {year}" badge — the secondary accent, pinned outside
                the tilt. */}
            <div className="pointer-events-none absolute -left-4 -top-4 z-10 hidden h-20 w-20 animate-float items-center justify-center rounded-full bg-brand-secondary text-maroon-950 shadow-xl ring-4 ring-white/80 lg:flex">
              <span className="text-center leading-tight">
                <span className="block text-[9px] uppercase tracking-[0.16em] opacity-80">Since</span>
                <span className="block text-base font-semibold">{identity.foundingYear}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 flex justify-center animate-slide-up [animation-delay:420ms]">
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
    </section>
  );
}
