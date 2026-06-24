import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { resolve, join, relative, sep } from "node:path";

// ── No /api/admin/* handler relies on isAdminAuthed() ALONE (source-pin) ──────
// AOTY council R3 root cause: `isAdminAuthed()` proves only that the session
// cookie's HMAC is VALID FOR THIS TENANT — it is TRUE for a plain member who
// logged in via the "Active brothers" flow (adminFlag=0, zero officer
// assignments). Several /api/admin/* handlers gated on it ALONE, so a member
// bounced from the /admin UI could still hit the JSON endpoint and read
// chapter-wide PII / fire privileged mutations (send-email + announcements GET
// were the two highs that R3 fixed by adding an officer/admin floor).
//
// This grep-style pin sweeps EVERY app/api/admin/**/route.ts handler and fails
// if a privileged handler (any mutation: POST/PATCH/PUT/DELETE, OR a GET) gates
// on isAdminAuthed() WITHOUT a stronger second-line floor in the same handler
// body — one of:
//   • isAdminRole()                     (admin-only 403)
//   • guardOfficer(...) / requireOfficerPermission(...)   (per-domain floor)
//   • guardOfficerOrAdmin()             (coarse officer/admin floor)
//   • withAdminArea(...) / withOfficer(...)   (wrapper applies the floor)
// A handler that never mentions isAdminAuthed at all is out of scope here (it is
// either covered by a wrapper/guard or is a deliberately public route — other
// tests pin those); this test specifically catches the "isAdminAuthed and
// nothing else" anti-pattern that R3 was about.
//
// ALLOWLIST: a few /api/admin/* handlers are INTENTIONALLY reachable by any
// active member, gated by isAdminAuthed() + per-brother identity (not officer/
// admin), because casting an anonymous PNM vote and recording a PNM impression
// are core MEMBER actions during rush — every brother does them. These are
// documented exemptions, NOT bugs.

const ROOT = resolve(__dirname, "..");
const ADMIN_API = resolve(ROOT, "app/api/admin");

// route-file::METHOD entries that are intentionally member-accessible.
const ALLOWLIST = new Set<string>([
  // Any active brother casts a secret-ballot vote on a PNM (per-brother identity
  // via getCurrentBrotherId; the aggregate-tally GET is separately gated by
  // guardOfficerOrAdmin).
  "app/api/admin/vote/route.ts::POST",
  "app/api/admin/vote/route.ts::DELETE",
  // Any active brother records their own impression of a PNM during rush
  // (isSameOrigin + per-brother authorName; the list GET is gated elsewhere).
  "app/api/admin/rushees/[id]/impressions/route.ts::POST",
]);

const PRIVILEGED_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"] as const;

// A stronger gate appearing anywhere in the handler body satisfies the floor.
const STRONGER_GATE =
  /\bisAdminRole\s*\(|\bguardOfficer\s*\(|\bguardOfficerOrAdmin\s*\(|\brequireOfficerPermission\s*\(/;

/** Recursively collect every route.ts under app/api/admin. */
function adminRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...adminRouteFiles(full));
    else if (entry === "route.ts") out.push(full);
  }
  return out;
}

/** rel path with forward slashes (stable across OSes for the allowlist keys). */
function relPosix(full: string): string {
  return relative(ROOT, full).split(sep).join("/");
}

/**
 * Split a route module into exported handler bodies keyed by HTTP method.
 * Handles both `export async function GET(` and `export const GET = …` (wrapper)
 * forms; each body runs to the next handler export (or EOF). Regex-free slicing
 * on the export markers (mirrors tests/rbac-mutation-guards.test.ts).
 */
function handlerBodies(src: string): Record<string, string> {
  const marks: { method: string; start: number }[] = [];
  for (const m of PRIVILEGED_METHODS) {
    for (const decl of [`export async function ${m}(`, `export const ${m} =`, `export function ${m}(`]) {
      const idx = src.indexOf(decl);
      if (idx !== -1) marks.push({ method: m, start: idx });
    }
  }
  marks.sort((a, b) => a.start - b.start);
  const out: Record<string, string> = {};
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].start : src.length;
    // Keep the FIRST occurrence per method (a method has one export).
    if (!(marks[i].method in out)) out[marks[i].method] = src.slice(marks[i].start, end);
  }
  return out;
}

describe("admin API: no handler gates on isAdminAuthed() alone", () => {
  const files = adminRouteFiles(ADMIN_API);

  it("discovers a meaningful number of admin route files", () => {
    // Sanity guard: if the glob breaks (0 files), the sweep below is vacuously
    // green. Pin a floor so a path regression fails loudly.
    expect(files.length).toBeGreaterThan(30);
  });

  it("every privileged handler that uses isAdminAuthed() has a stronger floor too (or is allowlisted)", () => {
    const offenders: string[] = [];
    for (const full of files) {
      const rel = relPosix(full);
      const src = readFileSync(full, "utf8");
      // A wrapper applied to a method (export const GET = withAdminArea(...))
      // already carries the floor — the handler body text captured for that
      // method will contain withAdminArea/withOfficer, which we also accept.
      const wrapped = /withAdminArea\s*\(|withOfficer\s*\(/;
      const handlers = handlerBodies(src);
      for (const method of PRIVILEGED_METHODS) {
        const body = handlers[method];
        if (!body) continue;
        if (!/\bisAdminAuthed\s*\(/.test(body)) continue; // not the anti-pattern target
        if (STRONGER_GATE.test(body) || wrapped.test(body)) continue; // has a floor
        const key = `${rel}::${method}`;
        if (ALLOWLIST.has(key)) continue; // documented member-accessible
        offenders.push(key);
      }
    }
    expect(
      offenders,
      `These /api/admin handlers gate on isAdminAuthed() ALONE (no isAdminRole/` +
        `guardOfficer*/requireOfficerPermission and not wrapper-gated). Add a ` +
        `floor or, if intentionally member-accessible, add to ALLOWLIST with a ` +
        `comment:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("the two R3-fixed routes are floored (regression anchor)", () => {
    // send-email lives at app/api/send-email (not under /admin) but is the sister
    // fix — verify its wrapper floor here so the (d) sweep + (a)/(b) agree.
    const sendEmail = readFileSync(resolve(ROOT, "app/api/send-email/route.ts"), "utf8");
    expect(sendEmail).toMatch(/withOfficer\s*\(\s*["']rushPipeline["']\s*,\s*["']write["']/);
    const announcements = readFileSync(
      resolve(ROOT, "app/api/admin/announcements/route.ts"),
      "utf8",
    );
    expect(handlerBodies(announcements).GET).toMatch(/withAdminArea\s*\(/);
  });

  it("the allowlist only contains entries that actually exist (no stale exemptions)", () => {
    for (const key of ALLOWLIST) {
      const [rel, method] = key.split("::");
      const full = resolve(ROOT, rel);
      const src = readFileSync(full, "utf8");
      const body = handlerBodies(src)[method];
      expect(body, `allowlisted ${key} no longer exists`).toBeTruthy();
      // And it must still be the isAdminAuthed-alone shape — if someone added a
      // real floor, the exemption is stale and should be removed.
      expect(/\bisAdminAuthed\s*\(/.test(body!), `${key} no longer uses isAdminAuthed`).toBe(true);
      expect(
        STRONGER_GATE.test(body!),
        `${key} now has a stronger floor — remove it from ALLOWLIST`,
      ).toBe(false);
    }
  });
});
