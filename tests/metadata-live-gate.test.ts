import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// METADATA go-live gate. iteration-2 gated public-page BODIES (chapterLiveGate),
// but generateMetadata() runs as a SEPARATE App Router execution path and still
// emitted the chapter's greek-letter identity (and, on alumni/[id], an opted-in
// alum's name + grad year) into <title>/<meta> for a suspended / pending-billing
// chapter. chapterLiveMetadataGate() is the generateMetadata sibling of
// chapterLiveGate() that neutralises that head. These pin the pure gate, prove
// three representative pages' generateMetadata go NEUTRAL when the chapter is dark
// (and keep their real identity when live), and source-pin that every
// identity-derived generateMetadata (pages + the root-layout backstop) wires it.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  getSubdomain: vi.fn(),
  getRegistrySubdomain: vi.fn(),
  isTenantActive: vi.fn(),
  siteConfigFindUnique: vi.fn(),
  alumniFindUnique: vi.fn(),
  getSiteConfig: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: () => ({ get: () => "phi-sig.greekstack.vercel.app" }),
}));

vi.mock("@/lib/prisma", () => ({
  getSubdomain: mocks.getSubdomain,
  getRegistrySubdomain: mocks.getRegistrySubdomain,
  isTenantActive: mocks.isTenantActive,
  getTenantClient: () => ({ siteConfig: { findUnique: mocks.siteConfigFindUnique } }),
  prisma: { alumniProfile: { findUnique: mocks.alumniFindUnique } },
}));

vi.mock("@/lib/site-config", () => ({
  getSiteConfig: mocks.getSiteConfig,
}));

// The three page DEFAULT exports (their JSX bodies) are never invoked here — we
// only call each page's exported generateMetadata — but importing the page module
// still eagerly loads its presentational / client imports. Stub them so the test
// stays hermetic and node-safe (no framer-motion / brand-asset / DOM cascade).
vi.mock("@/components/site/nav", () => ({ PublicNav: () => null }));
vi.mock("@/components/site/footer", () => ({ PublicFooter: () => null }));
vi.mock("@/components/ui/button", () => ({ Button: () => null }));
vi.mock("@/components/site/onboarding-form", () => ({ OnboardingForm: () => null }));
vi.mock("@/components/brand/wordmark", () => ({ Wordmark: () => null }));
vi.mock("@/components/brand/icons", () => ({ IconSpark: () => null }));
vi.mock("@/lib/alumni", () => ({ publicAlumniView: (r: unknown) => r }));

import { chapterLiveMetadataGate, NEUTRAL_METADATA } from "@/lib/chapter-live-guard";
import { generateMetadata as onboardMeta } from "@/app/onboard/[token]/page";
import { generateMetadata as pnmMeta } from "@/app/portal/pnm/page";
import { generateMetadata as alumniProfileMeta } from "@/app/alumni/[id]/page";

// Chapter identity — greek letters + school that MUST NOT survive into a dark
// chapter's <head>, and MUST survive for a live one.
const IDENTITY_CFG: Record<string, string> = {
  "chapter.fraternityName": "Phi Sigma Kappa",
  "chapter.fraternityShort": "Phi Sig",
  "chapter.greekLetters": "ΦΣ",
  "chapter.greekLettersGlyphs": "ΦΣ",
  "chapter.schoolShort": "USC",
  "chapter.schoolName": "University of South Carolina",
};

// Any reference-chapter identity that leaking into a dark chapter's head is the bug.
const LEAK = /ΦΣ|Phi Sigma|USC/;

function makeLive() {
  mocks.isTenantActive.mockResolvedValue(true);
}
function makeSuspended() {
  mocks.isTenantActive.mockResolvedValue(false);
  mocks.siteConfigFindUnique.mockResolvedValue({ value: "false" });
}
function makePending() {
  mocks.isTenantActive.mockResolvedValue(false);
  mocks.siteConfigFindUnique.mockResolvedValue({ value: "true" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSubdomain.mockReturnValue("phi_sig");
  mocks.getRegistrySubdomain.mockReturnValue("phi-sig");
  mocks.getSiteConfig.mockResolvedValue(IDENTITY_CFG);
});

describe("chapterLiveMetadataGate (shared metadata go-live decision)", () => {
  it("returns NEUTRAL_METADATA (no greek letters) for a suspended chapter", async () => {
    makeSuspended();
    const meta = await chapterLiveMetadataGate();
    expect(meta).toEqual(NEUTRAL_METADATA);
    expect(JSON.stringify(meta)).not.toMatch(LEAK);
  });

  it("returns NEUTRAL_METADATA for a pending-billing chapter", async () => {
    makePending();
    expect(await chapterLiveMetadataGate()).toEqual(NEUTRAL_METADATA);
  });

  it("returns null on a LIVE chapter (caller keeps its real identity metadata)", async () => {
    makeLive();
    expect(await chapterLiveMetadataGate()).toBeNull();
  });

  it("returns null on the apex (page builds its own apex metadata)", async () => {
    mocks.getSubdomain.mockReturnValue(null);
    expect(await chapterLiveMetadataGate()).toBeNull();
    expect(mocks.isTenantActive).not.toHaveBeenCalled();
  });

  it("NEUTRAL_METADATA is a non-indexable, identity-free Greekstack head", () => {
    // absolute title so the root layout's title.template can't re-append the name.
    expect(NEUTRAL_METADATA.title).toEqual({ absolute: "Greekstack" });
    expect(NEUTRAL_METADATA.robots).toMatchObject({ index: false });
    expect(JSON.stringify(NEUTRAL_METADATA)).not.toMatch(LEAK);
  });
});

describe("onboard/[token] generateMetadata", () => {
  it("goes NEUTRAL (no greekLetters in <title>) for a suspended chapter", async () => {
    makeSuspended();
    const meta = await onboardMeta();
    expect(meta).toEqual(NEUTRAL_METADATA);
    expect(JSON.stringify(meta)).not.toMatch(LEAK);
  });
  it("keeps the real chapter identity for a LIVE chapter", async () => {
    makeLive();
    const meta = await onboardMeta();
    expect(JSON.stringify(meta)).toContain("ΦΣ"); // "Welcome to ΦΣ"
  });
});

describe("portal/pnm generateMetadata", () => {
  it("goes NEUTRAL (no greekLetters in tab title / meta) for a suspended chapter", async () => {
    makeSuspended();
    const meta = await pnmMeta();
    expect(meta).toEqual(NEUTRAL_METADATA);
    expect(JSON.stringify(meta)).not.toMatch(LEAK);
  });
  it("keeps the real chapter identity for a LIVE chapter", async () => {
    makeLive();
    const meta = await pnmMeta();
    expect(JSON.stringify(meta)).toContain("ΦΣ");
  });
});

describe("alumni/[id] generateMetadata", () => {
  const PROPS = { params: { id: "alum-1" }, searchParams: {} };

  it("returns neutral BEFORE the profile lookup for a suspended chapter (no alum PII fetched)", async () => {
    makeSuspended();
    const meta = await alumniProfileMeta(PROPS);
    expect(meta).toEqual(NEUTRAL_METADATA);
    // The gate short-circuits before Prisma, so no alum row is ever queried.
    expect(mocks.alumniFindUnique).not.toHaveBeenCalled();
  });

  it("emits the opted-in alum's name + grad year for a LIVE chapter", async () => {
    makeLive();
    mocks.alumniFindUnique.mockResolvedValue({
      id: "alum-1",
      optInDirectory: true,
      preferredName: "Jordan",
      fullName: "Jordan Rivera",
      graduationYear: 2019,
    });
    const meta = await alumniProfileMeta(PROPS);
    expect(mocks.alumniFindUnique).toHaveBeenCalledTimes(1);
    const json = JSON.stringify(meta);
    expect(json).toContain("Jordan");
    expect(json).toContain("2019");
  });
});

describe("every identity-derived generateMetadata wires the metadata gate", () => {
  // Source-pin: an identity-derived generateMetadata (a public page OR the root
  // layout backstop) that forgets chapterLiveMetadataGate is the exact regression
  // this closes — it would re-leak the chapter's <title>/meta for a dark chapter.
  // The layout is included because its title.template + description/OG merge into
  // EVERY page's head (including gated pages that have no generateMetadata of
  // their own), so gating the pages alone would be insufficient.
  const FILES = [
    "app/layout.tsx",
    "app/page.tsx",
    "app/onboard/[token]/page.tsx",
    "app/portal/page.tsx",
    "app/portal/pnm/page.tsx",
    "app/alumni/page.tsx",
    "app/alumni/[id]/page.tsx",
    "app/alumni/join/page.tsx",
    "app/schedule/page.tsx",
    "app/parents/page.tsx",
    "app/privacy/page.tsx",
  ];
  it.each(FILES)("%s imports and calls chapterLiveMetadataGate", (rel) => {
    const src = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
    expect(src.includes("chapter-live-guard"), `${rel} must import the metadata gate`).toBe(true);
    expect(/chapterLiveMetadataGate\s*\(/.test(src), `${rel} must call chapterLiveMetadataGate()`).toBe(true);
  });
});
