import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── "Draft with AI" composer affordance — honest, no dead control ─────────────
// The vitest env is `node` (no DOM), so the React render path can't run here.
// Instead we pin the affordance's HONESTY CONTRACT against the component source +
// its wiring, so a future edit can't regress it into a dead/misleading control:
//   • the trigger is DISABLED when the server probe reports not-configured
//   • it probes GET /api/ai/draft and POSTs to /api/ai/draft (never a fake call)
//   • a not-configured state shows the honest "AI drafting unavailable" tooltip
//   • the composer imports + wires DraftWithAI to populate the body textarea
// (The runtime auth/503/no-key behaviour that DRIVES the disable is covered
//  behaviorally in tests/ai-draft-route.test.ts.)

const ROOT = resolve(__dirname, "..");
const COMPONENT = readFileSync(resolve(ROOT, "components/admin/draft-with-ai.tsx"), "utf8");
const COMPOSER = readFileSync(resolve(ROOT, "components/admin/announcements-manager.tsx"), "utf8");

describe("DraftWithAI — honest, env-gated affordance", () => {
  it("probes the server for configured state before enabling", () => {
    expect(COMPONENT).toContain('fetch("/api/ai/draft"');
    // configured state seeded as null (probing) so the control is never enabled
    // before the server answers.
    expect(COMPONENT).toMatch(/useState<boolean \| null>\(null\)/);
  });

  it("disables the trigger when not configured (no dead control)", () => {
    // notConfigured derives from the probe; the trigger's disabled prop includes it.
    expect(COMPONENT).toMatch(/notConfigured\s*=\s*configured === false/);
    expect(COMPONENT).toMatch(/triggerDisabled\s*=.*notConfigured/);
    expect(COMPONENT).toMatch(/disabled=\{triggerDisabled\}/);
  });

  it("shows an honest tooltip when AI is unavailable", () => {
    expect(COMPONENT).toContain("AI drafting unavailable");
  });

  it("degrades honestly on a runtime 503 (key removed since probe)", () => {
    expect(COMPONENT).toMatch(/status === 503/);
    expect(COMPONENT).toMatch(/setConfigured\(false\)/);
  });

  it("never fabricates: only commits a draft when the server returns ok + draft", () => {
    expect(COMPONENT).toMatch(/json\?\.ok.*json\?\.draft|!json\?\.ok \|\| !json\?\.draft/);
    expect(COMPONENT).toContain("onDraft(json.draft");
  });

  it("uses the on-theme brand palette (navy / ivory / gold) + classical fonts", () => {
    expect(COMPONENT).toContain("#0B1B3A"); // navy
    expect(COMPONENT).toContain("#F4F1E6"); // ivory
    expect(COMPONENT).toContain("#E8B53A"); // gold
    expect(COMPONENT).toContain("font-display"); // Cinzel
    expect(COMPONENT).toContain("font-serif"); // Cormorant
  });

  it("is reduced-motion safe (spinner honors motion-reduce)", () => {
    expect(COMPONENT).toContain("motion-reduce:animate-none");
  });
});

describe("announcement composer — wires the AI affordance into the body field", () => {
  it("imports DraftWithAI", () => {
    expect(COMPOSER).toContain('import { DraftWithAI } from "@/components/admin/draft-with-ai"');
  });

  it("renders DraftWithAI and routes its output into the composer body", () => {
    expect(COMPOSER).toContain("<DraftWithAI");
    // The generated draft populates the EXISTING body field the officer edits.
    expect(COMPOSER).toMatch(/onDraft=\{\(text\) =>.*body: text/s);
  });
});
