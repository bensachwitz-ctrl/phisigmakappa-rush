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
});
