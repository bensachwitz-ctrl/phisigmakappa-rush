import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { officerToolset } from "@/lib/officer-tools";

// ── Item-3: run-for-a-position interest (member-side of the officer tools) ────
// A non-exec brother records interest; the CURRENT holder of that role is
// notified by seeing it in their officer tools. The holder match uses the SAME
// officerToolset role resolution both sides share.

const root = (...p: string[]) => resolve(__dirname, "..", ...p);

describe("holder matching (mirror the route's officerToolset role match)", () => {
  const sameRole = (a: string, b: string) =>
    officerToolset(a).roleKey === officerToolset(b).roleKey && officerToolset(a).roleKey !== "member";

  it("matches a Treasurer interest to the sitting Treasurer", () => {
    expect(sameRole("Treasurer", "Treasurer")).toBe(true);
    expect(sameRole("Chapter Treasurer", "Treasurer")).toBe(true);
  });
  it("does NOT match a Treasurer interest to the President", () => {
    expect(sameRole("Treasurer", "President")).toBe(false);
  });
  it("a plain member string never matches a holder", () => {
    expect(sameRole("Active Member", "Active Member")).toBe(false);
  });
});

describe("position-interest wiring source-pins", () => {
  it("the POST route is brother-only and records a durable PositionInterest", () => {
    const src = readFileSync(root("app/api/mobile/position-interest/route.ts"), "utf8");
    expect(src).toMatch(/sess\.role !== "brother"/); // alumni/pnm rejected
    expect(src).toMatch(/positionInterest\.(create|update|findFirst)/);
  });

  it("the mobile data route surfaces positionInterests to the current holder", () => {
    const src = readFileSync(root("app/api/mobile/data/route.ts"), "utf8");
    expect(src).toMatch(/positionInterest\.findMany/);
    expect(src).toMatch(/positionInterests,/); // returned in the payload
  });

  it("PositionInterest is declared in the prisma schema + additive tenant DDL", () => {
    const prisma = readFileSync(root("prisma/schema.prisma"), "utf8");
    expect(prisma).toMatch(/model PositionInterest \{/);
    const sql = readFileSync(root("lib/schema.sql"), "utf8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "PositionInterest"/);
  });

  it("the client shows a run-for-position prompt only to a non-officer brother member view", () => {
    const src = readFileSync(root("app/app/MobileAppClient.tsx"), "utf8");
    expect(src).toMatch(/Want to run for a position\?/);
    // gated on member persona + brother role + (demo OR not exec-allowed)
    expect(src).toMatch(/isDemo \|\| !execAllowed/);
  });
});
