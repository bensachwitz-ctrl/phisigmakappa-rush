// scripts/gen-ios-assets.mjs
//
// Generates the iOS app icon + splash images for the Greek Stack Capacitor app
// from the brand mark (public/brand/greekstack-mark.png), writing them into the
// committed native project (ios/App/App/Assets.xcassets/...).
//
// Why a script (not @capacitor/assets): runs on Windows with the `sharp` we
// already depend on, no extra tooling, and the output is deterministic so the
// committed PNGs can be regenerated identically. Re-run after a brand refresh:
//   node scripts/gen-ios-assets.mjs
//
// App Store rules baked in:
//   • App icon is 1024x1024, FLATTENED (no alpha) — Apple rejects transparent icons.
//   • Icon corners stay square; iOS applies the rounded mask itself.
//   • Splash is a centered mark on the brand navy, exported at 2732x2732 (the
//     universal Capacitor splash size) so it covers every device/orientation.

import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// greekstack-mark-alt.png is the canonical GreekStack brand mark — a navy Greek
// temple/pediment with four columns on a warm rounded tile — already composed in
// app-icon form. (It is byte-identical to greekstack-mark.png; the "-alt" name is
// historical. Keep both regenerated from the SAME source so the favicon, the OG
// card, and this native icon can never drift apart.)
const MARK = path.join(root, "public", "brand", "greekstack-mark-alt.png");
const ICONSET = path.join(
  root,
  "ios/App/App/Assets.xcassets/AppIcon.appiconset",
);
const SPLASHSET = path.join(
  root,
  "ios/App/App/Assets.xcassets/Splash.imageset",
);

// Greek Stack brand navy (matches capacitor.config.ts backgroundColor + the
// boot shell in mobile-shell/index.html).
const NAVY = { r: 11, g: 18, b: 32, alpha: 1 }; // #0b1220
const GOLD = "#d4af37";

async function buildIcon() {
  const size = 1024;
  // The alt mark is already an icon-shaped composition on navy, so we let it
  // nearly fill the canvas (its own corner rounding is masked by iOS anyway).
  // The navy backdrop only shows in the corners iOS clips. Flatten + strip alpha
  // so the exported PNG has NO alpha channel (App Store requirement).
  const markSize = Math.round(size * 1.0);
  const mark = await sharp(MARK)
    .resize(markSize, markSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const offset = Math.round((size - markSize) / 2);

  const buf = await sharp({
    create: { width: size, height: size, channels: 4, background: NAVY },
  })
    .composite([{ input: mark, top: offset, left: offset }])
    .flatten({ background: NAVY }) // composite onto opaque navy
    .removeAlpha() // App Store requires NO alpha channel on the icon
    .png()
    .toBuffer();

  await sharp(buf).toFile(path.join(ICONSET, "AppIcon-512@2x.png"));
  console.log("✓ AppIcon-512@2x.png (1024x1024, no alpha)");
}

async function buildSplash() {
  const size = 2732;
  const markSize = Math.round(size * 0.24); // ~650px centered mark
  // Trim the white frame baked into the alt mark so the splash shows the icon
  // tile cleanly floating on the brand navy (no white box around it).
  const mark = await sharp(MARK)
    .trim({ threshold: 20 })
    .resize(markSize, markSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const offset = Math.round((size - markSize) / 2);

  const buf = await sharp({
    create: { width: size, height: size, channels: 4, background: NAVY },
  })
    .composite([{ input: mark, top: offset, left: offset }])
    .flatten({ background: NAVY })
    .removeAlpha()
    .png()
    .toBuffer();

  // Capacitor's Splash.imageset references three identical universal entries.
  for (const name of [
    "splash-2732x2732.png",
    "splash-2732x2732-1.png",
    "splash-2732x2732-2.png",
  ]) {
    await sharp(buf).toFile(path.join(SPLASHSET, name));
  }
  console.log("✓ Splash 2732x2732 (x3 universal entries)");
}

await buildIcon();
await buildSplash();
console.log("Done. Brand:", GOLD, "on", "#0b1220");
