# Greek Stack — Companion iOS App ("Greek Stack")

Brothers + alumni download "Greek Stack", sign in (same creds as web), and access
their chapter on their phone — the same data as the website, mobile-native. Also
viewable in-browser via the web Sign-in button.

## Architecture (matches DailyTool/BCG Capacitor pattern)
- **Capacitor** wraps the responsive mobile client at `app/app/MobileAppClient.tsx` (route `/app`).
- `capacitor.config.ts`: `appId com.greekstack.app`, `appName "Greek Stack"`, `webDir mobile-shell`.
- **Now (v1):** `server.url` → `https://greekstack.vercel.app/app` (loads the hosted responsive client) + native shell (push, splash, status bar, deep links). Fast path; works the moment GS is deployed to Vercel.
- ⚠️ **Apple Guideline 4.2/4.7** — a pure webview wrapper risks rejection. We qualify by adding native value (all wired in `app/app/NativeBridge.tsx` + `lib/native-bridge.ts`): **push notifications** (events/announcements), **native sign-in + biometric unlock**, **universal/deep links** into a chapter, **offline cache** of the last view.
- **Long-term (v2, preferred):** bundle a **static export of the `/app` mobile SPA** into the binary (set `webDir` to that export, drop `server.url`) so the primary UI ships natively — fully App-Store-safe. The `/app` client already talks to the GS API, so it's a clean extraction.

## Native value layer (Apple 4.2 compliance) — how it's wired
Everything is **inert on web** and only activates inside the native shell. There are
**zero static `@capacitor/*` imports** in the web source — the bridge reaches the
plugins through the `window.Capacitor` runtime global the native shell injects, and
every function guards on `Capacitor.isNativePlatform()`. So the live web app
(`greekstack.vercel.app`) is byte-for-byte unchanged and `next build` succeeds even
though the native packages aren't installed in the Windows web build.

- **`lib/native-bridge.ts`** — the value layer:
  - **Push** (events/announcements): requests permission, registers with APNs, and
    POSTs the device token to `app/api/mobile/push/register` once the member is
    signed in. Tapping a push deep-links into the chapter.
  - **Native session + biometric**: persists the tenant-bound session via Capacitor
    `Preferences`; `unlockWithBiometricIfEnabled()` gates restore behind Face/Touch ID
    when the member opts in (fail-open to the stored session — the Bearer token is the
    real boundary, biometric is convenience).
  - **Deep / universal links**: `greekstack://chapter/<sub>` and
    `https://greekstack.vercel.app/app?chapter=<sub>` → routed into the right chapter.
  - **Offline cache**: snapshots the last good `/api/mobile/data` view (256KB-bounded)
    and falls back to it when the network drops.
- **`app/app/NativeBridge.tsx`** — mounts on `/app` (via `DemoLoader`), runs the bridge
  on launch, and publishes `window.GreekStackNative` (saveSession / clearSession /
  onSignedIn / cacheLastView / readLastView) for the client to call unconditionally.
- **`app/app/MobileAppClient.tsx`** — on real `/api/mobile/auth` success it saves the
  session + registers push; on sign-out it clears the device session; on data fetch it
  caches the view and recovers from cache when offline.
- **`app/api/mobile/push/register/route.ts`** — tenant-bound Bearer auth (mirrors
  `/api/mobile/data`), rate-limited, idempotent per device; stores tokens in per-tenant
  `SiteConfig` (**no DB migration required**). A chapter-A token can never register
  against chapter B (cross-tenant-safe by construction).

## Build / ship — how the owner ships to TestFlight
The iOS binary builds on **Codemagic (macOS/Xcode)** — it cannot be built on Windows.
`codemagic.yaml` at the repo root defines the `ios-testflight` workflow.

**To ship a build, the owner just pushes a `v*` git tag:**
```bash
git tag v1.0.0
git push origin v1.0.0
```
Codemagic auto-detects the tag and runs, on a Mac Mini M2:
1. `npm ci` (installs `@capacitor/*` from `package.json` on the Mac)
2. `npx cap add ios` (generates `ios/App/*` from `webDir: mobile-shell`)
3. `npx cap sync ios` (installs native plugin pods: push, preferences, app, …)
4. Sets `MARKETING_VERSION` from the tag (`v1.0.0` → `1.0.0`) + a monotonic build number
5. Patches signing (Manual/Release), iPhone-only, adds the `aps-environment` entitlement
6. Imports the iOS Distribution cert + provisioning profile, archives, exports the IPA
7. Uploads to App Store Connect → **TestFlight Internal Testing**

> **UPDATE (2026-06-10):** the `ios/App` Xcode project is now **committed** to the repo
> (Info.plist, app icon + splash, `App.entitlements`, URL scheme, signing settings) so
> the build is deterministic and the native config is reviewed in git rather than patched
> blind on every CI run. Only the transient/regenerated bits stay gitignored (`App/public`,
> `capacitor.config.json`, `config.xml`, `build/`, the cordova-plugins shim). `cap sync`
> runs on the Mac/CI to resolve the plugin Swift packages (Capacitor 8 = SPM, no CocoaPods).
> `cap add ios` is only a fallback if the committed project is ever missing.
> See **`IOS-RELEASE.md`** (owner runbook) + **`ios/AppStore/`** (submission kit).

### One-time Codemagic setup (owner)
Create the secret env-var group **`greekstack_ios`** (Codemagic UI → greek-stack →
Environment variables → Add group), all marked Secret:
- `APP_STORE_CONNECT_KEY_IDENTIFIER`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_PRIVATE_KEY_B64` (base64 of the `AuthKey_*.p8`)
- `IOS_DIST_P12_BASE64`, `IOS_DIST_P12_PASSWORD`
- `IOS_PROFILE_BASE64`, `IOS_PROFILE_NAME`, `IOS_PROFILE_UUID`

In the Apple Developer portal: the App ID `com.greekstack.app` and the provisioning
profile must have **Push Notifications** enabled, and an **APNs Auth Key (.p8)** uploaded
to App Store Connect, for push to function. App icon/splash use the Greek Stack brand
(gold `#d4af37` / navy `#0b1220`); the boot shell lives at `mobile-shell/index.html`.

## Status (2026-06-10) — READY TO TAG FOR TESTFLIGHT
- [x] `capacitor.config.ts` correct (`com.greekstack.app` / "Greek Stack" / `server.url` → `.../app`); StatusBar + SplashScreen plugins; safe-area handling; `allowNavigation` for GS origins. Stale v6 `mobile/` scaffold removed.
- [x] Capacitor deps declared in `package.json` (core/cli/ios/app/push-notifications/preferences/splash-screen/status-bar/haptics).
- [x] **Native `ios/App` Xcode project generated + COMMITTED** (`npx cap add ios` + `cap sync`, Capacitor 8 / SPM): Info.plist (bundle id, usage strings, `greekstack://` scheme, remote-notification bg mode, ATS-on), `App.entitlements` (aps-environment + associated-domains), AppDelegate APNs callbacks, brand app icon (1024, no-alpha) + splash (2732), iPhone-only, entitlements wired in pbxproj. `.gitattributes` keeps native source LF.
- [x] **Push-notification wiring** (events/announcements) + tenant-bound `/api/mobile/push/register` endpoint.
- [x] **Native session persistence + biometric unlock** (Capacitor Preferences + optional Face/Touch ID).
- [x] **Deep / universal links** into a chapter.
- [x] **Offline cache** of the last view.
- [x] **Haptics** (selection on tab change, impact on sign-in, success/error on toast) + status-bar re-assert — all inert on web.
- [x] **Web↔mobile cohesion**: notch-safe top bar (`env(safe-area-inset-top)`) + bottom nav (`env(safe-area-inset-bottom)`), native WebView polish (`@media (pointer: coarse)`: no tap-flash, no long-press callout, contained overscroll), ≥44px tap targets, full-bleed phone shell.
- [x] `codemagic.yaml` — iOS → TestFlight pipeline (valid YAML, `v*` trigger), uses the committed `ios/` project.
- [x] **`IOS-RELEASE.md`** (exact owner setup + how to cut a release) + **`ios/AppStore/`** (LISTING / SCREENSHOT-PLAN / SUBMISSION-CHECKLIST).
- [x] Web app unchanged: `npx tsc --noEmit` clean + `npx next build` green; native code inert on web; `npx cap sync` clean.
- [ ] (owner, one-time) populate the `greekstack_ios` secret group + enable Push on the App ID/profile + upload the APNs `.p8` (see `IOS-RELEASE.md`).
- [ ] (owner) wire the actual APNs *send* server-side (token capture/storage is done) + publish the AASA file for universal links + create `/support` + `/privacy` marketing pages.
- [ ] (v2) static export of `/app` → bundle into the binary (drop `server.url`).

Pairs with: `GREEK-STACK-PRODUCT-SPEC.md` (companion-app section) · `GREEK-STACK-RESOURCE-MAP.md` · Mobbin skills (mobile UX) · `OSS-USAGE-MAP` (Capacitor / mobile design).
