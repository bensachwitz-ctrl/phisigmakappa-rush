"use client";

import React, { createContext, useContext } from "react";
import type { ChapterIdentity } from "@/lib/chapter-identity";

const defaultIdentity: ChapterIdentity = {
  fraternityName: "Phi Sigma Kappa",
  fraternityShort: "Phi Sig",
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
