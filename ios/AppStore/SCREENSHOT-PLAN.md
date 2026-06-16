# Greek Stack — App Store Screenshot Plan

Apple requires screenshots for the largest iPhone display; everything else is
optional (Apple down-scales). Submit the **6.7"/6.9"** set; optionally add 6.5".

## Required device sizes
| Display | Device | Portrait px | Required? |
|---|---|---|---|
| 6.9" / 6.7" | iPhone 16 Pro Max / 15 Pro Max | **1290 × 2796** | **Yes (primary)** |
| 6.5" | iPhone 11 Pro Max / XS Max | 1242 × 2688 | Optional (nice to have) |
| 5.5" | iPhone 8 Plus | 1242 × 2208 | No (deprecated for new apps) |

- 3–10 screenshots per size. We plan **6**.
- No alpha/transparency. RGB, PNG or JPEG.
- No device frames required (Apple shows them framed); a clean full-bleed capture
  of the app is fine. Captions/marketing overlays are allowed and recommended.

## The 6 screenshots (story order = how a member uses the app)
Every shot below is a REAL surface in the shipped bundled app — capture them from
a TestFlight build (gold standard) or, for the no-Mac fallback, from the same
bundled client in a desktop browser (see "How to capture"). All six are reachable
with NO login via the in-app demo, so you can capture them without credentials:

1. **Feed / Home** — chapter announcements + career posts + the themed header.
   Caption: "Your chapter's home base."
2. **Events + Add to Calendar** — event list with the RSVP + add-to-calendar CTA.
   Caption: "Never miss an event. RSVP and add it to your calendar."
3. **Rush / Recruitment** — the recruitment pipeline board (counts + prospects).
   Caption: "See recruitment at a glance."
4. **Dues** — the dues balance hero + the "Pay online with Stripe" action.
   Caption: "See your dues. Pay in a tap."
5. **Directory** — actives + alumni list with profiles.
   Caption: "The whole chapter, in your pocket."
6. **Exec view** — the officer tools (roster add/remove, reset links, announce,
   dues collection) via the Member/Exec switcher. Caption: "Officer tools, built in."

> Optional 7th: the School → Chapter picker / themed login showing the per-chapter
> re-skin ("Themed to your letters and colors").

## Fastest path (no Mac, no browser): the generator script
`node scripts/gen-appstore-screenshots.mjs` deterministically renders the full
6-shot set at BOTH required sizes (1290×2796 + 1242×2688) straight into
`ios/AppStore/screenshots/6.9/` and `…/6.5/`, using the same brand tokens as the
bundled shell (navy `#0b1220`, royal-blue `#2563eb`, gold `#d4af37`). The output
PNGs are RGB, no-alpha, and committed — so the listing can be **submitted today**.
Re-run after a brand/surface change. Replace with real on-device captures (same
filenames/sizes) once a TestFlight build exists — they're the gold standard.

## How to capture (no Mac needed for the captures)
The shipped UI is the bundled client at `mobile-shell/index.html`. Capture at exact
device px in a desktop browser:

1. Serve the bundled client and open it in Chrome, e.g.
   `npx serve mobile-shell -l 3220` then `http://localhost:3220/`.
   (Or open the same demo on the web at `https://greekstack.com/app?demo=true` —
   the web /app mirrors the same surfaces.)
2. DevTools → device toolbar → "Responsive" → set **1290 × 2796**, DPR 1.
3. Tap "See the live demo — no sign in", navigate to each surface above (use the
   bottom tabs + the Member/Exec switcher for shot 6), capture a full-size
   screenshot (DevTools → "Capture screenshot"), save as `01-feed.png` …
   `06-exec.png`.
4. (Optional) Add a caption band in any image editor / the brand colors
   (navy `#0b1220`, gold `#d4af37`).
5. Repeat at **1242 × 2688** if you want the 6.5" set.

> A real on-device capture (iPhone 16 Pro Max screenshots) is the gold standard
> once a TestFlight build is installed — use those if available; the browser
> method is the no-Mac fallback that still meets the pixel requirements.

## Optional: App Preview video
Not required. If added later: 15–30s, captured on-device, same device sizes.

## Save location
Put exported files in `ios/AppStore/screenshots/6.9/` and `…/6.5/` (gitignored if
large; otherwise commit — they're a few hundred KB each). Upload to App Store
Connect → Version → Media.
