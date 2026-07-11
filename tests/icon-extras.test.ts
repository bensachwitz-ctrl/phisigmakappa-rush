import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Glyph-coverage guard for the bespoke web-migration EXTRAS icon family
// (components/brand/icons/extras.tsx) — the remaining high-traffic interface
// glyphs the web surfaces used to borrow from lucide-react (add / download /
// file / editor toolbar / arrows / status / social). The vitest suite runs in a
// pure-`node` env (no DOM, no React JSX transform — see vitest.config.ts), so
// instead of rendering we statically assert the source is a complete, on-
// language icon set: every glyph is exported, built on the shared IconBase
// (24×24 grid + currentColor + themeable accent), carries real SVG geometry,
// passes its accent down (duotone), the module is lucide-free, and the whole set
// is wired into the public barrel so a full migration never has to mix families.

const ROOT = resolve(__dirname, "..");
const src = readFileSync(
  resolve(ROOT, "components/brand/icons/extras.tsx"),
  "utf8",
);
const barrel = readFileSync(
  resolve(ROOT, "components/brand/icons/index.ts"),
  "utf8",
);

const EXPECTED = [
  "IconPlus",
  "IconMinus",
  "IconMinusCircle",
  "IconCircle",
  "IconEdit",
  "IconDownload",
  "IconFileText",
  "IconClipboard",
  "IconCopy",
  "IconFolder",
  "IconReceipt",
  "IconDollarSign",
  "IconPercent",
  "IconScale",
  "IconLandmark",
  "IconArrowUp",
  "IconArrowDown",
  "IconChevronUp",
  "IconArrowSort",
  "IconRefresh",
  "IconUndo",
  "IconRedo",
  "IconReply",
  "IconTrendingDown",
  "IconSmartphone",
  "IconMonitor",
  "IconGlobe",
  "IconHome",
  "IconCompass",
  "IconLink",
  "IconUnlink",
  "IconInstagram",
  "IconLinkedin",
  "IconMusic",
  "IconParty",
  "IconPlay",
  "IconUserCheck",
  "IconUserX",
  "IconThumbsDown",
  "IconGripVertical",
  "IconStar",
  "IconFlame",
  "IconEye",
  "IconFilter",
  "IconSliders",
  "IconHourglass",
  "IconHistory",
  "IconLifebuoy",
  "IconBold",
  "IconItalic",
  "IconHeading",
  "IconList",
  "IconListOrdered",
  "IconQuote",
  "IconSave",
  "IconShirt",
  "IconSend",
] as const;

describe("bespoke icon extras family", () => {
  it("builds on the shared IconBase foundation (themeable, on-grid)", () => {
    expect(src).toContain('from "./icon-base"');
    expect(src).toContain("IconBase");
    expect(src).toContain("GS_ACCENT");
  });

  it("exports the GsIcon component type (the lucide LucideIcon stand-in)", () => {
    expect(src).toMatch(/export type GsIcon\b/);
    expect(barrel).toMatch(/type GsIcon/);
  });

  it.each(EXPECTED)("exports %s", (name) => {
    expect(src).toMatch(new RegExp(`export function ${name}\\b`));
  });

  it.each(EXPECTED)("re-exports %s through the public barrel", (name) => {
    expect(barrel).toContain(name);
  });

  it("draws every glyph with real SVG geometry + a duotone accent layer", () => {
    for (const name of EXPECTED) {
      const start = src.indexOf(`export function ${name}`);
      expect(start, `${name} missing`).toBeGreaterThanOrEqual(0);
      const after = src.slice(start + name.length);
      const nextIdx = after.indexOf("export function ");
      const body = nextIdx === -1 ? after : after.slice(0, nextIdx);
      expect(body, `${name} has no path/circle/rect/ellipse geometry`).toMatch(
        /<(path|circle|rect|ellipse)\b/,
      );
      expect(body, `${name} not duotone (no accent layer)`).toMatch(/accent/);
    }
  });

  it("has no leftover lucide import in the extras glyph module", () => {
    expect(src).not.toMatch(/from\s+["']lucide-react["']/);
  });
});
