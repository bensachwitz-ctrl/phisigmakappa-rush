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
Capture each from the **live demo** at `greekstack.com/app` (load the Phi Sigma
Kappa demo chapter, or a good-looking custom chapter) so the shots show real,
themed UI:

1. **Feed / Home** — chapter announcements + the themed header.
   Caption: "Your chapter's home base."
2. **Events + Add to Calendar** — event list with the RSVP + add-to-calendar CTA.
   Caption: "Never miss an event. RSVP and add it to your calendar."
3. **Rush / Recruitment** — the PNM pipeline board (officer view).
   Caption: "Run recruitment from your phone."
4. **Dues** — the dues balance + pay screen.
   Caption: "See your dues. Pay in a tap."
5. **Directory** — roster/alumni list with profiles.
   Caption: "The whole chapter, in your pocket."
6. **Chapter chooser / theming** — the live re-skin showing it's themed to your
   letters. Caption: "Themed to your letters and colors."

## How to capture (no Mac needed for the captures)
The UI is the responsive web `/app`, so you can capture at exact device px in a
desktop browser:

1. Open `https://greekstack.com/app?demo=true` in Chrome.
2. DevTools → device toolbar → "Responsive" → set **1290 × 2796**, DPR 1.
3. Navigate to each surface above, capture a full-size screenshot
   (DevTools → "Capture screenshot"), save as `01-feed.png` … `06-theme.png`.
4. (Optional) Add a caption band in any image editor / the included brand colors
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
