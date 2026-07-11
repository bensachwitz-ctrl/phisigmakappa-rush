import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";

// ────────────────────────────────────────────────────────────────────────────
// COVERAGE GUARD: the iOS /app surface must stay on the bespoke Greekstack icon
// barrel (@/components/brand/icons), never the generic lucide-react set.
//
// app/app/MobileAppClient.tsx + every surface/modal under app/app/_demo were
// migrated off raw lucide-react onto the bespoke duotone catalog. This test
// statically scans every .tsx under app/app/ and fails — with the offending
// file list — if any reintroduces a `from "lucide-react"` import, so a stray
// `import { IconClose as X } from "@/components/brand/icons";` can't silently regress the cohesion.
//
// Runs in the pure-`node` vitest env (no DOM / JSX transform — see
// vitest.config.ts), so it inspects source text rather than rendering.
// ────────────────────────────────────────────────────────────────────────────

const ROOT = resolve(__dirname, "..");
const APP_DIR = resolve(ROOT, "app/app");

/** Recursively collect every .tsx file under a directory. */
function collectTsx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectTsx(full));
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

// Matches a static ES import from "lucide-react" (single or double quotes) —
// the bare specifier OR any subpath (e.g. `from "lucide-react/icons"`), so a
// re-introduction can't evade the guard by importing through a subpath.
const LUCIDE_IMPORT = /from\s*["']lucide-react(\/|["'])/;

describe("app/app surface is free of raw lucide-react imports", () => {
  const files = collectTsx(APP_DIR);

  it("finds .tsx files to scan (sanity)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("no .tsx under app/app imports from lucide-react", () => {
    const offenders = files
      .filter((f) => LUCIDE_IMPORT.test(readFileSync(f, "utf8")))
      .map((f) => relative(ROOT, f).replace(/\\/g, "/"));

    expect(
      offenders,
      `These app/app files still import lucide-react (migrate to @/components/brand/icons):\n${offenders.join(
        "\n",
      )}`,
    ).toEqual([]);
  });
});
