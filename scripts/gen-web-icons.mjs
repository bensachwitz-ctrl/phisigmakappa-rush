// scripts/gen-web-icons.mjs
//
// Generates the web / PWA / favicon icons (app/icon.png + app/apple-icon.png)
// from the CANONICAL light seal VECTOR (brand/greekstack-seal-light.svg) — NOT a
// raster. Next App Router auto-serves app/icon.png at /icon.png (favicon + PWA)
// and app/apple-icon.png at /apple-icon.png (iOS "Add to Home Screen"); the
// manifest (app/manifest.webmanifest/route.ts) references both at 512×512.
//
//   node scripts/gen-web-icons.mjs
//
// These are the LIGHT-tile presentation of the one canonical mark (ivory tile,
// navy temple, gold accents) — the same elevated geometry as the navy iOS seal,
// so the favicon, the in-app header logo, the maskable icon, and the native app
// icon all read as one identity. Replaces the cream navy-temple raster the
// owner flagged as "AI slop".

import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const SEAL_LIGHT = path.join(root, "brand", "greekstack-seal-light.svg");
const APP = path.join(root, "app");
const SIZE = 512; // manifest declares 512×512 for /icon.png + /apple-icon.png

async function build() {
  const svg = fs.readFileSync(SEAL_LIGHT);
  // Web icons keep alpha (the rounded ivory tile sits on whatever page bg).
  const buf = await sharp(svg, { density: 384 })
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp(buf).toFile(path.join(APP, "icon.png"));
  await sharp(buf).toFile(path.join(APP, "apple-icon.png"));
  console.log(`✓ app/icon.png + app/apple-icon.png (${SIZE}x${SIZE}) from greekstack-seal-light.svg`);
}

await build();
console.log("Done. Light tile #F7F5EE / navy temple #16264E / gold #C8901C");
