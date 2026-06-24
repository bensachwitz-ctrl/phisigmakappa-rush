import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Marketing "all-in-one" comparison: present, honest, on-theme, in BOTH paths ─
// The Squarespace-style comparison table must (a) actually render in the landing
// (both the reduced-motion/mobile linear path AND the 3D scroll path), (b) be
// HONEST — every capability claimed maps to a real, shipped feature already
// described in the FEATURES array of the same file, and name real DIY tools, and
// (c) carry the royal-blue + gold theme classes. Static source-pins (the landing
// is a heavy framer-motion client component; the suite is node-env with no render
// harness), matching the repo's existing source-pin tests.

const ROOT = resolve(__dirname, "..");
const src = readFileSync(resolve(ROOT, "components/site/marketing-landing.tsx"), "utf8");

describe("marketing comparison section — presence", () => {
  it("defines a Comparison component with an accessible #compare section", () => {
    expect(src).toMatch(/function Comparison\(\)/);
    expect(src).toMatch(/id="compare"/);
    expect(src).toMatch(/aria-label="Greek Stack vs piecing it together"/);
  });

  it("renders <Comparison /> in BOTH the linear and the 3D render paths (right after BeforeAfter)", () => {
    const renders = src.match(/<Comparison \/>/g) || [];
    expect(renders.length).toBe(2);
    // Each render must immediately follow a BeforeAfter render so it lands in the
    // right narrative slot in both paths.
    const pairs = src.match(/<BeforeAfter \/>[\s\S]{0,120}?<Comparison \/>/g) || [];
    expect(pairs.length).toBe(2);
  });

  it("uses a real semantic table-ish header with both columns labeled", () => {
    expect(src).toContain("Greek Stack");
    expect(src).toContain("Piecing it together");
    expect(src).toContain("all included");
  });
});

describe("marketing comparison section — honesty (no fabricated features)", () => {
  // Pull the COMPARISON_ROWS capability strings out of the source.
  const rowsBlock = src.slice(src.indexOf("const COMPARISON_ROWS"), src.indexOf("];", src.indexOf("const COMPARISON_ROWS")));
  const capabilities = [...rowsBlock.matchAll(/capability:\s*"([^"]+)"/g)].map((m) => m[1]);

  it("has a populated, typed COMPARISON_ROWS list", () => {
    expect(capabilities.length).toBeGreaterThanOrEqual(8);
  });

  // Each comparison capability must correspond to a real shipped feature. We map
  // each row to a keyword that MUST appear in the FEATURES array (the source of
  // truth for what actually ships), so a fabricated comparison row fails CI.
  const FEATURE_KEYWORDS: Record<string, RegExp> = {
    "Branded chapter website + your own subdomain": /subdomain/i,
    "Member & alumni roster, always current": /roster|directory/i,
    "Online dues by card, paid to your account": /dues/i,
    "Self-reconciling treasury & budgets": /treasury|budget/i,
    "Recruitment pipeline + PNM QR check-in": /recruitment|QR check-in|PNM/i,
    "Secret-ballot officer elections": /secret ballot|election/i,
    "Events, RSVP & attendance tracking": /RSVP|attendance/i,
    "Chapter announcements to every member": /announcement/i,
    "Per-officer role-based access & handoff": /role-based|officer|handoff/i,
    "Alumni directory + Stripe donations": /alumni|donation/i,
    "One login your whole chapter shares": /one place|single source|one board/i,
  };

  it("every comparison capability maps to a feature keyword present in FEATURES", () => {
    const featuresBlock = src.slice(src.indexOf("const FEATURES"), src.indexOf("const LAUNCH_DAY"));
    for (const cap of capabilities) {
      const kw = FEATURE_KEYWORDS[cap];
      expect(kw, `no honesty-mapping declared for comparison row: "${cap}"`).toBeTruthy();
      expect(kw.test(featuresBlock), `comparison row "${cap}" has no matching shipped feature in FEATURES`).toBe(true);
    }
  });

  it("does not invent pricing — the DIY column uses $/✗ markers, not fabricated dollar amounts", () => {
    const compBlock = src.slice(src.indexOf("function Comparison()"), src.indexOf("function HowItWorks()"));
    // No "$NN" style fabricated prices inside the comparison component.
    expect(/\$\d/.test(compBlock)).toBe(false);
  });
});

describe("marketing comparison section — on theme + mobile-friendly", () => {
  const compBlock = src.slice(src.indexOf("function Comparison()"), src.indexOf("function HowItWorks()"));

  it("uses the royal-blue + gold theme tokens", () => {
    expect(compBlock).toMatch(/from-blue-600 to-sky-500/); // royal-blue check pill
    expect(compBlock).toMatch(/amber-/); // gold accent
    expect(compBlock).toContain("gs-gradient-text");
  });

  it("is responsive (mobile-safe column hiding / stacking)", () => {
    // The DIY tool name shows under the capability on mobile (sm:hidden) and in
    // its own column on sm+ (hidden ... sm:block) so nothing overflows at 375px.
    expect(compBlock).toMatch(/sm:hidden/);
    expect(compBlock).toMatch(/hidden[^"]*sm:block/);
    expect(compBlock).toMatch(/grid-cols-\[/); // explicit responsive grid
  });
});
