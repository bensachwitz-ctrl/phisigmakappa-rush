# Greek Stack — iOS Release Runbook (TestFlight + App Store)

How the **Greek Stack** iOS app gets built, signed, and shipped. The app is a
**Capacitor** native Swift host (`ios/App`) that ships a **bundled** member
client INSIDE the binary (`webDir: mobile-shell/`, loaded from
`capacitor://localhost` — there is **no** `server.url` pointing at the hosted
site). The bundled client talks to each chapter's backend over the existing
tenant-bound mobile APIs at an absolute, configurable API base
(`NEXT_PUBLIC_GS_API_BASE`, default `https://greekstack.vercel.app`): School →
Chapter picker → themed login → per-chapter dashboard (Feed, Events, Rush, Dues,
Directory, Profile, and an officer/Exec view), plus a no-login demo. Because the
primary UI is bundled (not a webview wrapper pointed at the website), this clears
the Apple Guideline 4.2 "minimum functionality / just a website" risk the old
`server.url` carried. Native value (push, haptics, biometric session, deep links,
offline cache) is wired in `lib/native-bridge.ts` and stays inert on the web.

The iOS binary is built on **Codemagic's macOS runners** (`codemagic.yaml`).
**It cannot be built on Windows** — Windows is only used to generate/maintain the
`ios/` project, which is committed to the repo so the build is deterministic.

---

## TL;DR — how to cut a release (after the one-time setup below is done)

```bash
git tag v1.0.0
git push origin v1.0.0
```

That's it. The `v*` tag triggers the `ios-testflight` Codemagic workflow, which
builds, signs, and uploads to **TestFlight Internal Testing**. Apple takes ~15
min to process the build before it appears for testers. You get an email on
success/failure (`bensachwitz@gmail.com`).

> Do NOT push a tag until the one-time owner setup is complete, or the build
> fails at the signing step. The web app is **not** redeployed by a tag — Vercel
> deploys independently from `main`.

---

## One-time owner setup

You do this once. Two required buckets: (A) Apple Developer / App Store Connect,
(B) Codemagic secrets. Budget ~30–45 min. (C) push (APNs) is **NOT required for
v1** — the shipped bundled shell does not use push (the push capability +
entitlement were removed; see Info.plist / App.entitlements). Section C is kept
only as reference for a future build that actually wires push.

### A. Apple Developer + App Store Connect

The pipeline now uses **automatic signing**, so you do NOT create or export a
distribution certificate or provisioning profile by hand — Codemagic fetches (and
creates on first run) both from the App Store Connect API key. You only need:

1. **App ID** — Developer portal → Certificates, IDs & Profiles → Identifiers →
   register an App ID with bundle id **`com.greekstack.app`**. Enable capabilities:
   - **Associated Domains** (for universal links)
   - Push Notifications is NOT needed for v1 (the shipped shell does not use push).
2. **App record** — App Store Connect → Apps → **+** → New App:
   - Platform: iOS · Name: **Greek Stack** · Bundle ID: `com.greekstack.app`
   - SKU: `greekstack-ios` · Primary language: English (U.S.)
3. **App Store Connect API key** — Users and Access → Integrations → App Store
   Connect API → generate a key with **App Manager** role (required so the CI can
   create the signing files). Download the **`AuthKey_XXXXXXXXXX.p8`** (one
   download only). Note the **Key ID** and the team **Issuer ID**.

> The distribution cert + App Store provisioning profile are created/fetched
> automatically on the first tagged build (`app-store-connect fetch-signing-files
> … --create`). No `.p12` / `.mobileprovision` to manage. (The older manual flow
> is preserved in "Appendix: manual signing" at the bottom if you ever need it.)

### B. Codemagic

1. Connect the **greek-stack** GitHub repo in Codemagic (it auto-detects
   `codemagic.yaml`).
2. Add the App Store Connect API key as a Codemagic **integration** named
   `codemagic` (Teams → Integrations → Apple → add the `.p8` + Key ID + Issuer
   ID). The workflow references `integrations: app_store_connect: codemagic`.
3. Create the secret environment-variable **group `greekstack_ios`** (App
   settings → Environment variables). With automatic signing there are now just
   **three** vars, all marked **Secret**:

   | Variable | Value |
   |---|---|
   | `APP_STORE_CONNECT_KEY_IDENTIFIER` | the ASC API **Key ID** (10 chars) |
   | `APP_STORE_CONNECT_ISSUER_ID` | the ASC API **Issuer ID** (UUID) |
   | `APP_STORE_CONNECT_PRIVATE_KEY_B64` | `base64 -i AuthKey_XXXX.p8` |

   On macOS, `base64 -i FILE | pbcopy` copies the value to paste into Codemagic.
   (On Linux use `base64 -w0 FILE`.) The old `IOS_DIST_*` / `IOS_PROFILE_*`
   secrets are no longer used — automatic signing derives the cert + profile from
   the API key, so you can leave them unset.

### C. Push notifications (APNs)

1. ✅ **DONE (2026-06-10)** — an APNs Auth Key exists: **Key ID `Q58634GVP5`**
   (name "claude", APNs enabled, Team-scoped), downloaded to
   `C:\Users\Bensa\.keys\apple\AuthKey_Q58634GVP5.p8` (local only — never
   commit). **Team ID `QFC852BYB6`.**
   ⚠️ The key's APNs Environment is currently **Sandbox-only** in the portal —
   edit the key (Certificates → Keys → claude) to allow Production before
   sending production pushes.
2. The same team-scoped .p8 works for every app on the team (BCG today, GS
   later) — no per-app registration needed; the `apns-topic` header selects
   the app.
3. Set the backend env vars (wherever GS server runs — Vercel) so
   `/api/mobile/push/register` tokens can actually be pushed:
   - `APNS_KEY_ID=Q58634GVP5`, `APNS_TEAM_ID=QFC852BYB6`,
     `APNS_PRIVATE_KEY` (the `.p8` contents — paste from the local file),
     `APNS_TOPIC=com.greekstack.app`.
   > The device-token capture + tenant-bound storage is already built
   > (`app/api/mobile/push/register/route.ts`, stored per-tenant in `SiteConfig`).
   > Wiring the actual *send* (a small APNs client) is the only remaining
   > server-side piece and is independent of shipping the app to TestFlight.

---

## What the Codemagic build does (per `v*` tag)

1. `npm ci` (installs `@capacitor/*` on the Mac).
2. Uses the **committed** `ios/App` project (only regenerates with `cap add ios`
   if somehow missing).
3. `npx cap sync ios` — resolves the plugin Swift packages (push, preferences,
   app, haptics, splash-screen, status-bar) and copies the boot shell.
4. Sets `MARKETING_VERSION` from the tag (`v1.0.0` → `1.0.0`) + a monotonic
   `CURRENT_PROJECT_VERSION` (Codemagic build number + 100).
5. Flips the **Release** config to Manual style (so xcodebuild honors the
   explicit fetched profile) + iPhone Distribution identity.
6. Re-asserts the push entitlement (committed in `App.entitlements`).
7. **Automatic signing**: `app-store-connect fetch-signing-files
   com.greekstack.app --type IOS_APP_STORE --create` fetches/creates the App
   Store distribution cert + profile from the ASC API key, `keychain
   add-certificates` installs the cert, and `xcode-project use-profiles` writes
   the profile into the build settings.
8. `xcodebuild archive` + `-exportArchive` (ExportOptions.plist also emitted by
   `use-profiles`) → signed `.ipa`.
9. Uploads to App Store Connect → **TestFlight Internal Testing**
   (`submit_to_testflight: true`).

Artifacts (the `.ipa`, build logs, dSYMs) are attached to the Codemagic build.

---

## Universal links (enables `https://…/app?chapter=` deep links)

The app declares `applinks:greekstack.com` etc. in `App.entitlements`. To make
tapping a chapter link open the app (instead of Safari), iOS fetches an
**apple-app-site-association** (AASA) file over HTTPS at the domain root, served
as `application/json` with **no** `.json` extension.

**✅ This file is now committed** at `public/.well-known/apple-app-site-association`
and served as `application/json` (the content-type is forced in `next.config.js`
→ `headers()`, since the extension-less file would otherwise be served as
octet-stream and rejected by iOS). After a deploy it is reachable at:

`https://greekstack.vercel.app/.well-known/apple-app-site-association`
(and at `https://greekstack.com/...` once the custom domain is pointed at Vercel —
all three hosts in `App.entitlements` resolve to the same Vercel deployment).

```json
{
  "applinks": {
    "apps": [],
    "details": [
      { "appID": "QFC852BYB6.com.greekstack.app", "paths": ["/app/*", "/r/*", "/public/*"] }
    ]
  }
}
```

> ✅ **DONE (2026-06-10):** the `<TEAMID>` placeholder has been replaced with the
> real **Apple Developer Team ID `QFC852BYB6`** (read from Apple Developer portal
> → Membership, account BENJAMIN FRANCIS SACHWITZ). The full `appID` is
> `QFC852BYB6.com.greekstack.app`. Takes effect on the next deploy. The 1-hour
> `Cache-Control` on the file means the change propagates quickly. You can verify
> with
> `curl -sI https://greekstack.vercel.app/.well-known/apple-app-site-association`
> (expect `content-type: application/json`) and
> [Apple's AASA validator](https://app-site-association.cdn-apple.com/a/v1/greekstack.vercel.app).

The `paths` cover the member app surface (`/app/*`) plus the short-link (`/r/*`)
and public (`/public/*`) namespaces reserved for future deep links. Until the
file is deployed, universal links simply fall back to opening in the browser —
the app still ships and works fine. Push-notification deep links use the
`greekstack://` custom scheme and need no AASA.

---

## From TestFlight to the public App Store

1. After a TestFlight build is processed, App Store Connect → your app → prepare
   the **1.0** version for submission.
2. Fill the listing from `ios/AppStore/` (metadata is drafted there) and upload
   the screenshots per `ios/AppStore/SCREENSHOT-PLAN.md`.
3. Answer App Privacy + the export-compliance question (no non-exempt
   encryption → "No").
4. Submit for review. Follow `ios/AppStore/SUBMISSION-CHECKLIST.md`.

---

## Appendix: manual signing (legacy fallback)

The pipeline now defaults to **automatic signing** (see the steps above). If you
ever need to pin an exact cert/profile by hand (e.g. enterprise distribution, or
to reproduce a specific historical build), the manual flow was:
- Create an iOS Distribution (App Store) cert, export it as a `.p12` with a
  password; create an App Store provisioning profile for `com.greekstack.app`,
  download the `.mobileprovision`, note its Name + UUID.
- Add the 5 secrets `IOS_DIST_P12_BASE64`, `IOS_DIST_P12_PASSWORD`,
  `IOS_PROFILE_BASE64`, `IOS_PROFILE_NAME`, `IOS_PROFILE_UUID` to the
  `greekstack_ios` group.
- Import the cert into a temp keychain, install the profile, and archive with
  `CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="iPhone Distribution"
  PROVISIONING_PROFILE_SPECIFIER="$IOS_PROFILE_NAME"`.

Automatic signing is preferred because it removes the two most common signing
failures ("No signing certificate" / "profile doesn't match") and 5 fragile
secrets, cutting first-time setup from ~45 min to ~10 min.

---

## Troubleshooting

- **"No signing certificate found"** → the ASC API key lacks the **App Manager**
  role (so `fetch-signing-files --create` can't provision a cert), or the
  `APP_STORE_CONNECT_PRIVATE_KEY_B64` is malformed. Re-check the three
  `APP_STORE_CONNECT_*` vars.
- **"Provisioning profile doesn't match"** → the App ID `com.greekstack.app` must
  have **Push Notifications + Associated Domains** enabled before the first
  fetch; if you toggled a capability after a profile was created, delete the
  stale profile in the portal and re-run (the build re-creates it).
- **"aps-environment not allowed"** → enable Push Notifications on the App ID;
  the next build re-fetches a profile that includes it.
- **Build number already exists** → ASC rejects a duplicate (version, build).
  Re-tag with a new patch version (`v1.0.1`) — the build number auto-increments.
- **App appears as iPad-compatible / asks for iPad screenshots** → confirm
  `TARGETED_DEVICE_FAMILY = 1` survived (committed as 1; CI re-asserts it).

Pairs with: `GS-MOBILE-APP.md` (architecture) · `codemagic.yaml` (the pipeline) ·
`ios/AppStore/` (listing + screenshots + checklist).
