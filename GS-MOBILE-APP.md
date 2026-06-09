# Greek Stack — Companion iOS App ("Greek Stack")

Brothers + alumni download "Greek Stack", sign in (same creds as web), and access
their chapter on their phone — the same data as the website, mobile-native. Also
viewable in-browser via the web Sign-in button.

## Architecture (matches DailyTool/BCG Capacitor pattern)
- **Capacitor** wraps the responsive mobile client at `app/app/MobileAppClient.tsx` (route `/app`).
- `capacitor.config.ts`: `appId com.greekstack.app`, `appName "Greek Stack"`.
- **Now (v1):** `server.url` → `https://greeklifesystems.vercel.app/app` (loads the hosted responsive client) + native shell (push, splash, status bar). Fast path; works the moment GS is deployed to Vercel.
- ⚠️ **Apple Guideline 4.2/4.7** — a pure webview wrapper risks rejection. We qualify by adding native value: **push notifications** (events/announcements), **native sign-in + biometric unlock**, **universal/deep links** into a chapter, **offline cache** of the last view.
- **Long-term (v2, preferred):** bundle a **static export of the `/app` mobile SPA** into the binary (set `webDir` to that export, drop `server.url`) so the primary UI ships natively — fully App-Store-safe. The `/app` client already talks to the GS API, so it's a clean extraction.

## Build / ship (same as DT/BCG)
- iOS build runs on **Codemagic** (macOS/Xcode) triggered by a `v*` tag — add a `codemagic.yaml` mirroring DT/BCG (signing via stored ASC keys → TestFlight). `npx cap add ios` + `cap sync` run on the Mac/CI (not Windows).
- App icon/splash from the Greek Stack brand (gold/navy).

## Status (2026-06-09)
- [x] `capacitor.config.ts` + boot shell (`mobile-shell/index.html`) + deps scaffolded.
- [ ] Add Capacitor deps install + `npx cap add ios` (on Mac/CI).
- [ ] Push-notification wiring (events/announcements) — native value for Apple compliance.
- [ ] Native sign-in / biometric unlock.
- [ ] `codemagic.yaml` for the iOS → TestFlight pipeline.
- [ ] (v2) static export of `/app` → bundle into the binary.

Pairs with: `GREEK-STACK-PRODUCT-SPEC.md` (companion-app section) · `GREEK-STACK-RESOURCE-MAP.md` · Mobbin skills (mobile UX) · `OSS-USAGE-MAP` (Capacitor / mobile design).
