"use client";

// site-icon.tsx — the DATA-DRIVEN glyph renderer for the selectable icon families
// (item 1). The site generator lets a chapter pick ONE icon family; this component
// is the single seam that turns (family, semantic name) into the right glyph from
// the right package, applying that family's ONE standardized strokeWidth so every
// icon on the page reads as one set.
//
// The taste rule (one family per rendered page, no mixing) is enforced structurally:
// a page resolves a single IconFamilyId once (resolveIconFamily / resolveSiteConfig)
// and threads it down, so <SiteIcon> only ever renders that family's glyphs. The
// bespoke `brand` family is the always-available default; the four external
// families are the taste-approved libraries (never lucide as a *selectable* set).
//
// SEMANTIC names (not glyph names) decouple the page from any one library: a
// section asks for "calendar", and each family maps that to its own glyph. Every
// family covers the FULL semantic set below — verified in the unit test — so a
// chosen family never has a hole that would force a mid-page fallback to another
// family (which would break the one-family rule).

import * as React from "react";

// ── brand default: the app's existing chrome set (lucide-backed, bespoke where a
//    hand-tuned glyph exists). `brand.pkg` is null, so this is NOT a *selectable*
//    external library — it is "the app's own set", the offline-safe default. ──
import {
  ArrowRight, ShieldCheck, Star, Calendar, Trophy, GraduationCap, Users,
  MapPin, Heart, Sparkles, Quote, Medal, Home, Instagram, CheckCircle2,
  Mail, Crown, HelpCircle, Flame, Rocket,
} from "lucide-react";

import {
  ArrowRight as PhArrowRight, ShieldCheck as PhShieldCheck, Star as PhStar,
  Calendar as PhCalendar, Trophy as PhTrophy, GraduationCap as PhGraduationCap,
  UsersThree as PhUsers, MapPin as PhMapPin, Heart as PhHeart, Sparkle as PhSparkle,
  Quotes as PhQuotes, Medal as PhMedal, House as PhHouse, InstagramLogo as PhInstagram,
  CheckCircle as PhCheckCircle, Envelope as PhEnvelope, Crown as PhCrown,
  Question as PhQuestion, Flame as PhFlame, RocketLaunch as PhRocket,
} from "@phosphor-icons/react";

import {
  ArrowRight01Icon, Shield01Icon, StarIcon as HugeStar, Calendar01Icon,
  ChampionIcon, Award01Icon, UserGroupIcon, Location01Icon, FavouriteIcon,
  SparklesIcon as HugeSparkles, QuoteDownIcon, Medal01Icon, Home01Icon,
  InstagramIcon as HugeInstagram, CheckmarkCircle01Icon, Mail01Icon, CrownIcon,
  HelpCircleIcon, FireIcon, RocketIcon,
} from "hugeicons-react";

import {
  ArrowRightIcon, LockClosedIcon, StarIcon as RxStar, CalendarIcon, BadgeIcon,
  BackpackIcon, PersonIcon, DrawingPinFilledIcon, HeartIcon, MagicWandIcon,
  QuoteIcon, HomeIcon, InstagramLogoIcon, CheckCircledIcon, EnvelopeClosedIcon,
  StarFilledIcon, QuestionMarkCircledIcon, LightningBoltIcon, RocketIcon as RxRocket,
} from "@radix-ui/react-icons";

import {
  IconArrowRight, IconShieldCheck, IconStar, IconCalendar, IconTrophy, IconSchool,
  IconUsers, IconMapPin, IconHeart, IconSparkles, IconQuote, IconMedal, IconHome,
  IconBrandInstagram, IconCircleCheck, IconMail, IconCrown, IconHelp, IconFlame,
  IconRocket,
} from "@tabler/icons-react";

import {
  type IconFamilyId,
  resolveIconFamily,
  iconStrokeWidth,
} from "@/lib/site-generator/icon-families";

/**
 * The stable semantic vocabulary the site chrome asks for. Adding a name here
 * means adding one glyph per family below — the unit test fails until every
 * family covers it, so a family can never ship a hole.
 */
export type SiteIconName =
  | "arrow-right" | "shield" | "star" | "calendar" | "trophy" | "grad-cap"
  | "users" | "pin" | "heart" | "sparkle" | "quote" | "medal" | "house"
  | "instagram" | "check" | "mail" | "crown" | "help" | "flame" | "rocket";

type Glyph = React.ComponentType<any>;

/**
 * The per-family glyph tables. Each family covers the WHOLE SiteIconName union
 * (Radix, the minimal solid set, substitutes its nearest glyph where it has no
 * exact match — e.g. a lock for "shield", a badge for "trophy" — so it still reads
 * as one coherent Radix page rather than falling through to another family).
 */
const FAMILY_GLYPHS: Record<IconFamilyId, Record<SiteIconName, Glyph>> = {
  brand: {
    "arrow-right": ArrowRight, shield: ShieldCheck, star: Star, calendar: Calendar,
    trophy: Trophy, "grad-cap": GraduationCap, users: Users, pin: MapPin, heart: Heart,
    sparkle: Sparkles, quote: Quote, medal: Medal, house: Home, instagram: Instagram,
    check: CheckCircle2, mail: Mail, crown: Crown, help: HelpCircle, flame: Flame, rocket: Rocket,
  },
  phosphor: {
    "arrow-right": PhArrowRight, shield: PhShieldCheck, star: PhStar, calendar: PhCalendar,
    trophy: PhTrophy, "grad-cap": PhGraduationCap, users: PhUsers, pin: PhMapPin, heart: PhHeart,
    sparkle: PhSparkle, quote: PhQuotes, medal: PhMedal, house: PhHouse, instagram: PhInstagram,
    check: PhCheckCircle, mail: PhEnvelope, crown: PhCrown, help: PhQuestion, flame: PhFlame, rocket: PhRocket,
  },
  hugeicons: {
    "arrow-right": ArrowRight01Icon, shield: Shield01Icon, star: HugeStar, calendar: Calendar01Icon,
    trophy: ChampionIcon, "grad-cap": Award01Icon, users: UserGroupIcon, pin: Location01Icon, heart: FavouriteIcon,
    sparkle: HugeSparkles, quote: QuoteDownIcon, medal: Medal01Icon, house: Home01Icon, instagram: HugeInstagram,
    check: CheckmarkCircle01Icon, mail: Mail01Icon, crown: CrownIcon, help: HelpCircleIcon, flame: FireIcon, rocket: RocketIcon,
  },
  radix: {
    "arrow-right": ArrowRightIcon, shield: LockClosedIcon, star: RxStar, calendar: CalendarIcon,
    trophy: BadgeIcon, "grad-cap": BackpackIcon, users: PersonIcon, pin: DrawingPinFilledIcon, heart: HeartIcon,
    sparkle: MagicWandIcon, quote: QuoteIcon, medal: BadgeIcon, house: HomeIcon, instagram: InstagramLogoIcon,
    check: CheckCircledIcon, mail: EnvelopeClosedIcon, crown: StarFilledIcon, help: QuestionMarkCircledIcon,
    flame: LightningBoltIcon, rocket: RxRocket,
  },
  tabler: {
    "arrow-right": IconArrowRight, shield: IconShieldCheck, star: IconStar, calendar: IconCalendar,
    trophy: IconTrophy, "grad-cap": IconSchool, users: IconUsers, pin: IconMapPin, heart: IconHeart,
    sparkle: IconSparkles, quote: IconQuote, medal: IconMedal, house: IconHome, instagram: IconBrandInstagram,
    check: IconCircleCheck, mail: IconMail, crown: IconCrown, help: IconHelp, flame: IconFlame, rocket: IconRocket,
  },
};

/** Every semantic name the renderer knows — the single source the tests iterate. */
export const SITE_ICON_NAMES = Object.keys(FAMILY_GLYPHS.brand) as SiteIconName[];

/**
 * Look up the concrete glyph component for a (family, name). Always defined:
 * every family covers the full semantic set. Exported for the picker preview +
 * the unit test that proves there are no holes.
 */
export function glyphFor(family: string | null | undefined, name: SiteIconName): Glyph {
  return FAMILY_GLYPHS[resolveIconFamily(family)][name];
}

export interface SiteIconProps {
  /** Selected icon family (coerced to a valid one; unknown → bespoke default). */
  family: string | null | undefined;
  /** Semantic icon to draw. */
  name: SiteIconName;
  className?: string;
  /** Accessible label; omitted → aria-hidden (decorative, the common case). */
  title?: string;
}

/**
 * Render one glyph from the chosen family. Applies the family's STANDARDIZED
 * strokeWidth (solid families → no stroke prop) so every icon on the page shares
 * one weight. Stroke families accept a numeric `strokeWidth`; Radix (solid, 15px)
 * ignores it. Size comes from the `className` height/width utilities, as today.
 */
export function SiteIcon({ family, name, className, title }: SiteIconProps): React.ReactElement {
  const Glyph = glyphFor(family, name);
  const stroke = iconStrokeWidth(family);
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": true };
  return (
    <Glyph
      className={className}
      {...(stroke !== null ? { strokeWidth: stroke } : {})}
      {...a11y}
    />
  );
}
