import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

// ── GATE-3 FIX (mobile elections voting) ─────────────────────────────────────
// Elections are backend- + web-supported (/api/mobile/data returns election +
// myBallot; /api/mobile/elections/vote casts a secret ballot; the web has an
// ElectionsVoter), but the SHIPPED iOS client — the bundled Capacitor shell
// mobile-shell/index.html (and its byte-identical webDir copy) — had NO
// election/ballot/vote UI: the member tabbar was feed/events/rush/dues/directory
// /profile only, so a brother could not vote from the app the owner ships.
//
// This adds an Elections surface: a "Vote" tab + a feed spotlight that appear
// only while an election is open, a secret-ballot voter that POSTs to
// /api/mobile/elections/vote (mirroring the web contract), and a "No open
// elections" empty state. The suite pins that wiring against the real shell file
// (it runs pure-node, so it static-analyzes the source + evaluates the gate fn).

const ROOT = resolve(__dirname, "..");
const SHELL = readFileSync(resolve(ROOT, "mobile-shell/index.html"), "utf8");
const IOS_COPY = readFileSync(resolve(ROOT, "ios/App/App/public/index.html"), "utf8");

describe("bundled iOS shell — elections voting surface", () => {
  it("renders a member 'Vote' tab ONLY while an election is open", () => {
    // The gate helper + its use in the member tabbar (pushed before Profile).
    expect(SHELL).toMatch(/function electionOpen\(\)/);
    expect(SHELL).toMatch(/if \(electionOpen\(\)\) tabs\.push\(\["elections", "Vote"/);
    // The render dispatcher routes the elections tab to its paint fn.
    expect(SHELL).toMatch(/S\.tab === "elections"\)\s*paintElections\(main, d\)/);
  });

  it("has a paintElections surface with a 'No open elections' empty state", () => {
    expect(SHELL).toMatch(/function paintElections\(main, d\)/);
    expect(SHELL).toContain("No open elections");
  });

  it("surfaces an open election as a feed spotlight that opens the ballot", () => {
    // The feed paints an election spotlight (gated on electionOpen) that switches
    // to the Vote tab — so the ballot is discoverable from the home feed too.
    expect(SHELL).toMatch(/Open ballot|Review ballot/);
    expect(SHELL).toMatch(/S\.tab = "elections"; paintDashboard\(false\)/);
  });

  it("casts a SECRET ballot via the real /api/mobile/elections/vote route", () => {
    // The voter POSTs {seatId, candidateId} (authPost injects subdomain + token)
    // and adopts the refreshed {election, myBallot} the route returns. NOT a dead
    // control, NOT a fake toast.
    expect(SHELL).toMatch(/authPost\("\/api\/mobile\/elections\/vote", \{ seatId: seat\.id, candidateId: candidate\.id \}\)/);
    expect(SHELL).toMatch(/S\.data\.election = res\.data\.election/);
    expect(SHELL).toMatch(/S\.data\.myBallot = res\.data\.myBallot/);
    // One ballot per seat: an already-voted seat is not re-castable (locked) and
    // the 409 "already voted" path is handled.
    expect(SHELL).toContain("already voted");
  });

  it("reads the open election + the member's own ballots from /api/mobile/data", () => {
    // The surface consumes the SAME payload the data route returns.
    expect(SHELL).toMatch(/d\.election/);
    expect(SHELL).toMatch(/d\.myBallot/);
  });

  it("is a LOGIN-ONLY shell — no in-app demo election is baked in (demo showcase removed)", () => {
    // The shipped iOS client is login-only: the in-app demo (DEMO_CHAPTER +
    // sampleData()) was removed in favor of a logo hero + empty-state, and the
    // marketing demo now lives only on the website. So NO demo election is baked
    // into the binary — the elections surface appears only for a REAL signed-in
    // member whose chapter has a live ballot (server returns election/myBallot;
    // see electionOpen()). This guards against a demo showcase being reintroduced.
    expect(SHELL).not.toContain("el-demo");
    expect(SHELL).not.toMatch(/function sampleData\s*\(/);
    // The real election wiring (consumed from /api/mobile/data) is still present.
    expect(SHELL).toMatch(/d\.election/);
    expect(SHELL).toMatch(/d\.myBallot/);
  });

  it("the ios cap-synced copy is byte-identical to the source shell", () => {
    // The release gate (ios-shell-root) ships exactly this committed tree, so the
    // webDir copy must carry the same elections surface.
    expect(IOS_COPY).toBe(SHELL);
  });
});

// ── Behavioral: electionOpen() gate evaluated in a sandbox ────────────────────
// Evaluate the real helper from the shell against representative states to prove
// the tab/spotlight only appear when there's a live ballot (never an empty tab).
describe("electionOpen() gate (evaluated from the shell source)", () => {
  // Pull the function text out of the shell and run it in a sandbox with a
  // mutable S, exactly as the shell uses it.
  const fnMatch = SHELL.match(/function electionOpen\(\)\s*\{[\s\S]*?\}/);
  if (!fnMatch) throw new Error("electionOpen() not found in shell");

  function evalGate(data: unknown): boolean {
    const sandbox: any = { S: { data } };
    vm.createContext(sandbox);
    return vm.runInContext(`${fnMatch![0]}; electionOpen();`, sandbox);
  }

  it("false when there is no data / no election", () => {
    expect(evalGate(null)).toBe(false);
    expect(evalGate({})).toBe(false);
    expect(evalGate({ election: null })).toBe(false);
  });

  it("false when an election exists but has no seats", () => {
    expect(evalGate({ election: { id: "e", title: "x", seats: [] } })).toBe(false);
  });

  it("true when a live election with at least one seat is open", () => {
    expect(
      evalGate({ election: { id: "e", title: "x", seats: [{ id: "s1", title: "President", candidates: [] }] } }),
    ).toBe(true);
  });
});
