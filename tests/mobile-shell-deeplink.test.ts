import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

// ── GATE-3 FIX (deep-link claimed, not handled) ──────────────────────────────
// The app ADVERTISES universal-link deep-linking — the AASA route claims /app +
// /app/*, App.entitlements declares applinks:greekstack.com, capacitor.config.ts
// lists "Deep links (universal links into a chapter)", and the brothers-dashboard
// promo banner says the app opens "straight to the right page". But the SHIPPED
// shell's boot() never handled an incoming link (no appUrlOpen listener, no
// cold-start launch-URL parse) — so the pitch didn't match the product.
//
// The fix wires deep-link handling in mobile-shell/index.html: parseDeepLink()
// reads /app[?chapter=&tab=] (+ /app/<tab>), boot() registers the live
// appUrlOpen listener AND reads the cold-start App.getLaunchUrl(), and
// routeDeepLink() routes picker/login/dashboard to that chapter + tab. This
// suite evaluates the real parser from the shell + pins the boot wiring, so the
// advertised capability is genuinely present (honesty).

const ROOT = resolve(__dirname, "..");
const SHELL = readFileSync(resolve(ROOT, "mobile-shell/index.html"), "utf8");
const IOS_COPY = readFileSync(resolve(ROOT, "ios/App/App/public/index.html"), "utf8");

// Pull parseDeepLink (+ its DEEP_LINK_TABS dependency) out of the shell and run
// it in a sandbox with a real URL global — proving BEHAVIOR, not just text.
function loadParseDeepLink(): (url: string | null) => { chapter: string | null; tab: string | null } {
  const tabsMatch = SHELL.match(/var DEEP_LINK_TABS = \[[^\]]*\];/);
  const fnMatch = SHELL.match(/function parseDeepLink\(url\)\s*\{[\s\S]*?\n {4}\}/);
  if (!tabsMatch || !fnMatch) throw new Error("parseDeepLink / DEEP_LINK_TABS not found in shell");
  const sandbox: any = { URL };
  vm.createContext(sandbox);
  vm.runInContext(`${tabsMatch[0]}\n${fnMatch[0]}\nthis.parseDeepLink = parseDeepLink;`, sandbox);
  return sandbox.parseDeepLink;
}

describe("bundled iOS shell — universal-link deep linking is handled", () => {
  it("boot() registers the live appUrlOpen listener", () => {
    expect(SHELL).toMatch(/function registerDeepLinkListener\(\)/);
    expect(SHELL).toMatch(/App\.addListener\("appUrlOpen"/);
    expect(SHELL).toMatch(/registerDeepLinkListener\(\);/);
  });

  it("boot() reads the cold-start launch URL (App.getLaunchUrl)", () => {
    expect(SHELL).toMatch(/function getColdStartDeepLink\(\)/);
    expect(SHELL).toMatch(/App\.getLaunchUrl\(\)/);
    expect(SHELL).toMatch(/var coldLink = await getColdStartDeepLink\(\)/);
  });

  it("routes a deep link via routeDeepLink (picker/login/dashboard by chapter+tab)", () => {
    expect(SHELL).toMatch(/function routeDeepLink\(link\)/);
    // It honors the requested tab, resumes the dashboard when already signed in
    // for that chapter, and falls back to login/picker otherwise.
    expect(SHELL).toMatch(/if \(link\.tab\) S\.tab = link\.tab/);
    expect(SHELL).toMatch(/showLogin\(match\)/);
    expect(SHELL).toMatch(/showPicker\(\)/);
    // Both boot paths (saved-session and no-session) consult the cold link.
    expect((SHELL.match(/if \(coldLink\.chapter && routeDeepLink\(coldLink\)\) return;/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it("the @capacitor/app dependency (which provides App.appUrlOpen) is declared", () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
    expect(pkg.dependencies["@capacitor/app"]).toBeTruthy();
  });

  it("the ios cap-synced copy is byte-identical (the listener ships in the binary)", () => {
    expect(IOS_COPY).toBe(SHELL);
  });
});

describe("parseDeepLink() — evaluated from the shell source", () => {
  const parse = loadParseDeepLink();

  it("parses the advertised /app?chapter= form", () => {
    expect(parse("https://greekstack.com/app?chapter=phisig")).toEqual({ chapter: "phisig", tab: null });
  });

  it("parses ?chapter= + ?tab= (and validates the tab against known tabs)", () => {
    expect(parse("https://greekstack.com/app?chapter=phisig&tab=elections")).toEqual({
      chapter: "phisig",
      tab: "elections",
    });
    // An unknown tab is dropped (never routes to a non-existent surface).
    expect(parse("https://greekstack.com/app?chapter=phisig&tab=bogus")).toEqual({
      chapter: "phisig",
      tab: null,
    });
  });

  it("parses the /app/<tab> path form", () => {
    expect(parse("https://greekstack.com/app/dues?chapter=phisig")).toEqual({
      chapter: "phisig",
      tab: "dues",
    });
  });

  it("works on every advertised host + the capacitor scheme", () => {
    expect(parse("https://www.greekstack.com/app?chapter=phisig").chapter).toBe("phisig");
    expect(parse("https://greekstack.vercel.app/app?chapter=phisig").chapter).toBe("phisig");
    expect(parse("capacitor://localhost/app?chapter=phisig").chapter).toBe("phisig");
  });

  it("ignores links outside the /app namespace (matches the AASA scope)", () => {
    expect(parse("https://greekstack.com/about?chapter=phisig")).toEqual({ chapter: null, tab: null });
    expect(parse("https://greekstack.com/?chapter=phisig")).toEqual({ chapter: null, tab: null });
  });

  it("rejects a malformed chapter label (defensive, never routes garbage)", () => {
    expect(parse("https://greekstack.com/app?chapter=not a label!")).toEqual({ chapter: null, tab: null });
  });

  it("never throws on nullish / malformed input", () => {
    expect(parse(null)).toEqual({ chapter: null, tab: null });
    expect(parse("")).toEqual({ chapter: null, tab: null });
    expect(parse("not a url")).toEqual({ chapter: null, tab: null });
  });
});
