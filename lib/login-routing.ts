/**
 * lib/login-routing.ts — chapter → login-URL resolution for the sign-in entry.
 * ─────────────────────────────────────────────────────────────────────────────
 * The apex sign-in landing (app/login) lets a member pick their SCHOOL + CHAPTER
 * and then a PORTAL (brother | alumni), and routes them to THAT chapter's correct
 * login page. The chapter lives on its own tenant host (a subdomain of the apex,
 * or a fully custom domain), so the destination is an ABSOLUTE url to the tenant
 * — not a same-origin path on the apex (which has no chapter).
 *
 * This module is intentionally PURE + isomorphic: no `next/headers`, no DB, no
 * side effects at import time, so it is safe to import from BOTH a server page
 * (to precompute) and a client component (the entry runs in the browser). The
 * only environment it reads is `NEXT_PUBLIC_SITE_URL` (inlined at build for the
 * client) to learn the apex host a chapter subdomain hangs off of.
 *
 * DEFENSIVE BY DESIGN: every path is guarded so the entry can NEVER hand the
 * user a broken URL. If a chapter has no usable domain/subdomain, or the apex
 * host can't be resolved, we fall back to a same-host relative `/portal/.../login`
 * (correct when the app is already serving that single tenant). When the browser
 * is ALREADY on the selected chapter's host, we likewise stay relative so the
 * existing session/cookies and the live auth routes are reused verbatim.
 */

/** The two member-facing portals. E-board members are brothers → Brother portal. */
export type PortalKind = "brothers" | "alumni";

/** The subset of a tenant registry row the entry needs to route. */
export interface ChapterRouteTarget {
  subdomain: string;
  domain?: string | null;
  name?: string | null;
  school?: string | null;
}

/**
 * Hosts that are the PLATFORM apex (marketing), never a chapter. Mirrors
 * getSubdomain() in lib/prisma.ts so subdomain detection here agrees with the
 * server's tenant resolver. Bare-host + www variants included.
 */
const APEX_HOSTS = new Set<string>([
  "localhost",
  "www",
  "greekstack",
  "greekstack.vercel.app",
  "greeklifesystems",
  "greeklifesystems.vercel.app",
  "greek-life-systems.vercel.app",
]);

/** Apex host SUFFIXES a chapter subdomain hangs off (e.g. "phisig.greekstack.vercel.app"). */
const APEX_SUFFIXES = [
  ".greekstack.vercel.app",
  ".greeklifesystems.vercel.app",
  ".greek-life-systems.vercel.app",
  ".localhost:3000",
  ".localhost:3001",
  ".localhost",
];

/** Strip a leading "www.". */
function stripWww(host: string): string {
  return host.replace(/^www\./i, "");
}

/** Lowercased host without port. */
function bareHost(host: string): string {
  return (host || "").split(":")[0].toLowerCase();
}

/**
 * The subdomain of `host` if it is a chapter tenant host, else null (apex /
 * unknown). Mirrors the spirit of lib/prisma.ts getSubdomain but is browser-safe
 * and returns the RAW label (not the schema-sanitized form) so we can compare it
 * to a registry `subdomain` value.
 */
export function subdomainFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const lower = stripWww(host.toLowerCase());
  const bare = bareHost(lower);
  if (APEX_HOSTS.has(bare)) return null;

  for (const suffix of APEX_SUFFIXES) {
    const sfxBare = suffix.split(":")[0];
    if (bare.endsWith(sfxBare)) {
      const label = bare.slice(0, bare.length - sfxBare.length);
      if (!label || label === "www") return null;
      // Only a single left-most label is a chapter (no nested subdomains).
      return label.includes(".") ? label.split(".").pop()! : label;
    }
  }

  // A custom apex domain we don't know about (e.g. greeklife.app) → can't tell a
  // chapter subdomain apart safely, so treat as apex/unknown (caller falls back).
  return null;
}

/**
 * Resolve the apex ORIGIN (scheme + host[:port]) a chapter subdomain should hang
 * off of. Prefers NEXT_PUBLIC_SITE_URL (the per-deploy canonical apex). Falls back
 * to the current browser origin when it is itself an apex host. Returns null when
 * nothing usable is known (caller then routes relative).
 */
export function resolveApexOrigin(currentHost?: string | null): {
  origin: string;
  host: string;
  protocol: string;
} | null {
  // 1) Build-time canonical apex (works on server + client; inlined for client).
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      const u = new URL(siteUrl);
      return { origin: u.origin, host: u.host, protocol: u.protocol };
    } catch {
      /* malformed env → fall through */
    }
  }

  // 2) Derive from the current host IF it is an apex host (not a chapter).
  if (currentHost) {
    const bare = bareHost(stripWww(currentHost));
    const isApex = APEX_HOSTS.has(bare) || subdomainFromHost(currentHost) === null;
    if (isApex) {
      const protocol =
        bare === "localhost" || bare.startsWith("127.") ? "http:" : "https:";
      const host = stripWww(currentHost);
      return { origin: `${protocol}//${host}`, host, protocol };
    }
  }

  return null;
}

/** A subdomain is route-usable only if it is a clean DNS label. */
function isUsableSubdomain(sub: string | null | undefined): sub is string {
  return !!sub && /^[a-z0-9][a-z0-9-]*$/i.test(sub);
}

/** Normalize a custom `domain` value (may be stored bare or with scheme/path). */
function normalizeCustomDomain(domain: string): string | null {
  const trimmed = domain.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (!u.host) return null;
    return u.host; // strip any scheme/path the operator pasted
  } catch {
    return null;
  }
}

/**
 * Build the login URL for a chapter + portal. NEVER throws; always returns a
 * non-empty, navigable string.
 *
 * Resolution order:
 *   1. Already on the chapter's own host (subdomain matches, or custom domain
 *      matches the current host) → relative `/portal/<kind>` (reuse the
 *      live host + any existing cookies).
 *   2. Custom `domain` set on the tenant → `https://<domain>/portal/<kind>`.
 *   3. `subdomain` + a resolvable apex origin → `<scheme>://<sub>.<apexHost>/portal/<kind>`.
 *   4. Fallback → relative `/portal/<kind>` on the current host (correct for
 *      a single-tenant deploy that has no working subdomain split).
 *
 * NOTE: the destination is the portal's PAGE route `/portal/<kind>` (which renders
 * the login form), NOT `/portal/<kind>/login` — the latter is a POST-only API route
 * (app/api/portal/<kind>/login) with no page, so navigating there 404s.
 */
export function buildChapterLoginUrl(
  chapter: ChapterRouteTarget,
  kind: PortalKind,
  currentHost?: string | null,
): string {
  const path = `/portal/${kind}`;
  const sub = (chapter.subdomain || "").toLowerCase();
  const customHost = chapter.domain ? normalizeCustomDomain(chapter.domain) : null;

  // (1) Are we already on this exact chapter's host? Stay relative.
  if (currentHost) {
    const curBare = bareHost(stripWww(currentHost));
    const curSub = subdomainFromHost(currentHost);
    if (curSub && curSub.toLowerCase() === sub) return path;
    if (customHost && curBare === bareHost(customHost)) return path;
  }

  // (2) Custom domain wins when present + valid.
  if (customHost) {
    return `https://${customHost}${path}`;
  }

  // (3) Subdomain under the resolvable apex.
  if (isUsableSubdomain(sub)) {
    const apex = resolveApexOrigin(currentHost);
    if (apex) {
      // localhost dev: subdomains of localhost work in modern browsers, but if
      // the apex host has no dot (bare "localhost"), prefix is still valid.
      return `${apex.protocol}//${sub}.${apex.host}${path}`;
    }
  }

  // (4) Defensive last resort — relative on the current host. Correct when the
  // deploy serves one tenant directly (no subdomain split) and never broken.
  return path;
}

/** Human-readable host label for a chapter (what the user is being sent to). */
export function chapterDestinationLabel(
  chapter: ChapterRouteTarget,
  currentHost?: string | null,
): string {
  const customHost = chapter.domain ? normalizeCustomDomain(chapter.domain) : null;
  if (customHost) return customHost;
  const sub = (chapter.subdomain || "").toLowerCase();
  if (isUsableSubdomain(sub)) {
    const apex = resolveApexOrigin(currentHost);
    if (apex) return `${sub}.${apex.host}`;
    return sub;
  }
  return currentHost ? bareHost(currentHost) : "this site";
}

/**
 * Group + sort chapters by school for the picker. Chapters with no school fall
 * into a trailing "Other chapters" bucket. Within a school, sorted by name then
 * subdomain. Schools sorted alphabetically.
 */
export interface ChapterGroup {
  school: string;
  chapters: ChapterRouteTarget[];
}

const NO_SCHOOL = "Other chapters";

export function groupChaptersBySchool(
  chapters: ChapterRouteTarget[],
): ChapterGroup[] {
  const bySchool = new Map<string, ChapterRouteTarget[]>();
  for (const c of chapters) {
    const key = (c.school || "").trim() || NO_SCHOOL;
    const arr = bySchool.get(key) || [];
    arr.push(c);
    bySchool.set(key, arr);
  }
  const groups: ChapterGroup[] = [];
  for (const [school, list] of bySchool) {
    list.sort((a, b) =>
      (a.name || a.subdomain).localeCompare(b.name || b.subdomain),
    );
    groups.push({ school, chapters: list });
  }
  groups.sort((a, b) => {
    // Keep the "Other chapters" bucket last; otherwise alphabetical.
    if (a.school === NO_SCHOOL) return 1;
    if (b.school === NO_SCHOOL) return -1;
    return a.school.localeCompare(b.school);
  });
  return groups;
}

/**
 * The distinct SCHOOLS present in the chapter list, each with how many chapters
 * it has, for the simple "choose your school first" step. Schools sort
 * alphabetically with the school-less "Other chapters" bucket kept last. Pure +
 * deterministic (built on the same grouping the picker uses).
 */
export interface SchoolOption {
  school: string;
  count: number;
}

export function distinctSchools(chapters: ChapterRouteTarget[]): SchoolOption[] {
  return groupChaptersBySchool(chapters).map((g) => ({
    school: g.school,
    count: g.chapters.length,
  }));
}

/** The chapters that belong to a chosen school (matches groupChaptersBySchool's
 *  bucketing so a school selected in step 1 always yields its step-2 chapters). */
export function chaptersForSchool(
  chapters: ChapterRouteTarget[],
  school: string,
): ChapterRouteTarget[] {
  const group = groupChaptersBySchool(chapters).find((g) => g.school === school);
  return group ? group.chapters : [];
}

/** Does a school name match a free-text query? (used by the school-step search). */
export function schoolMatchesQuery(school: string, query: string): boolean {
  const q = searchNeedle(query.trim());
  if (!q) return true;
  return searchNeedle(school).includes(q);
}

/** Lowercase, accent-folded haystack for fuzzy-ish substring search. */
export function searchNeedle(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\̀-\ͯ]/g, "");
}

/** Does a chapter match a free-text query (name, school, or subdomain)? */
export function chapterMatchesQuery(
  chapter: ChapterRouteTarget,
  query: string,
): boolean {
  const q = searchNeedle(query.trim());
  if (!q) return true;
  const hay = searchNeedle(
    [chapter.name, chapter.school, chapter.subdomain].filter(Boolean).join(" "),
  );
  return hay.includes(q);
}
