import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── White-label leak guard (source-pin) ───────────────────────────────────────
// Greek Stack is a multi-tenant white-label SaaS: a hardcoded reference-chapter
// string ("@phisig_usc", "Phi Sigma Kappa", "Gamma Triton") rendered in shared
// admin/site UI shows up on EVERY chapter's screen — a Clemson admin should never
// read "from @phisig_usc" or "the 13 standard Phi Sigma Kappa positions".
//
// These files are the surfaces a polish sweep just de-leaked. We pin them so a
// future edit can't silently reintroduce a literal reference-chapter handle/name
// into user-visible copy. We scope to the precise leaks fixed (not a blanket
// "phisig" ban — the brand TOKEN names like `phisig-red` are legitimate and
// pervasive), so this stays a tight, low-noise guard.
const ROOT = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("white-label: no reference-chapter leak in shared UI copy", () => {
  it("settings-manager has no hardcoded @phisig_usc handle in copy or links", () => {
    const src = read("components/admin/settings-manager.tsx");
    // The Instagram handle + photo-badge now come from the chapter's own
    // contact.instagramHandle, so the literal must be gone everywhere
    // (including the help text, the photo-preview badge, and placeholders).
    expect(src).not.toContain("@phisig_usc");
    expect(src).not.toContain("instagram.com/phisig_usc");
    // The brand-color help text must name the PLATFORM default, not a chapter's.
    expect(src).not.toContain("Phi Sigma Kappa cardinal red");
    // It threads the chapter handle into the photo preview badge instead.
    expect(src).toContain('handle={values["contact.instagramHandle"]}');
  });

  it("officers empty-state copy is org-neutral (no 'Phi Sigma Kappa positions')", () => {
    const src = read("app/admin/officers/officers-client.tsx");
    expect(src).not.toContain("Phi Sigma Kappa positions");
    expect(src).not.toContain("standard Phi Sigma Kappa");
  });

  it("roster email/SMS brand fallback is white-label-neutral (no Phi Sig / USC literals)", () => {
    const src = read("components/admin/roster.tsx");
    expect(src).not.toContain('fraternityName: "Phi Sigma Kappa"');
    expect(src).not.toContain('chapterAttribution: "Phi Sig USC"');
    expect(src).not.toContain('houseAddress: "1525 College St"');
  });
});
