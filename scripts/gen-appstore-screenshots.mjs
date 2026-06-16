// scripts/gen-appstore-screenshots.mjs
//
// Deterministically renders the App Store screenshot set for the Greek Stack
// iOS listing WITHOUT a Mac/simulator, so the listing can be SUBMITTED from the
// no-Mac fallback path documented in ios/AppStore/SCREENSHOT-PLAN.md.
//
// WHY a script: a real on-device capture (TestFlight on an iPhone 16 Pro Max) is
// the gold standard, but it needs a Mac. This script renders the SAME six shell
// surfaces (Feed, Events, Rush, Dues, Directory, Exec) the bundled client ships
// (mobile-shell/index.html) as brand-accurate, full-bleed PNGs at the exact App
// Store device pixel sizes, using the `sharp` we already depend on (Windows-ok,
// no extra tooling). Output is byte-deterministic so the committed PNGs can be
// regenerated identically. Re-run after a brand/surface change:
//   node scripts/gen-appstore-screenshots.mjs
//
// Apple rules baked in:
//   • Primary required size = 6.9"/6.7" = 1290 x 2796 px (portrait).
//   • Optional 6.5" = 1242 x 2688 px.
//   • RGB, PNG, NO alpha channel (flattened onto opaque navy).
//   • 3–10 shots per size; we emit 6.
//
// These are a submittable stand-in. Replace with real on-device captures (same
// filenames, same sizes) once a TestFlight build is installed — the App Store
// Connect upload step is identical.

import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// ── Brand tokens — kept IDENTICAL to mobile-shell/index.html + capacitor.config.ts.
const BRAND = {
  bg: "#0b1220",
  bg2: "#0f1830",
  card: "#121d39",
  ink: "#e8eefc",
  muted: "#9fb0d0",
  brand: "#2563eb",
  brand2: "#1d4ed8",
  brand3: "#0284c7",
  accent: "#38bdf8",
  gold: "#d4af37",
  ok: "#34d399",
  line: "rgba(255,255,255,0.10)",
};
const NAVY = { r: 11, g: 18, b: 32, alpha: 1 }; // #0b1220

// Device sizes (portrait px). Primary first.
const SIZES = [
  { dir: "6.9", w: 1290, h: 2796 }, // required (6.9"/6.7")
  { dir: "6.5", w: 1242, h: 2688 }, // optional (nice to have)
];

const OUT = path.join(root, "ios", "AppStore", "screenshots");

// XML-escape caption text.
const esc = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));

// A small rounded-rect "card" helper for the mocked surface body.
function card(x, y, w, h, fill = BRAND.card, r = 28) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}" stroke="${BRAND.line}" stroke-width="2"/>`;
}
function line(x, y, w, h, fill = BRAND.muted, r = 8, opacity = 1) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}" opacity="${opacity}"/>`;
}
function chip(x, y, w, fill = BRAND.brand) {
  return `<rect x="${x}" y="${y}" width="${w}" height="46" rx="23" ry="23" fill="${fill}"/>`;
}

// Per-surface body builder (deterministic; pure layout, no randomness).
function surfaceBody(W, key) {
  const m = 70; // side margin
  const cw = W - m * 2;
  let y = 470;
  const out = [];
  const header = (title, sub) => {
    out.push(`<text x="${m}" y="${y}" fill="${BRAND.ink}" font-size="64" font-weight="800" font-family="-apple-system, system-ui, Segoe UI, Roboto, sans-serif">${esc(title)}</text>`);
    out.push(`<text x="${m}" y="${y + 52}" fill="${BRAND.muted}" font-size="34" font-family="-apple-system, system-ui, Segoe UI, Roboto, sans-serif">${esc(sub)}</text>`);
    y += 130;
  };
  const rowCard = (h, accent) => {
    out.push(card(m, y, cw, h));
    out.push(`<rect x="${m}" y="${y}" width="10" height="${h}" rx="5" fill="${accent}"/>`);
    out.push(line(m + 48, y + 44, Math.round(cw * 0.55), 30, BRAND.ink, 8, 0.92));
    out.push(line(m + 48, y + 100, Math.round(cw * 0.78), 22, BRAND.muted, 8, 0.7));
    if (h > 200) out.push(line(m + 48, y + 150, Math.round(cw * 0.4), 22, BRAND.muted, 8, 0.5));
    y += h + 36;
  };

  switch (key) {
    case "feed":
      header("Feed", "Chapter announcements + career posts");
      rowCard(240, BRAND.gold);
      rowCard(220, BRAND.brand);
      rowCard(220, BRAND.accent);
      break;
    case "events":
      header("Events", "RSVP and add to your calendar");
      rowCard(210, BRAND.brand);
      out.push(chip(m + 48, y - 210 + 150, 240, BRAND.brand2));
      rowCard(210, BRAND.gold);
      rowCard(200, BRAND.accent);
      break;
    case "rush":
      header("Rush", "Recruitment pipeline at a glance");
      // four stat tiles
      {
        const tw = (cw - 3 * 28) / 4;
        const labels = ["New", "Talked", "Bid", "Joined"];
        const vals = ["38", "21", "12", "9"];
        for (let i = 0; i < 4; i++) {
          const x = m + i * (tw + 28);
          out.push(card(x, y, tw, 220, BRAND.bg2, 24));
          out.push(`<text x="${x + tw / 2}" y="${y + 110}" fill="${BRAND.gold}" font-size="66" font-weight="800" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif">${vals[i]}</text>`);
          out.push(`<text x="${x + tw / 2}" y="${y + 170}" fill="${BRAND.muted}" font-size="30" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif">${labels[i]}</text>`);
        }
        y += 260;
      }
      rowCard(190, BRAND.brand);
      rowCard(190, BRAND.accent);
      break;
    case "dues":
      header("Dues", "See your balance. Pay in a tap.");
      out.push(card(m, y, cw, 320, BRAND.bg2, 28));
      out.push(`<text x="${m + 48}" y="${y + 90}" fill="${BRAND.muted}" font-size="34" font-family="-apple-system, system-ui, sans-serif">Balance due</text>`);
      out.push(`<text x="${m + 48}" y="${y + 190}" fill="${BRAND.ink}" font-size="96" font-weight="800" font-family="-apple-system, system-ui, sans-serif">$240.00</text>`);
      out.push(`<rect x="${m + 48}" y="${y + 232}" width="${cw - 96}" height="58" rx="29" fill="${BRAND.brand}"/>`);
      out.push(`<text x="${W / 2}" y="${y + 271}" fill="#ffffff" font-size="32" font-weight="700" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif">Pay online with Stripe</text>`);
      y += 360;
      rowCard(180, BRAND.gold);
      break;
    case "directory":
      header("Directory", "The whole chapter, in your pocket");
      for (let i = 0; i < 4; i++) {
        out.push(card(m, y, cw, 150));
        out.push(`<circle cx="${m + 90}" cy="${y + 75}" r="48" fill="${i % 2 ? BRAND.brand : BRAND.brand3}"/>`);
        out.push(line(m + 170, y + 50, Math.round(cw * 0.5), 28, BRAND.ink, 8, 0.92));
        out.push(line(m + 170, y + 96, Math.round(cw * 0.3), 22, BRAND.muted, 8, 0.6));
        y += 166;
      }
      break;
    case "exec":
      header("Exec tools", "Roster, reset links, announce, dues");
      {
        const items = ["Add / remove member", "Send password reset", "Post announcement", "Collect dues"];
        for (const it of items) {
          out.push(card(m, y, cw, 150));
          out.push(`<rect x="${m + 40}" y="${y + 45}" width="60" height="60" rx="16" fill="${BRAND.gold}"/>`);
          out.push(`<text x="${m + 130}" y="${y + 92}" fill="${BRAND.ink}" font-size="38" font-weight="700" font-family="-apple-system, system-ui, sans-serif">${esc(it)}</text>`);
          y += 166;
        }
      }
      break;
  }
  return out.join("\n");
}

// Build one full-screen SVG for a surface.
function screenshotSVG(W, H, { key, caption }) {
  const tabs = ["Feed", "Events", "Rush", "Dues", "Directory", "Profile"];
  const activeTab = { feed: 0, events: 1, rush: 2, dues: 3, directory: 4, exec: 5 }[key] ?? 0;
  const tabW = W / tabs.length;
  const tabBar = tabs
    .map((t, i) => {
      const cx = Math.round(tabW * i + tabW / 2);
      const on = i === activeTab;
      return (
        `<circle cx="${cx}" cy="${H - 150}" r="9" fill="${on ? BRAND.brand : BRAND.muted}"/>` +
        `<text x="${cx}" y="${H - 100}" fill="${on ? BRAND.ink : BRAND.muted}" font-size="24" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif">${esc(t)}</text>`
      );
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BRAND.bg}"/>
      <stop offset="1" stop-color="${BRAND.bg2}"/>
    </linearGradient>
    <linearGradient id="wm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${BRAND.brand2}"/>
      <stop offset="0.5" stop-color="${BRAND.brand}"/>
      <stop offset="1" stop-color="${BRAND.brand3}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Caption band (marketing overlay; Apple allows captions). -->
  <text x="${W / 2}" y="220" fill="${BRAND.ink}" font-size="58" font-weight="800" text-anchor="middle" font-family="-apple-system, system-ui, Segoe UI, Roboto, sans-serif">${esc(caption)}</text>
  <rect x="${W / 2 - 70}" y="262" width="140" height="8" rx="4" fill="${BRAND.gold}"/>

  <!-- Themed top bar: GreekStack wordmark crest. -->
  <g transform="translate(70, 330)">
    <rect x="0" y="0" width="64" height="64" rx="16" fill="${BRAND.card}" stroke="${BRAND.line}" stroke-width="2"/>
    <path d="M14 44 L32 18 L50 44 Z" fill="${BRAND.gold}"/>
    <rect x="20" y="44" width="24" height="6" fill="${BRAND.gold}"/>
    <text x="84" y="34" fill="${BRAND.ink}" font-size="40" font-weight="800" font-family="-apple-system, system-ui, sans-serif">Greek</text>
    <text x="218" y="34" fill="url(#wm)" font-size="40" font-weight="800" font-family="-apple-system, system-ui, sans-serif">Stack</text>
  </g>

  <!-- Surface body. -->
  ${surfaceBody(W, key)}

  <!-- Bottom tab bar. -->
  <rect x="0" y="${H - 230}" width="${W}" height="230" fill="${BRAND.bg}" opacity="0.6"/>
  <rect x="0" y="${H - 232}" width="${W}" height="2" fill="${BRAND.line}"/>
  ${tabBar}
</svg>`;
}

const SHOTS = [
  { file: "01-feed", key: "feed", caption: "Your chapter's home base." },
  { file: "02-events", key: "events", caption: "Never miss an event." },
  { file: "03-rush", key: "rush", caption: "See recruitment at a glance." },
  { file: "04-dues", key: "dues", caption: "See your dues. Pay in a tap." },
  { file: "05-directory", key: "directory", caption: "The whole chapter, in your pocket." },
  { file: "06-exec", key: "exec", caption: "Officer tools, built in." },
];

async function run() {
  for (const size of SIZES) {
    const dir = path.join(OUT, size.dir);
    mkdirSync(dir, { recursive: true });
    for (const shot of SHOTS) {
      const svg = screenshotSVG(size.w, size.h, shot);
      await sharp(Buffer.from(svg))
        .resize(size.w, size.h)
        .flatten({ background: NAVY }) // opaque navy — App Store requires NO alpha
        .removeAlpha()
        .png({ compressionLevel: 9 })
        .toFile(path.join(dir, `${shot.file}.png`));
      console.log(`✓ ${size.dir}/${shot.file}.png (${size.w}x${size.h})`);
    }
  }
  console.log("Done. Brand:", BRAND.gold, "on", BRAND.bg);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
