import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── GATE-3 FIX 5 — Alumni dashboard error guard ──────────────────────────────
// app/portal/alumni/dashboard/page.tsx loaded the alumnus profile + donations
// inside a try/catch (graceful redirect to ?error=unavailable on a DB blip), but
// the EIGHT later queries (brothers, alumniNetwork, allPnms, vouches, polls,
// events, announcements, jobPostings) ran UNGUARDED — so a single transient DB
// error threw past the graceful redirect and crashed into the generic error
// boundary. The fix mirrors app/portal/brothers/dashboard/page.tsx: wrap the FULL
// query sequence in one try/catch that re-throws Next routing signals
// (isNextSignal) and otherwise redirects to ?error=unavailable.
//
// Static source-pin (the page is a server component doing DB work — the repo's
// other dashboard tests pin source, not run the RSC). NON-VACUOUS: the pre-fix
// page had exactly ONE try (profile load) and the 8 queries as top-level
// `const x = await prisma…`; the asserts below would all have failed then.

const ROOT = resolve(__dirname, "..");

describe("alumni dashboard error guard (GATE-3 FIX 5) — full query sequence is wrapped", () => {
  const src = readFileSync(
    resolve(ROOT, "app/portal/alumni/dashboard/page.tsx"),
    "utf8",
  );

  it("declares the 8 later queries with `let` (so they live across the guard's try)", () => {
    expect(src).toMatch(
      /let brothers, alumniNetwork, allPnms, vouches, polls, events,\s*announcements, jobPostings;/,
    );
  });

  it("assigns each of the 8 queries (no top-level un-guarded `const x = await prisma`)", () => {
    // Every one of the 8 is now an assignment to the pre-declared let, INSIDE the
    // guard — never a bare `const … = await prisma.<model>` at page scope.
    for (const v of [
      "brothers",
      "alumniNetwork",
      "allPnms",
      "vouches",
      "polls",
      "events",
      "announcements",
      "jobPostings",
    ]) {
      expect(
        new RegExp(`\\bconst ${v} = await prisma`).test(src),
        `${v} is still loaded as an un-guarded top-level const; it must be assigned inside the wrapped try.`,
      ).toBe(false);
    }
  });

  it("has a SECOND try/catch (the data-load guard) beyond the profile load", () => {
    const tryCount = (src.match(/\btry\s*\{/g) || []).length;
    expect(tryCount).toBeGreaterThanOrEqual(2);
  });

  it("re-throws Next routing signals and otherwise redirects to ?error=unavailable", () => {
    expect(src).toMatch(/if \(isNextSignal\(err\)\) throw err;/);
    expect(src).toMatch(/redirect\("\/portal\/alumni\?error=unavailable"\)/);
    // The data-load catch logs distinctly from the profile-load catch.
    expect(src).toContain("[alumni dashboard] data load failed:");
  });
});

// Parity anchor: the alumni guard mirrors the brothers dashboard, the reference
// pattern the fix copied. If the brothers template ever loses its guard, this
// flags it so the two don't silently diverge.
describe("brothers dashboard error guard (reference pattern) — still wraps its data load", () => {
  const src = readFileSync(
    resolve(ROOT, "app/portal/brothers/dashboard/page.tsx"),
    "utf8",
  );

  it("wraps its data load and redirects to ?error=unavailable on a non-signal failure", () => {
    expect(src).toMatch(/if \(isNextSignal\(err\)\) throw err;/);
    expect(src).toMatch(/redirect\("\/portal\/brothers\?error=unavailable"\)/);
  });
});
