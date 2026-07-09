import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// ROOT-LAYOUT go-live gate (iteration-3, sibling of metadata-live-gate).
// Commit b7659fa gated every generateMetadata (pages + the root layout) so a
// suspended / pending-billing chapter no longer leaks its identity through
// <title>/<meta>. But app/layout.tsx carries TWO MORE same-class identity
// signals on SEPARATE App Router execution paths that generateMetadata's gate
// never touched:
//   (1) buildStructuredData() renders a chapter-identity JSON-LD
//       <script type="application/ld+json"> into <head>.
//   (2) generateViewport() paints the tenant brand themeColor into the iOS
//       status-bar / PWA chrome.
// Both now read chapterLiveState() and go NEUTRAL (platform "Greekstack") for a
// dark chapter, byte-identical to today for a LIVE one. This suite drives both
// paths at runtime (not a source-pin) so a regression that re-leaks either is
// caught. Mirrors metadata-live-gate.test.ts's hoisted-mock style.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  getSubdomain: vi.fn(),
  getRegistrySubdomain: vi.fn(),
  isTenantActive: vi.fn(),
  siteConfigFindUnique: vi.fn(),
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
}));

vi.mock("@/lib/site-config", () => ({
  getSiteConfig: mocks.getSiteConfig,
}));

// Importing app/layout.tsx eagerly runs its module-level next/font loaders and
// pulls in its client/presentational imports. Stub them so the layout module
// loads node-safe; only its exported generateViewport + default RootLayout (an
// async server fn we invoke and whose element tree we inspect) are exercised —
// the mocked child components are referenced as element types but never rendered.
vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-sans" }),
  Cinzel: () => ({ variable: "--font-display" }),
  Cormorant_Garamond: () => ({ variable: "--font-serif" }),
}));
vi.mock("next/script", () => ({ default: () => null }));
vi.mock("@/components/ui/toast", () => ({ ToastProvider: ({ children }: { children?: unknown }) => children }));
vi.mock("@/components/brand/chapter-identity-context", () => ({
  ChapterIdentityProvider: ({ children }: { children?: unknown }) => children,
}));
vi.mock("@/components/site/telemetry-bootstrap", () => ({ default: () => null }));
vi.mock("@/components/site/chatwoot-widget", () => ({ ChatwootWidget: () => null }));
vi.mock("@/components/site/greek-letter-field", () => ({ GreekLetterField: () => null }));

import RootLayout, { generateViewport } from "@/app/layout";

// Chapter identity that MUST NOT survive into a dark chapter's <head> JSON-LD,
// and MUST survive for a live one. brand.primaryHex is a distinctive tenant
// maroon so the viewport assertion can tell tenant color from platform navy.
const IDENTITY_CFG: Record<string, string> = {
  "chapter.fraternityName": "Phi Sigma Kappa",
  "chapter.fraternityShort": "Phi Sig",
  "chapter.greekLetters": "ΦΣ",
  "chapter.greekLettersGlyphs": "ΦΣ",
  "chapter.schoolShort": "USC",
  "chapter.schoolName": "University of South Carolina",
  "brand.primaryHex": "#7A0019",
};

// Any reference-chapter identity leaking into a dark chapter's <head> is the bug.
const LEAK = /ΦΣ|Phi Sigma|USC/;

// The platform-neutral navy (app/layout.tsx GREEKSTACK.themeColor) that the apex
// and NEUTRAL_METADATA's Greekstack brand share — what a dark chapter must fall
// back to instead of its tenant brand color.
const NEUTRAL_THEME_COLOR = "#0F172A";

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

/**
 * Walk the RootLayout element tree and collect the raw __html of every
 * <script type="application/ld+json">. RootLayout returns React elements (never
 * rendered here), so we read them structurally — no react-dom needed.
 */
function collectJsonLd(node: unknown, out: string[] = []): string[] {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) collectJsonLd(child, out);
    return out;
  }
  const el = node as { type?: unknown; props?: Record<string, unknown> };
  const props = el.props ?? {};
  if (el.type === "script" && props.type === "application/ld+json") {
    const dsi = props.dangerouslySetInnerHTML as { __html?: unknown } | undefined;
    if (typeof dsi?.__html === "string") out.push(dsi.__html);
  }
  if (props.children != null) collectJsonLd(props.children, out);
  return out;
}

async function layoutJsonLd(): Promise<string> {
  const tree = await RootLayout({ children: null });
  const lds = collectJsonLd(tree);
  // Exactly one ld+json script is emitted in <head> in every state.
  expect(lds).toHaveLength(1);
  return lds[0];
}

describe("root layout JSON-LD go-live gate (body <script> identity signal)", () => {
  it("carries the real chapter identity for a LIVE chapter", async () => {
    makeLive();
    const ld = await layoutJsonLd();
    expect(ld).toContain("Phi Sigma Kappa");
    expect(ld).toContain("ΦΣ");
    expect(ld).toContain("University of South Carolina");
  });

  it("emits NEUTRAL Greekstack JSON-LD (no chapter identity) for a suspended chapter", async () => {
    makeSuspended();
    const ld = await layoutJsonLd();
    expect(ld).not.toMatch(LEAK);
    expect(ld).toContain("Greekstack");
  });

  it("emits NEUTRAL Greekstack JSON-LD for a pending-billing chapter", async () => {
    makePending();
    const ld = await layoutJsonLd();
    expect(ld).not.toMatch(LEAK);
    expect(ld).toContain("Greekstack");
  });
});

describe("generateViewport themeColor go-live gate (iOS/PWA chrome identity signal)", () => {
  it("paints the tenant brand color for a LIVE chapter", async () => {
    makeLive();
    const vp = await generateViewport();
    expect(vp.themeColor).toBe("#7A0019");
  });

  it("falls back to the neutral platform navy for a suspended chapter", async () => {
    makeSuspended();
    const vp = await generateViewport();
    expect(vp.themeColor).toBe(NEUTRAL_THEME_COLOR);
    expect(vp.themeColor).not.toBe("#7A0019");
  });

  it("falls back to the neutral platform navy for a pending-billing chapter", async () => {
    makePending();
    const vp = await generateViewport();
    expect(vp.themeColor).toBe(NEUTRAL_THEME_COLOR);
  });
});
