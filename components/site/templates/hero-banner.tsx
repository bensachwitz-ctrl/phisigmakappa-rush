import React from "react";
import Link from "next/link";
import { Crest } from "@/components/brand/wordmark";
import {
  TypewriterCycle, Magnetic, FloatingOrbs, Grain,
} from "@/components/site/anim";
import {
  IconPin, IconInstagram as IconInstagramDuo, IconShieldCheck as IconShieldCheckDuo,
} from "@/components/brand/icons/chapter";
import { RushCountdown } from "@/components/site/rush-countdown";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cleanUrl, titleCaseAddress } from "@/lib/utils";
import { FloatingSymbols } from "@/components/site/floating-symbols";
import type { SectionContext } from "./types";
import { BRAND_ORB_COLORS, BrandShimmer } from "./helpers";

/**
 * HeroBanner — the "Bold Banner" template hero.
 *
 * A full-bleed banner: when cfg["brand.heroImageUrl"] is set it renders the
 * chapter photo edge-to-edge behind a deep brand scrim; otherwise it falls back
 * to the brand gradient + a large, low-opacity Crest watermark (reusing the same
 * PostTile empty-state treatment — never another chapter's photo). The headline
 * is centered with a GOLD-gradient highlight word (the secondary brand color via
 * the `text-brand-secondary` token) so the Bold template carries a high-contrast,
 * poster-like signature. No new section component is introduced; the section
 * bodies below it are the SHARED buildSectionMap renderers (Bold only swaps the
 * hero, the default order, and a few thin per-section variant classes).
 */
export function HeroBanner(ctx: SectionContext): React.ReactNode {
  const {
    cfg, identity, nextEvent,
    heroEyebrow, heroLead, heroTail, heroHighlight, heroHighlightPhrases,
  } = ctx;
  const heroImage = (cfg["brand.heroImageUrl"] || "").trim();
  return (
    <section className="relative isolate overflow-hidden text-white">
      {/* ── Full-bleed background ───────────────────────────────────────────
          Photo (edge-to-edge) under a deep brand scrim, OR the brand gradient
          with a large Crest watermark when no photo is configured. */}
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
          {/* Deep brand scrim so the centered white headline reads over any photo. */}
          <div className="absolute inset-0 -z-20 bg-gradient-to-b from-phisig-red-dark/85 via-phisig-red/70 to-phisig-red-dark/90" aria-hidden />
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(120%_90%_at_50%_0%,transparent_30%,rgba(0,0,0,0.45)_100%)]" aria-hidden />
        </>
      ) : (
        <>
          <div className="absolute inset-0 -z-30 bg-gradient-to-br from-phisig-red via-phisig-red-dark to-phisig-red-dark" aria-hidden />
          {/* Large brand-tinted Crest watermark — the same designed empty-state
              treatment PostTile uses when a chapter has no photo. */}
          <div className="pointer-events-none absolute inset-0 -z-20 flex items-center justify-center" aria-hidden>
            <Crest className="h-[120%] w-auto text-white/[0.06]" />
          </div>
          <div className="absolute inset-0 -z-20 bg-dot-grid opacity-10" aria-hidden />
        </>
      )}
      <FloatingSymbols
        greekLettersGlyphs={identity.greekLettersGlyphs}
        fraternityLetters={identity.fraternityLetters}
        schoolNames={[identity.schoolShort || identity.schoolName].filter(Boolean)}
      />
      <FloatingOrbs colors={BRAND_ORB_COLORS} blur={120} className="-z-10 opacity-40" />
      <Grain className="-z-10" opacity={0.05} />
      {/* GOLD top + bottom rules — the secondary accent framing the banner. */}
      <div className="absolute inset-x-0 top-0 -z-10 h-1.5 bg-brand-secondary" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1.5 bg-brand-secondary/70" aria-hidden />

      <div className="container section-y">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-secondary/50 bg-black/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
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
          <h1 className="mt-6 text-5xl font-bold leading-[0.92] tracking-tight [text-wrap:balance] drop-shadow-sm sm:text-7xl lg:text-8xl animate-slide-up [animation-delay:80ms]">
            {heroLead}{" "}<br className="hidden sm:block" />
            {heroTail}{" "}
            {/* GOLD-gradient highlight word — the secondary brand color carries
                the Bold template's headline. */}
            <span className="relative inline-block bg-gradient-to-r from-brand-secondary to-brand-secondary bg-clip-text text-transparent [-webkit-text-fill-color:transparent]">
              <TypewriterCycle
                phrases={heroHighlightPhrases}
                settleText={heroHighlight}
                ssrText={heroHighlight}
                caretClassName="bg-brand-secondary"
              />
            </span>.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg animate-slide-up [animation-delay:160ms]">
            {cfg["hero.subline"]}
          </p>
          <div className="mt-8 grid w-full max-w-[24rem] grid-cols-1 items-center gap-3 sm:w-fit sm:max-w-none sm:grid-flow-col sm:auto-cols-fr animate-slide-up [animation-delay:240ms]">
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
              <Button asChild variant="outline" size="xl" className="press w-full border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link href="#about">About the chapter</Link>
              </Button>
            </Magnetic>
          </div>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-2 text-xs text-white/80 animate-slide-up [animation-delay:320ms]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/20 px-3 py-1.5 backdrop-blur transition-transform duration-300 hover:-translate-y-0.5">
              <IconPin className="h-3.5 w-3.5 text-brand-secondary" /> <span>{titleCaseAddress(cfg["contact.address"])}, {titleCaseAddress(cfg["contact.cityState"])}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/20 px-3 py-1.5 backdrop-blur transition-transform duration-300 hover:-translate-y-0.5">
              <IconShieldCheckDuo className="h-3.5 w-3.5 text-brand-secondary" /> <span>{identity.greekLetters} chapter</span>
            </span>
            <Link
              href={cleanUrl(cfg["contact.instagramUrl"])}
              target="_blank"
              rel="noreferrer noopener"
              className="group/ig inline-flex items-center gap-1.5 rounded-full border border-brand-secondary/40 bg-brand-secondary/15 px-3 py-1.5 font-medium text-white backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-secondary/25"
            >
              <IconInstagramDuo className="h-3.5 w-3.5 text-brand-secondary transition-transform duration-300 group-hover/ig:scale-110" /> {cfg["contact.instagramHandle"]}
            </Link>
          </div>

          <div className="mt-12 flex justify-center animate-slide-up [animation-delay:420ms]">
            <Link
              href="#register"
              aria-label="Scroll to the rush sign-up form"
              className="group inline-flex flex-col items-center gap-1 text-xs font-medium text-white/75 transition-colors hover:text-white"
            >
              <span className="uppercase tracking-[0.18em]">Scroll</span>
              <ChevronDown className="h-5 w-5 animate-bounce" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
