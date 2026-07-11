import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * P2 nav discovery audit — officer surfaces must be DOMAIN-gated, not adminOnly.
 *
 * `filterNavItems` short-circuits on `adminOnly:true` before the per-domain
 * check, so an officer-reachable page tagged adminOnly is invisible to the exact
 * officer who can use it (a dead-discovery mismatch). These tiles' pages + APIs
 * admit domain officers, so they must gate on the domain instead. Pins the fixes
 * for PNMs (#4), News (#3), Big/Little, and Exports so a future edit can't
 * silently re-hide them.
 */
const ROOT = resolve(__dirname, "..");
const nav = readFileSync(resolve(ROOT, "components/admin/admin-nav.tsx"), "utf8");
const pal = readFileSync(resolve(ROOT, "components/admin/command-palette.tsx"), "utf8");

function navLine(label: string): string {
  const line = nav.split("\n").find((l) => l.includes(`label: "${label}"`));
  if (!line) throw new Error(`nav item "${label}" not found`);
  return line;
}
function palLine(id: string): string {
  const line = pal.split("\n").find((l) => l.includes(`id: "${id}"`));
  if (!line) throw new Error(`command "${id}" not found`);
  return line;
}

const CASES: { label: string; cmdId: string; domain: string }[] = [
  { label: "PNMs", cmdId: "nav-rushees", domain: "rushPipeline" },
  { label: "News", cmdId: "nav-news", domain: "announcements" },
  { label: "Big/Little", cmdId: "nav-family", domain: "brothers" },
  { label: "Exports", cmdId: "act-exports", domain: "payments" },
];

describe("officer nav tiles are domain-gated, not adminOnly", () => {
  for (const { label, cmdId, domain } of CASES) {
    it(`${label} nav tile carries domain "${domain}" and is not adminOnly:true`, () => {
      const line = navLine(label);
      expect(line).toContain(`domain: "${domain}"`);
      expect(line).not.toContain("adminOnly: true");
    });
    it(`${cmdId} command entry carries domain "${domain}" and is not adminOnly:true`, () => {
      const line = palLine(cmdId);
      expect(line).toContain(`domain: "${domain}"`);
      expect(line).not.toContain("adminOnly: true");
    });
  }
});
