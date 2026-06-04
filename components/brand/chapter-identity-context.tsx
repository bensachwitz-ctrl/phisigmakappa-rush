"use client";

import React, { createContext, useContext } from "react";
import type { ChapterIdentity } from "@/lib/chapter-identity";

// Context fallback only — every real render is wrapped by ChapterIdentityProvider
// in app/layout.tsx with the per-tenant (or APEX) identity. These reference
// values are a fraternity, so the default carries the fraternity term set.
// NOTE: keep this a TYPE-only import of ChapterIdentity — pulling a runtime value
// from lib/chapter-identity into this "use client" module would drag its
// getSiteConfig→Prisma import graph into the client bundle. The fraternity term
// set is therefore inlined here rather than calling termsForOrgType().
const defaultIdentity: ChapterIdentity = {
  fraternityName: "Phi Sigma Kappa",
  fraternityShort: "Phi Sig",
  orgType: "fraternity",
  terms: {
    member: "Brother", members: "Brothers", collective: "Brotherhood",
    memberLower: "brother", membersLower: "brothers",
    relative: "son", recruit: "Rush",
  },
  greekLetters: "Gamma Triton",
  greekLettersGlyphs: "ΓΤ",
  schoolName: "University of South Carolina",
  schoolShort: "USC",
  schoolUrl: "https://sc.edu",
  charterYear: "1975",
  foundingYear: "1873",
  foundingLocation: "Massachusetts Agricultural College",
  nationalName: "Phi Sigma Kappa",
  nationalHqUrl: "https://phisigmakappa.org",
  cardinalPrinciples: "Brotherhood, Scholarship, Character",
  tagline: "#DamnProud",
  appShortTitle: "Phi Sig USC",
  fraternityLetters: "ΦΣΚ",
  chapterFullName: "Phi Sigma Kappa Gamma Triton",
  chapterAttribution: "Phi Sig USC",
  pageTitle: "Phi Sigma Kappa Gamma Triton — Rush at USC",
  ogAlt: "Phi Sigma Kappa @ USC",
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
