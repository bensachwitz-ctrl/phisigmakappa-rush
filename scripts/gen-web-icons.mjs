// scripts/gen-web-icons.mjs
//
// Generates the web / PWA / favicon icons (app/icon.png + app/apple-icon.png)
// from the CANONICAL navy seal VECTOR (brand/greekstack-seal.svg) — NOT a
// raster. Next App Router auto-serves app/icon.png at /icon.png (favicon + PWA)
// and app/apple-icon.png at /apple-icon.png (iOS "Add to Home Screen"); the
// manifest (app/manifest.webmanifest/route.ts) references both at 512×512.
//
//   node scripts/gen-web-icons.mjs
//
// v2 — the favicon/web icon now uses the SAME navy seal presentation as the
// native iOS/Android AppIcon (deep-navy tile #0B1B3A, ivory temple #F4F1E6,
// warm gold #E8B53A), so the browser tab, home-screen icon, and installed app
// icon read as ONE premium identity. The prior pale-ivory tile presentation
// read as washed-out/generic in a browser tab (owner flagged it "sloppy"); the
// navy seal is the canonical mark and pops on both light and dark tab bars.

import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const SEAL = path.join(root, "brand", "greekstack-seal.svg");
const APP = path.join(root, "app");
const SIZE = 512; // manifest declares 512×512 for /icon.png + /apple-icon.png

async function build() {
  const svg = fs.readFileSync(SEAL);
  // Web icons keep alpha (the rounded navy tile sits on whatever page bg —
  // the corners outside the rounded rect stay transparent).
  const buf = await sharp(svg, { density: 384 })
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp(buf).toFile(path.join(APP, "icon.png"));
  await sharp(buf).toFile(path.join(APP, "apple-icon.png"));
  console.log(`✓ app/icon.png + app/apple-icon.png (${SIZE}x${SIZE}) from greekstack-seal.svg`);
}

await build();
console.log("Done. Navy seal — tile #0B1B3A / ivory temple #F4F1E6 / gold #E8B53A");
