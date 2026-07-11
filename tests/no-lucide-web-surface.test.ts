import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";

// ────────────────────────────────────────────────────────────────────────────
// COVERAGE GUARD: the ENTIRE web surface (every .ts/.tsx under app/ and
// components/) must stay on the bespoke Greekstack icon barrel
// (@/components/brand/icons), never the generic lucide-react set.
//
// The mobile app/app surface was migrated first (guarded by
// no-lucide-app-surface.test.ts); this guard extends that guarantee to the whole
// web app after the platform-wide lucide -> bespoke migration, so no rendered
// page can ever mix two icon families again. It statically scans source text
// (the vitest suite runs in a pure-`node` env — see vitest.config.ts) and fails
// with the offending file list if any reintroduces a `from "lucide-react"`
// import.
// ────────────────────────────────────────────────────────────────────────────

const ROOT = resolve(__dirname, "..");
const SCAN_DIRS = ["app", "components"].map((d) => resolve(ROOT, d));

/** Recursively collect every .ts/.tsx file under a directory. */
function collectSource(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectSource(full));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))
    ) {
      out.push(full);
    }
  }
  return out;
}

// Matches a static ES import whose specifier is exactly "lucide-react".
const LUCIDE_IMPORT = /from\s*["']lucide-react["']/;

describe("web surface is free of raw lucide-react imports", () => {
  const files = SCAN_DIRS.flatMap(collectSource);

  it("finds source files to scan (sanity)", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("no .ts/.tsx under app/ or components/ imports from lucide-react", () => {
    const offenders = files
      .filter((f) => LUCIDE_IMPORT.test(readFileSync(f, "utf8")))
      .map((f) => relative(ROOT, f).replace(/\\/g, "/"));

    expect(
      offenders,
      `These web files still import lucide-react (migrate to @/components/brand/icons):\n${offenders.join(
        "\n",
      )}`,
    ).toEqual([]);
  });
});
