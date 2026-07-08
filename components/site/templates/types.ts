import type React from "react";
import type { ChapterIdentity, ChapterTerms } from "@/lib/chapter-identity";
import type { FeedPost } from "@/components/site/instagram-feed";
import type { FormFieldConfig } from "@/lib/rush-form-config";

/**
 * The three chapter-site templates. The renderer
 * (components/site/chapter-landing.tsx) reads cfg["website.template"] and picks
 * the matching hero variant + default section order; the 15 SECTION BODIES are
 * SHARED across all three (see buildSectionMap). "classic" is the original
 * Crest-hero layout and is visually identical to the pre-generator build.
 */
export type TemplateId = "classic" | "modern" | "bold";

/** Repeater row shapes for the admin-editable content arrays. */
export type ValueRow = { icon: string; title: string; body: string };
export type TimelineRow = { week: string; title: string; body: string };
export type FaqRow = { q: string; a: string };
export type HighlightRow = { icon: string; label: string };
export type RecentRow = { tag: string; title: string; icon: string };

export type StatRow = {
  num: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
  icon: React.ElementType;
  sub?: string;
};

export type EboardMember = {
  name: string;
  role: string;
  headshotUrl: string;
};

export type NextEvent = {
  startsAt: Date;
  endsAt: Date | null;
  name: string;
  location: string | null;
} | null;

/**
 * SectionContext — every local value the section renderers + hero variants need.
 *
 * The original sectionMap was a Record built INLINE inside ChapterLandingPage(),
 * so each entry closed over these locals. To make the section bodies and the
 * three hero variants live in their own modules (and to let a template swap only
 * the hero + section order), those closure variables are threaded through this
 * one explicit context object. `tsc --noEmit` is the proof the plumbing is
 * complete: any field a section needs that's missing here is a compile error.
 */
export interface SectionContext {
  /** The active template — section bodies read this for thin layout variant hints. */
  template: TemplateId;
  cfg: Record<string, string>;
  identity: ChapterIdentity;
  terms: ChapterTerms;
  isPhiSig: boolean;
  booth: boolean;

  stats: StatRow[];
  eboard: EboardMember[];
  VALUES: ValueRow[];
  TIMELINE: TimelineRow[];
  FAQ: FaqRow[];
  HIGHLIGHTS: HighlightRow[];
  RECENT: RecentRow[];
  FEED: FeedPost[];

  nextEvent: NextEvent;
  webcalUrl: string;
  termLabelShort: string;
  termLabelLong: string;
  customQuestions: FormFieldConfig[];

  heroEyebrow: string;
  heroLead: string;
  heroTail: string;
  heroHighlight: string;
  heroHighlightPhrases: string[];
}
