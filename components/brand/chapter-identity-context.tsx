"use client";

import React, { createContext, useContext } from "react";
import type { ChapterIdentity } from "@/lib/chapter-identity";

// Context fallback only — every real render is wrapped by ChapterIdentityProvider
// in app/layout.tsx with the per-tenant (or APEX) identity. These are NEUTRAL,
// brand-less placeholders (never a specific chapter) that mirror the server-side
// neutral fallbacks in lib/chapter-identity.ts `fromCfg`, so even if a client
// component ever read this outside the provider it could not leak one chapter's
// brand onto another. Defaults to the fraternity term set (matching the server's
// `chapter.orgType || "fraternity"` default).
// NOTE: keep this a TYPE-only import of ChapterIdentity — pulling a runtime value
// from lib/chapter-identity into this "use client" module would drag its
// getSiteConfig→Prisma import graph into the client bundle. The fraternity term
// set is therefore inlined here rather than calling termsForOrgType().
const defaultIdentity: ChapterIdentity = {
  fraternityName: "Your Chapter",
  fraternityShort: "Your Chapter",
  orgType: "fraternity",
  terms: {
    member: "Brother", members: "Brothers", collective: "Brotherhood",
    memberLower: "brother", membersLower: "brothers",
    relative: "son", recruit: "Rush",
  },
  greekLetters: "",
  greekLettersGlyphs: "",
  schoolName: "",
  schoolShort: "",
  schoolUrl: "",
  charterYear: "",
  foundingYear: "",
  foundingLocation: "",
  nationalName: "Your Chapter",
  nationalHqUrl: "",
  cardinalPrinciples: "",
  tagline: "",
  appShortTitle: "Your Chapter",
  fraternityLetters: "",
  timeZone: "America/New_York",
  chapterFullName: "Your Chapter",
  chapterAttribution: "Your Chapter",
  pageTitle: "Your Chapter",
  ogAlt: "Your Chapter",
};

const ChapterIdentityContext = createContext<ChapterIdentity>(defaultIdentity);

export function ChapterIdentityProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ChapterIdentity;
}) {
  return (
    <ChapterIdentityContext.Provider value={value}>
      {children}
    </ChapterIdentityContext.Provider>
  );
}

export function useChapterIdentity() {
  return useContext(ChapterIdentityContext);
}
