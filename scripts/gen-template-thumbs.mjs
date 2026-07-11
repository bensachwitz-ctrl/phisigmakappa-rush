// gen-template-thumbs.mjs — emit a distinct 400x300 wireframe thumbnail per
// site-generator preset (item 6). Data-driven + extensible: add a spec entry and
// re-run `node scripts/gen-template-thumbs.mjs` to mint its card. Each card uses
// ONE accent (the family color) with a soft tint of the same hue — no second hue,
// no gradients-of-doom, no AI-violet — matching the anti-slop rules the live
// pages follow. classic/modern/bold.svg ship already and are left untouched.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "templates");
mkdirSync(OUT, { recursive: true });

// radius language per component set (mirrors component-sets.ts `radius`).
const RADII = { refined: 10, editorial: 0, brutal: 3, soft: 18, minimal: 6 };

// One spec per preset that needs a generated card. base = which hero archetype;
// set = component set (drives corner radius + chrome flags); accent/tint = the
// single family hue; flags tune the archetype (serif rules, offset shadow, depth).
const SPECS = [
  { id: "editorial",     base: "modern",  set: "editorial", accent: "#111827", tint: "#e5e7eb", serif: true },
  { id: "minimal",       base: "classic", set: "minimal",   accent: "#334155", tint: "#f1f5f9", quiet: true },
  { id: "cinematic",     base: "bold",    set: "soft",      accent: "#0f766e", tint: "#ccfbf1", depth: true },
  { id: "photo-story",   base: "modern",  set: "soft",      accent: "#0369a1", tint: "#e0f2fe", photo: true },
  { id: "gallery-grid",  base: "bold",    set: "refined",   accent: "#047857", tint: "#d1fae5", grid: true },
  { id: "zine",          base: "bold",    set: "editorial", accent: "#b91c1c", tint: "#fee2e2", serif: true, offset: true },
  { id: "civic-crest",   base: "classic", set: "brutal",    accent: "#1d4ed8", tint: "#dbeafe", offset: true },
];

const r = (x, y, w, h, fill, rad = 0, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rad}" fill="${fill}"${extra ? " " + extra : ""}/>`;

function heroClassic(a, tint, rad, s) {
  // centered crest + centered copy over a soft wash; the CTA reflects the set
  // (brutal → offset-shadow block, otherwise a rounded pill).
  const cta = s.offset
    ? [r(163, 129, 80, 16, "#0b1220", 2), r(160, 126, 80, 16, a, 2, `stroke="#0b1220" stroke-width="2"`)]
    : [r(160, 126, 80, 16, a, rad)];
  return [
    r(0, 0, 400, 150, tint),
    `<circle cx="200" cy="46" r="26" fill="${a}" opacity="0.9"/>`,
    r(150, 84, 100, 14, a, rad),
    r(120, 106, 160, 12, a, rad, 'opacity="0.55"'),
    ...cta,
  ].join("\n  ");
}
function heroModern(a, tint, rad, s) {
  // split: copy left, image block right
  return [
    r(0, 0, 400, 150, tint),
    r(24, 34, 110, 12, a, rad),
    r(24, 56, 150, 18, a, rad),
    r(24, 82, 120, 18, a, rad, 'opacity="0.6"'),
    r(24, 116, 84, 16, a, s.serif ? 0 : rad),
    r(232, 26, 144, 108, a, s.photo ? rad : rad, 'opacity="0.85"'),
    s.photo ? r(244, 92, 60, 34, "#ffffff", rad, 'opacity="0.85"') : "",
    s.photo ? r(312, 92, 52, 34, "#ffffff", rad, 'opacity="0.7"') : "",
  ].join("\n  ");
}
function heroBold(a, tint, rad, s) {
  // full-bleed banner: big hero block, centered headline, big stat row
  const layers = s.depth
    ? [r(-10, -6, 420, 168, a, 0, 'opacity="0.16"'), r(6, 8, 388, 150, a, 0, 'opacity="0.28"')]
    : [];
  return [
    r(0, 0, 400, 156, a, 0, 'opacity="0.92"'),
    ...layers,
    r(96, 44, 208, 20, "#ffffff", rad, 'opacity="0.95"'),
    r(120, 74, 160, 14, "#ffffff", rad, 'opacity="0.7"'),
    r(150, 118, 100, 18, "#ffffff", s.serif ? 0 : rad, 'opacity="0.9"'),
  ].join("\n  ");
}

function sectionBand(y, a, tint, rad, s) {
  // three cards; grid/refined = tidy borders, brutal = offset shadow, soft = pills
  const cards = [];
  const xs = [24, 148, 272];
  for (const x of xs) {
    if (s.offset) {
      cards.push(r(x + 3, y + 3, 104, 70, "#0b1220"));
      cards.push(r(x, y, 104, 70, "#ffffff", rad, `stroke="${a}" stroke-width="2"`));
    } else {
      cards.push(r(x, y, 104, 70, "#ffffff", rad, `stroke="${a}" stroke-opacity="0.25" stroke-width="1"`));
    }
    cards.push(`<circle cx="${x + 18}" cy="${y + 20}" r="8" fill="${a}" opacity="0.9"/>`);
    cards.push(r(x + 34, y + 15, 52, 8, a, 4, 'opacity="0.8"'));
    cards.push(r(x + 12, y + 40, 80, 7, a, 4, 'opacity="0.3"'));
    cards.push(r(x + 12, y + 52, 62, 7, a, 4, 'opacity="0.3"'));
  }
  return cards.join("\n  ");
}

const HEROES = { classic: heroClassic, modern: heroModern, bold: heroBold };

for (const s of SPECS) {
  const rad = RADII[s.set] ?? 8;
  const hero = HEROES[s.base](s.accent, s.tint, rad, s);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="${s.id} template wireframe">
  <rect width="400" height="300" fill="#f8fafc"/>
  ${hero}
  ${s.serif ? `<rect x="24" y="168" width="352" height="2" fill="${s.accent}" opacity="0.7"/>` : ""}
  ${sectionBand(190, s.accent, s.tint, rad, s)}
</svg>
`;
  writeFileSync(join(OUT, `${s.id}.svg`), svg, "utf8");
  console.log("wrote", `${s.id}.svg`);
}
