# Greek Stack — Companion iOS App ("Greek Stack")

> **SINGLE SOURCE OF TRUTH: [`IOS-RELEASE.md`](./IOS-RELEASE.md).** This file is a
> short architecture overview. If anything here disagrees with `IOS-RELEASE.md`
> or the actual code/config (`capacitor.config.ts`, `ios/`, `mobile-shell/`),
> `IOS-RELEASE.md` + the code win.
>
> **This doc was rewritten (2026-07) to match the SHIPPED build.** It previously
> described an abandoned v1 design (`server.url` → hosted `/app`, push
> notifications, an `app/api/mobile/push/register` route, an `aps-environment`
> entitlement, and manual-signing secrets). **None of that ships.** Following the
> old text would make an owner enable an unused Push capability, provision
> obsolete signing secrets, and hunt for a push route that does not exist.

Brothers + alumni download "Greek Stack", sign in (same creds as web), and access
their chapter on their phone — the same data as the website, mobile-native.

## Architecture (as shipped)
- **Capacitor** native Swift host (`ios/App`) wrapping a **BUNDLED** member client
  that ships **inside the binary**.
- `capacitor.config.ts`: `appId com.greekstack.app`, `appName "Greek Stack"`,
  `webDir mobile-shell`, and **NO `server.url`** — Capacitor serves the bundled
  client from `capacitor://localhost` (an installed app, not a hosted-site
  wrapper). This is what clears the Apple Guideline 4.2/4.7 "pure webview wrapper"
  rejection risk.
- The bundled UI is a single dependency-free file: **`mobile-shell/index.html`**
  (School → Chapter picker → themed login → per-chapter dashboard: Feed, Events,
  Rush, Dues, Directory, Profile, Exec view + a no-login demo).
- It talks to each chapter's backend over the existing tenant-bound mobile APIs
  (`/api/mobile/auth`, `/api/mobile/data?subdomain=…`) at an absolute API base
  that is **hardcoded in `mobile-shell/index.html`** (default
  `https://greekstack.vercel.app`). To retarget a white-label / preview build,
  edit `window.__GS_API_BASE__` or the `<meta name="gs-api-base">` in that HTML.
  **`NEXT_PUBLIC_GS_API_BASE` does NOT reach the bundled shell** — it is read only
  by `lib/mobile-api-base.ts`, which powers the separate Next.js `/app` web route.

## Native value layer (Apple 4.2 compliance) — what the bundled shell ships
All inert on web, active only inside the native shell:
- **Session persistence** (Capacitor `Preferences`) — tenant-bound Bearer session
  survives relaunch.
- **Offline cache** of the last `/api/mobile/data` view, with fallback when the
  network drops.
- **Deep / universal links** into a chapter.
- **Haptics** (tab change, sign-in, toast success/error).

**NOT shipped in this binary (do not advertise as native value):**
- **Push notifications** — intentionally omitted. The shell declares no push
  capability, `aps-environment` entitlement, or remote-notification background
  mode (Apple 2.3.1: ship only capabilities actually used). There is **no**
  `app/api/mobile/push/register` route.
- **Biometric unlock** — `unlockWithBiometricIfEnabled()` lives in
  `lib/native-bridge.ts`, which powers the separate `/app` web route, **not** the
  bundled shell (and its plugin isn't bundled). Not part of this binary.

## Build / ship — how the owner ships to TestFlight
The iOS binary builds on **Codemagic (macOS/Xcode)** — it cannot be built on
Windows. `codemagic.yaml` at the repo root defines the pipeline; the committed
`ios/App` Xcode project is used (`cap sync` resolves the plugin Swift packages —
Capacitor 8 = SPM). Signing is **automatic** via the App Store Connect API key.

See **`IOS-RELEASE.md`** for the exact, current owner runbook (secrets to set,
how to cut a release, and the explicit "do NOT enable Push / leave the old
`IOS_DIST_*`/`IOS_PROFILE_*` secrets unset" guidance).

Pairs with: `IOS-RELEASE.md` (owner runbook, source of truth) ·
`GREEK-STACK-PRODUCT-SPEC.md` · `GREEK-STACK-RESOURCE-MAP.md` · `ios/AppStore/`.
