import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, join, sep } from "node:path";

// ── SECONDARY (a): no em-dash in greek USER-FACING copy (grep-proof guard) ────
// House style bans the em-dash (—) and en-dash (–) from every USER-FACING string
// on the product (it reads as AI-authored). This guard sweeps the greek
// marketing / onboarding / login / portal / admin .tsx surfaces and fails if a
// RENDERED string (JSX text node, or a user-facing attribute like placeholder/
// title/aria-label/alt/label) contains one. Developer COMMENTS are intentionally
// out of scope (they're not shipped to a user), so the guard masks block + line
// comments before scanning, and a future edit that ships an em-dash to a user
// fails loudly here.

const ROOT = resolve(__dirname, "..");

// The user-facing surface roots. (Deliberately NOT the whole tree; these are
// the screens a member/officer/visitor actually reads.)
const SURFACE_DIRS = [
  "components/site",
  "app/onboard",
  "app/login",
  "app/portal",
  "components/admin",
  "app/admin",
];

const DASH = /[—–]/; // em-dash — and en-dash –

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}
function tsxFiles(dir: string): string[] {
  const abs = resolve(ROOT, dir);
  const out: string[] = [];
  function walk(d: string) {
    let names: string[];
    try {
      names = readdirSync(d); // string mode (avoids Dirent generic typing)
    } catch {
      return; // a surface dir may not exist in every checkout; skip cleanly
    }
    for (const name of names) {
      const p = join(d, name);
      if (/node_modules|\.next|\.git/.test(p)) continue;
      if (isDir(p)) walk(p);
      else if (name.endsWith(".tsx")) out.push(p);
    }
  }
  if (isDir(abs)) walk(abs);
  return out;
}

/** Blank out block + line comments (preserving offsets) so only shipped text is scanned. */
function maskComments(src: string): string {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  out = out
    .split("\n")
    .map((l) => {
      const i = l.indexOf("//");
      return i >= 0 ? l.slice(0, i) + l.slice(i).replace(/[^\n]/g, " ") : l;
    })
    .join("\n");
  return out;
}

/** Rendered segments that ship to a user: JSX text nodes + user-facing attrs. */
function renderedDashHits(masked: string): string[] {
  const hits: string[] = [];
  const textNodes = masked.match(/>[^<>{}]*[—–][^<>{}]*</g) || [];
  const attrs =
    masked.match(
      /(?:placeholder|title|aria-label|alt|label)\s*[:=]\s*["“][^"”]*[—–][^"”]*["”]/g,
    ) || [];
  for (const t of textNodes) hits.push(t.trim().slice(0, 80));
  for (const a of attrs) hits.push(a.trim().slice(0, 80));
  return hits;
}

const ALL_FILES = SURFACE_DIRS.flatMap(tsxFiles);

describe("no em/en-dash in greek user-facing copy", () => {
  it("discovers a meaningful number of surface files (sweep didn't silently break)", () => {
    expect(ALL_FILES.length).toBeGreaterThan(40);
  });

  it("no rendered JSX text or user-facing attribute ships an em-dash / en-dash", () => {
    const offenders: string[] = [];
    for (const f of ALL_FILES) {
      const src = readFileSync(f, "utf8");
      if (!DASH.test(src)) continue; // fast skip (most files have none anywhere)
      const masked = maskComments(src);
      const hits = renderedDashHits(masked);
      if (hits.length) {
        const rel = f.slice(ROOT.length + 1).split(sep).join("/");
        for (const h of hits) offenders.push(`${rel}  ::  ${h}`);
      }
    }
    expect(
      offenders,
      "These USER-FACING strings contain an em-dash or en-dash. House " +
        "style bans them in shipped copy: replace with a spaced hyphen ' - ', a " +
        "comma, or split the sentence. (Developer comments are exempt and ignored " +
        "by this guard.)\n  " + offenders.join("\n  "),
    ).toEqual([]);
  });
});
