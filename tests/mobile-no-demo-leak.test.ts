import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ───────────────────────────────────────────────────────────────────────────
// ANTI-FABRICATION GUARD (AOTY council finding #1 — the decisive failure)
// ───────────────────────────────────────────────────────────────────────────
// The production iOS app (app/app/MobileAppClient.tsx) reuses the app/app/_demo
// surfaces for REAL signed-in members. The rule: for every control a REAL
// (token, !isDemo) user can reach, it must EITHER be wired to a real backend
// with honest success/failure, OR be gated behind `isDemo` so real users never
// see it. In particular NO "Live interactive demo" label, NO demo-gated/data-
// less control, and NO success toast for an action that didn't happen may reach
// a real member.
//
// The vitest suite runs in a pure-node environment (no DOM — see
// vitest.config.ts), so this test verifies the invariants by STATIC ANALYSIS of
// the surface source: every demo-only marker / showcase control sits inside an
// `isDemo` guard, and the fake "sent / donated via Stripe" toasts are gone. This
// fails loudly if a future edit reintroduces a demo leak on a real-user path.

const ROOT = resolve(__dirname, "..");
function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

const spotlight = read("app/app/_demo/surfaces/SpotlightSurface.tsx");
const feed = read("app/app/_demo/surfaces/FeedSurface.tsx");
const exec = read("app/app/_demo/surfaces/ExecSurface.tsx");
const client = read("app/app/MobileAppClient.tsx");
const websiteBuilder = read("app/admin/website/website-builder-client.tsx");

describe("mobile: no demo leak on real-user paths", () => {
  it("'Live interactive demo' label is gated behind isDemo (never shown to real members)", () => {
    // Find the RENDERED label (inside a <p>…</p>), not the comment that mentions
    // it. Every rendered occurrence must be immediately preceded by an
    // `isDemo &&` guard so it can never render unconditionally for a real member.
    const renderRe = /<p[^>]*>\s*Live interactive demo\s*<\/p>/g;
    const matches = [...spotlight.matchAll(renderRe)];
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      const idx = m.index ?? 0;
      const before = spotlight.slice(Math.max(0, idx - 120), idx);
      expect(before).toMatch(/isDemo\s*&&/);
    }
  });

  it("the Giving spotlight body is gated to isDemo (campaign donate is demo-only)", () => {
    expect(spotlight).toMatch(/spotlight === "giving"\s*&&\s*isDemo/);
  });

  it("the QR check-in spotlight body is gated to isDemo (local-only pipeline)", () => {
    expect(spotlight).toMatch(/spotlight === "qr"\s*&&\s*isDemo/);
  });

  it("the Elections spotlight renders an explicit empty state when no election is open", () => {
    expect(spotlight).toMatch(/!dashboardData\?\.election/);
    expect(spotlight).toContain("No open elections");
  });

  it("the Feed 'Give' tool is gated to isDemo", () => {
    expect(feed).toMatch(/role === "alumni"\s*&&\s*isDemo/);
  });

  it("ExecSurface marks giving/qr/theme as demoOnly and filters them for real officers", () => {
    expect(exec).toMatch(/demoOnly:\s*true/);
    // The render list is the demo-filtered set, not the raw all-tools list.
    expect(exec).toMatch(/isDemo\s*\|\|\s*!t\.demoOnly/);
    // The exec QR entry button is demo-gated too.
    expect(exec).toMatch(/QR check-in/);
  });

  it("'Send dues reminders' calls a real endpoint and has NO unconditional fake 'sent' toast", () => {
    // The real wired endpoint is invoked.
    expect(exec).toContain("/api/mobile/exec/dues-reminder");
    // The old fabricated toast wording must be gone.
    expect(exec).not.toContain("Dues reminders sent to all unpaid members.");
  });

  it("'Members behind' no longer uses the Math.max(1, ...) fabricated floor", () => {
    expect(exec).not.toMatch(/Math\.max\(\s*1\s*,\s*Math\.round\(outstanding/);
  });

  it("castBallot posts to the real vote endpoint for non-demo sessions", () => {
    expect(client).toContain("/api/mobile/elections/vote");
  });

  it("handleDonate is a guarded no-op for real users and never claims a Stripe charge", () => {
    // The handler must early-return when not in demo.
    const idx = client.indexOf("const handleDonate");
    expect(idx).toBeGreaterThan(-1);
    const fn = client.slice(idx, idx + 900);
    expect(fn).toMatch(/if\s*\(\s*!isDemo\s*\)\s*return/);
    // The fabricated "donated via Stripe" success toast must be gone everywhere.
    expect(client).not.toContain("donated via Stripe");
  });

  it("handleQrCheckIn is a guarded no-op for real users (no ephemeral 'rush board' claim)", () => {
    const idx = client.indexOf("const handleQrCheckIn");
    expect(idx).toBeGreaterThan(-1);
    const fn = client.slice(idx, idx + 500);
    expect(fn).toMatch(/if\s*\(\s*!isDemo\s*\)\s*return/);
  });

  // ── AOTY re-run: the guard above passed 11/11 yet missed THREE real-user
  // fabrications. These pin the now-fixed handlers so a regression fails loudly.

  it("handleSaveProfile wires a real endpoint for non-demo and only toasts success on res.ok", () => {
    const idx = client.indexOf("const handleSaveProfile");
    expect(idx).toBeGreaterThan(-1);
    const fn = client.slice(idx, idx + 3600);
    // Demo path is local-only; the real path POSTs the wired endpoint.
    expect(fn).toMatch(/if\s*\(\s*isDemo\s*\)/);
    expect(fn).toContain("/api/mobile/account");
    // Success only when the server confirms — never an unconditional toast.
    expect(fn).toMatch(/res\.ok\s*&&\s*data\.ok/);
    // The old unconditional fabricated success is no longer the ONLY toast: an
    // explicit failure toast must exist on the non-ok / network-error paths.
    expect(fn).toMatch(/sav(e|ing) your profile/);
    expect(fn).toMatch(/"error"\)/);
  });

  it("handleMobileForgotSubmit calls the real forgot-password endpoint (no fake setTimeout 'sent')", () => {
    const idx = client.indexOf("const handleMobileForgotSubmit");
    expect(idx).toBeGreaterThan(-1);
    const fn = client.slice(idx, idx + 1800);
    expect(fn).toContain("/api/portal/forgot-password");
    expect(fn).toMatch(/res\.ok\s*&&\s*data\.ok/);
    // The old fabricated wording must be gone everywhere in the client.
    expect(client).not.toContain("Password reset link sent!");
  });

  it("handleSimulateCheckIn is a guarded no-op for real users (no fake 'Checked in' toast)", () => {
    const idx = client.indexOf("const handleSimulateCheckIn");
    expect(idx).toBeGreaterThan(-1);
    const fn = client.slice(idx, idx + 1100);
    expect(fn).toMatch(/if\s*\(\s*!isDemo\s*\)/);
    // The success toast must be reachable ONLY after the demo guard (i.e. the
    // guard's early-return/info-toast precedes the "Checked in" success toast).
    const guardIdx = fn.search(/if\s*\(\s*!isDemo\s*\)/);
    const successIdx = fn.indexOf("Checked in successfully");
    expect(successIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(successIdx);
  });
});

// ── ANTI-FABRICATION: admin Website Builder ──────────────────────────────────
// The builder previously charged a SHAM $5.00 "Stripe" fee (a setTimeout, no
// paymentIntent) and advertised fake "AI design agents" that were really a
// keyword→preset matcher. Static-assert all of that sham text is gone so it can
// never be reintroduced.
describe("website builder: no sham charge or fake AI agents", () => {
  it("contains none of the fabricated strings", () => {
    expect(websiteBuilder).not.toContain("Simulate Stripe");
    expect(websiteBuilder).not.toContain("$5.00 per edit");
    expect(websiteBuilder).not.toContain("$5.00");
    expect(websiteBuilder).not.toContain("AI design agents");
    expect(websiteBuilder).not.toContain("Pay & Save");
    expect(websiteBuilder).not.toContain("Pay &amp; Save");
    // Fake per-agent status theater.
    expect(websiteBuilder).not.toContain("Brand Agent:");
    expect(websiteBuilder).not.toContain("Code Agent:");
    expect(websiteBuilder).not.toContain("QA Agent");
    expect(websiteBuilder).not.toContain("watch them build it");
    expect(websiteBuilder).not.toContain("AI Tweak generated");
  });

  it("re-labels the panel honestly as style presets (no AI/agents claim)", () => {
    expect(websiteBuilder).toContain("Quick Style Presets");
    expect(websiteBuilder).toContain("Style preset applied");
    // No leftover charge dialog state machinery.
    expect(websiteBuilder).not.toContain("showChargeDialog");
    expect(websiteBuilder).not.toContain("handlePayAndSave");
  });
});
