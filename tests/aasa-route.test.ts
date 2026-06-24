import { describe, it, expect, beforeEach, afterEach } from "vitest";

// ── AASA route (app/.well-known/apple-app-site-association/route.ts) ──────────
// The universal-links association file is now served by an env-driven route
// (replacing the former static public/ file) so the Apple Developer Team ID
// lives in APPLE_TEAM_ID, not a committed artifact. This suite proves:
//   • served as application/json with the appID = <TEAMID>.com.greekstack.app
//     and the real scoped paths (/app, /app/*, /r/*, /public/*);
//   • APPLE_TEAM_ID overrides the default team id;
//   • an explicitly-blank APPLE_TEAM_ID returns 404 (honest inert state — never
//     a placeholder/broken appID iOS would cache).

import { GET } from "@/app/.well-known/apple-app-site-association/route";

describe("AASA route — env-driven Apple App Site Association", () => {
  const ORIGINAL = process.env.APPLE_TEAM_ID;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.APPLE_TEAM_ID;
    else process.env.APPLE_TEAM_ID = ORIGINAL;
  });
  beforeEach(() => {
    delete process.env.APPLE_TEAM_ID;
  });

  it("serves valid AASA JSON with the default team id when APPLE_TEAM_ID is unset", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);

    const body = await res.json();
    expect(Array.isArray(body.applinks.apps)).toBe(true);
    expect(body.applinks.apps).toHaveLength(0);
    expect(body.applinks.details).toHaveLength(1);
    const detail = body.applinks.details[0];
    // appID = <TEAMID>.<bundle id>; bundle id is com.greekstack.app.
    expect(detail.appID).toMatch(/^[A-Z0-9]+\.com\.greekstack\.app$/);
    // Real scoped deep-link paths are preserved (NOT a blanket "*").
    expect(detail.paths).toEqual(["/app", "/app/*", "/r/*", "/public/*"]);
  });

  it("uses APPLE_TEAM_ID when set", async () => {
    process.env.APPLE_TEAM_ID = "ABCDE12345";
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.applinks.details[0].appID).toBe("ABCDE12345.com.greekstack.app");
  });

  it("returns 404 (honest inert) when APPLE_TEAM_ID is explicitly blanked", async () => {
    process.env.APPLE_TEAM_ID = "   "; // whitespace → trims to empty
    const res = await GET();
    expect(res.status).toBe(404);
  });
});
