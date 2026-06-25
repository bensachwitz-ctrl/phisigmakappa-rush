import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { marketingSiteUrl, marketingSiteLabel } from "@/lib/sales-contact";
import { openExternalUrl } from "@/lib/native-bridge";

/**
 * PHASE-4 brand guard — the school/chapter PICKER on-theme polish + the website
 * link (owner 2026-06-24: the picker "looks so generic — make it look more on
 * theme and finished," plus a link to the website that OPENS).
 *
 * This suite pins, so it can't silently regress:
 *   1. Both pickers (apex web `login-entry` AND the mobile-shell
 *      `SchoolChapterPickerSurface`) render the CLASSICAL treatment — a gold-ring
 *      navy MEDALLION avatar (not a flat chip), Cinzel (font-display) names,
 *      Cormorant (font-serif) sub-labels, and gold/architrave-framed cards.
 *   2. Each picker carries a tasteful website link that OPENS the marketing site
 *      (web anchor target=_blank + rel=noopener; native external open).
 *   3. The marketing-URL helpers resolve a usable apex + bare label.
 *   4. openExternalUrl only opens absolute http(s) URLs and uses a safe new tab.
 *
 * Pure-node (no DOM) — inspects source text + exercises pure helpers, mirroring
 * tests/classical-type-system.test.ts and tests/mobile-shell-*.
 */

const ROOT = resolve(__dirname, "..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const APEX = read("components/site/login-entry.tsx");
const SHELL = read("app/app/_demo/surfaces/SchoolChapterPickerSurface.tsx");
const GLOBALS = read("app/globals.css");

describe("PHASE-4 — classical CSS primitives exist", () => {
  it("globals.css defines the gold-ring navy MEDALLION (+ ivory variant)", () => {
    expect(GLOBALS).toMatch(/\.gs-medallion\s*\{/);
    expect(GLOBALS).toMatch(/\.gs-medallion--ivory\s*\{/);
    // The ring is gold (the brand gold or its light variant).
    expect(GLOBALS).toMatch(/#e8b53a/i);
  });

  it("globals.css defines the architrave-framed card (+ navy variant)", () => {
    expect(GLOBALS).toMatch(/\.gs-architrave-card\s*\{/);
    expect(GLOBALS).toMatch(/\.gs-architrave-card--navy/);
  });
});

describe("PHASE-4 — apex web picker (login-entry) is on-theme, not generic", () => {
  it("school/chapter rows use the classical MEDALLION (not the flat Building2 chip)", () => {
    expect(APEX).toContain("gs-medallion");
    // The old flat lucide building chip must be gone from the picker.
    expect(APEX).not.toContain("Building2");
  });

  it("rows are framed by the architrave card (not a flat dark/border card)", () => {
    expect(APEX).toContain("gs-architrave-card");
  });

  it("chapter/school NAMES use Cinzel (font-display) + sub-labels use Cormorant (font-serif)", () => {
    expect(APEX).toContain("font-display");
    expect(APEX).toContain("font-serif");
  });

  it("the search input is a refined ivory field with a gold focus ring + serif placeholder", () => {
    expect(APEX).toMatch(/placeholder:font-serif/);
    expect(APEX).toMatch(/focus:ring-amber-400\/40/);
  });

  it("renders a website link that OPENS the marketing site in a new tab, safely", () => {
    // A real anchor to the resolved marketing apex, target=_blank + rel guard.
    expect(APEX).toContain("marketingSiteUrl");
    expect(APEX).toMatch(/target="_blank"/);
    expect(APEX).toMatch(/rel="noopener noreferrer"/);
  });
});

describe("PHASE-4 — mobile-shell picker (SchoolChapterPickerSurface) matches", () => {
  it("school cards use the classical MEDALLION (the screenshotted 'GU' chip is gone)", () => {
    expect(SHELL).toContain("gs-medallion");
    // monogram helper drives the medallion letters (e.g. 'GU').
    expect(SHELL).toContain("monogramFor");
  });

  it("school/chapter rows are framed by the navy architrave card", () => {
    expect(SHELL).toContain("gs-architrave-card--navy");
  });

  it("NAMES use Cinzel (font-display) + sub-labels (e.g. '1 chapter') use Cormorant (font-serif)", () => {
    expect(SHELL).toContain("font-display");
    expect(SHELL).toContain("font-serif");
  });

  it("carries a website link that OPENS the marketing site (native external open + web fallback)", () => {
    expect(SHELL).toContain("openMarketingSite");
    expect(SHELL).toContain("marketingSiteUrl");
    // Native path uses the published bridge; web path falls back to a new tab.
    expect(SHELL).toMatch(/GreekStackNative\?\.openExternalUrl/);
    expect(SHELL).toMatch(/noopener,noreferrer/);
  });
});

describe("PHASE-4 — marketing-site URL helpers", () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_SITE_URL;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL;
  });

  it("falls back to the brand apex when NEXT_PUBLIC_SITE_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(marketingSiteUrl()).toBe("https://greekstack.com");
    expect(marketingSiteLabel()).toBe("greekstack.com");
  });

  it("normalizes a configured site URL to its origin + bare host label", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.greeklifesystems.com/some/path";
    expect(marketingSiteUrl()).toBe("https://www.greeklifesystems.com");
    expect(marketingSiteLabel()).toBe("greeklifesystems.com");
  });

  it("tolerates a malformed env value (returns the safe default)", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "not a url";
    expect(marketingSiteUrl()).toBe("https://greekstack.com");
  });
});

describe("PHASE-4 — openExternalUrl (native-bridge) opens safely", () => {
  let opened: Array<{ url: string; target?: string; features?: string }>;

  beforeEach(() => {
    opened = [];
    // node env has no window; define a minimal one (isNative() returns false, so
    // the web path runs — exactly the live web behavior).
    (globalThis as any).window = {
      open: (url: string, target?: string, features?: string) => {
        opened.push({ url, target, features });
        return null;
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
    vi.restoreAllMocks();
  });

  it("opens an absolute https URL in a new tab with noopener,noreferrer", () => {
    const ok = openExternalUrl("https://greekstack.com");
    expect(ok).toBe(true);
    expect(opened).toHaveLength(1);
    expect(opened[0].url).toBe("https://greekstack.com");
    expect(opened[0].target).toBe("_blank");
    expect(opened[0].features).toContain("noopener");
    expect(opened[0].features).toContain("noreferrer");
  });

  it("opens http URLs too", () => {
    expect(openExternalUrl("http://localhost:3000")).toBe(true);
    expect(opened).toHaveLength(1);
  });

  it("REFUSES non-http(s) schemes (javascript:, data:, relative) — never opens them", () => {
    expect(openExternalUrl("javascript:alert(1)")).toBe(false);
    expect(openExternalUrl("data:text/html,<script>1</script>")).toBe(false);
    expect(openExternalUrl("/app")).toBe(false);
    expect(openExternalUrl("")).toBe(false);
    expect(opened).toHaveLength(0);
  });
});
