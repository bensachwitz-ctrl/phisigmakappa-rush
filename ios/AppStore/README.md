# ios/AppStore — App Store submission kit

Everything needed to take Greek Stack from a TestFlight build to the public App
Store. The owner does the click-through in App Store Connect; this folder has the
paste-ready content so it's effectively one pass.

| File | What it is |
|---|---|
| `LISTING.md` | Name, subtitle, description, keywords, URLs, category, age rating, pricing, and the App Review demo-access note — all paste-ready, within Apple's char limits. |
| `SCREENSHOT-PLAN.md` | The 6-screenshot story, required device pixel sizes, and a no-Mac capture method (DevTools at exact device px). |
| `SUBMISSION-CHECKLIST.md` | Top-to-bottom checklist: pre-build setup → TestFlight smoke test → listing → App Privacy → review info → submit, plus Greek-Stack-specific rejection avoiders. |
| `screenshots/` | Drop exported screenshots here (`6.9/`, `6.5/`). |

Build/sign/upload itself is automated — see `../../IOS-RELEASE.md` and
`../../codemagic.yaml`. Architecture: `../../GS-MOBILE-APP.md`.

**Order of operations:** finish the one-time setup in `IOS-RELEASE.md` → tag a
release → smoke-test on TestFlight → fill the listing from `LISTING.md` → upload
screenshots from `SCREENSHOT-PLAN.md` → walk `SUBMISSION-CHECKLIST.md` → submit.
