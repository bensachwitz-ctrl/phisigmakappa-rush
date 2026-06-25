import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  buildChapterLoginUrl,
  type ChapterRouteTarget,
  type PortalKind,
} from "@/lib/login-routing";

// ── lib/login-routing — buildChapterLoginUrl branch coverage ─────────────────
// The apex sign-in entry (components/site/login-entry.tsx) routes a member INTO
// their chapter's login by navigating to whatever buildChapterLoginUrl returns.
// A wrong path here is a broken PRIMARY login (a hard 404 on every code path —
// exactly the Gate-3 CRITICAL this suite guards against), so every branch is
// pinned AND every returned path is proven to resolve to a real on-disk page
// route (app/portal/<kind>/page.tsx), not a POST-only API route.

const REPO_ROOT = process.cwd();

/** The first two path segments of a (possibly absolute) URL, e.g. "/portal/brothers". */
function firstTwoSegments(url: string): string {
  // Works for both absolute ("https://x/portal/brothers") and relative ("/portal/brothers").
  const path = url.startsWith("http") ? new URL(url).pathname : url;
  const segs = path.split("/").filter(Boolean);
  return "/" + segs.slice(0, 2).join("/");
}

/** Map "/portal/<kind>" → its Next.js page-route file on disk. */
function pageRouteFileFor(firstTwo: string): string {
  // firstTwo is "/portal/brothers" or "/portal/alumni"; the page lives at
  // app/portal/<kind>/page.tsx. Build it OS-portably from the segments.
  const segs = firstTwo.split("/").filter(Boolean); // ["portal", "<kind>"]
  return join(REPO_ROOT, "app", ...segs, "page.tsx");
}

const PHISIG: ChapterRouteTarget = {
  subdomain: "phisig",
  domain: null,
  name: "Phi Sigma Kappa",
  school: "Clemson",
};

const CUSTOM: ChapterRouteTarget = {
  subdomain: "phisig",
  domain: "phisig.example.org",
  name: "Phi Sigma Kappa",
  school: "Clemson",
};

const KINDS: PortalKind[] = ["brothers", "alumni"];

describe("buildChapterLoginUrl — every branch lands on a real portal page route", () => {
  const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
  afterEach(() => {
    if (ORIGINAL_SITE_URL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  });
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  // --- Branch (4): single-tenant relative fallback (no apex resolvable) -------
  describe("single-tenant relative fallback", () => {
    it.each(KINDS)(
      "on a DIFFERENT chapter host with no apex env → relative /portal/%s",
      (kind) => {
        // currentHost is itself a chapter tenant host (a known apex suffix), so
        // resolveApexOrigin() returns null (it refuses to anchor off a chapter),
        // AND its subdomain ("other") ≠ the selected chapter ("phisig"), so the
        // already-on-host shortcut doesn't fire either → defensive relative path.
        const url = buildChapterLoginUrl(
          PHISIG,
          kind,
          "other.greekstack.vercel.app",
        );
        expect(url).toBe(`/portal/${kind}`);
      },
    );

    it.each(KINDS)(
      "no currentHost and no apex env → relative /portal/%s",
      (kind) => {
        // No env apex and no host to derive one from → relative fallback.
        const url = buildChapterLoginUrl(PHISIG, kind, undefined);
        expect(url).toBe(`/portal/${kind}`);
      },
    );
  });

  // --- Branch (3): subdomain under a resolvable apex origin ------------------
  describe("subdomain under a resolvable apex", () => {
    it.each(KINDS)(
      "NEXT_PUBLIC_SITE_URL apex → absolute <sub>.<apex>/portal/%s",
      (kind) => {
        process.env.NEXT_PUBLIC_SITE_URL = "https://greekstack.vercel.app";
        // Called from the apex host (the real entry scenario).
        const url = buildChapterLoginUrl(PHISIG, kind, "greekstack.vercel.app");
        expect(url).toBe(`https://phisig.greekstack.vercel.app/portal/${kind}`);
      },
    );
  });

  // --- Branch (2): custom domain wins ---------------------------------------
  describe("custom domain", () => {
    it.each(KINDS)(
      "tenant custom domain → https://<domain>/portal/%s",
      (kind) => {
        process.env.NEXT_PUBLIC_SITE_URL = "https://greekstack.vercel.app";
        const url = buildChapterLoginUrl(CUSTOM, kind, "greekstack.vercel.app");
        expect(url).toBe(`https://phisig.example.org/portal/${kind}`);
      },
    );
  });

  // --- Branch (1a): already on the chapter's subdomain host → stay relative --
  describe("already on the chapter host (subdomain match)", () => {
    it.each(KINDS)(
      "browser already on <sub>.<apex> → relative /portal/%s",
      (kind) => {
        process.env.NEXT_PUBLIC_SITE_URL = "https://greekstack.vercel.app";
        const url = buildChapterLoginUrl(
          PHISIG,
          kind,
          "phisig.greekstack.vercel.app",
        );
        expect(url).toBe(`/portal/${kind}`);
      },
    );
  });

  // --- Branch (1b): already on the chapter's custom-domain host → relative ---
  describe("already on the chapter host (custom domain match)", () => {
    it.each(KINDS)(
      "browser already on the custom domain → relative /portal/%s",
      (kind) => {
        const url = buildChapterLoginUrl(CUSTOM, kind, "phisig.example.org");
        expect(url).toBe(`/portal/${kind}`);
      },
    );
  });

  // --- Empty/invalid subdomain (with no custom domain) → safe relative -------
  describe("empty / invalid subdomain", () => {
    it.each(KINDS)(
      "empty subdomain → relative /portal/%s (never a broken URL)",
      (kind) => {
        process.env.NEXT_PUBLIC_SITE_URL = "https://greekstack.vercel.app";
        const url = buildChapterLoginUrl(
          { subdomain: "", domain: null, name: "x", school: "y" },
          kind,
          "greekstack.vercel.app",
        );
        expect(url).toBe(`/portal/${kind}`);
      },
    );

    it.each(KINDS)(
      "invalid subdomain (illegal chars) → relative /portal/%s",
      (kind) => {
        process.env.NEXT_PUBLIC_SITE_URL = "https://greekstack.vercel.app";
        const url = buildChapterLoginUrl(
          { subdomain: "not a valid label!", domain: null, name: "x", school: "y" },
          kind,
          "greekstack.vercel.app",
        );
        // isUsableSubdomain rejects → falls through to relative.
        expect(url).toBe(`/portal/${kind}`);
      },
    );
  });
});

// The whole point of FIX 1: every URL the entry can produce must resolve to a
// real PAGE route on disk. A POST-only /portal/<kind>/login API route has no
// page.tsx and would 404 in the browser — so we assert the page file EXISTS and
// that the broken /login suffix variant does NOT.
describe("buildChapterLoginUrl — first two segments resolve to an on-disk page route", () => {
  const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
  afterEach(() => {
    if (ORIGINAL_SITE_URL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  });

  const scenarios: Array<{ label: string; chapter: ChapterRouteTarget; host: string | null; siteUrl?: string }> = [
    { label: "single-tenant relative fallback", chapter: PHISIG, host: undefined as unknown as string | null },
    { label: "subdomain apex", chapter: PHISIG, host: "greekstack.vercel.app", siteUrl: "https://greekstack.vercel.app" },
    { label: "custom domain", chapter: CUSTOM, host: "greekstack.vercel.app", siteUrl: "https://greekstack.vercel.app" },
    { label: "already on chapter host", chapter: PHISIG, host: "phisig.greekstack.vercel.app", siteUrl: "https://greekstack.vercel.app" },
  ];

  for (const kind of KINDS) {
    for (const sc of scenarios) {
      it(`${kind} · ${sc.label} → /portal/${kind} maps to an existing page.tsx`, () => {
        if (sc.siteUrl) process.env.NEXT_PUBLIC_SITE_URL = sc.siteUrl;
        else delete process.env.NEXT_PUBLIC_SITE_URL;

        const url = buildChapterLoginUrl(sc.chapter, kind, sc.host);
        const firstTwo = firstTwoSegments(url);

        // First two segments are always /portal/<brothers|alumni>.
        expect(firstTwo).toBe(`/portal/${kind}`);

        // The page route file exists on disk…
        expect(existsSync(pageRouteFileFor(firstTwo))).toBe(true);
        // …and the OLD broken variant (a /login PAGE) does NOT exist (only the
        // POST-only app/api/portal/<kind>/login route does).
        expect(
          existsSync(join(REPO_ROOT, "app", "portal", kind, "login", "page.tsx")),
        ).toBe(false);
      });
    }
  }
});
