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
`server.url` carried. Native value (haptics, biometric session, deep links,
offline cache) is wired in `lib/native-bridge.ts` and stays inert on the web.
Push notifications are intentionally NOT wired — the bundled shell declares no
push capability or `aps-environment` entitlement (Apple 2.3.1: only ship
capabilities actually used).

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
(B) Codemagic secrets. Budget ~30–45 min. There is **no push bucket** — the
shipped bundled shell does not use push notifications at all (no push capability,
no `aps-environment` entitlement, no APNs server piece; see Info.plist /
App.entitlements / `codemagic.yaml`). See "Push notifications" below for what a
future push build would need.

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

## Push notifications

**Push is NOT built and is NOT part of this release.** The shipped bundled shell
(`mobile-shell/index.html`) never registers for or consumes push, so:

- The committed `App.entitlements` / `Info.plist` omit the push entitlement and
  the `remote-notification` background mode (and `codemagic.yaml` strips them if a
  `cap add ios` regeneration ever re-adds them) — to avoid an Apple Guideline
  2.3.1 "unused capability" flag.
- There is **no** device-token register route (`app/api/mobile/push/register`
  does not exist) and **no** APNs send client on the server.
- The App ID does **not** need Push Notifications enabled (see section A).

A future build that genuinely wires push would need ALL of the following, none of
which exist today: re-add the push entitlement + background mode together;
enable Push Notifications on the `com.greekstack.app` App ID; build a device-token
register route with tenant-bound storage; create an APNs Auth Key (`.p8`) and set
the APNs backend env vars; and write a small APNs send client. Until that work is
done, treat push as out of scope.

---

## What the Codemagic build does (per `v*` tag)

1. `npm ci` (installs `@capacitor/*` on the Mac).
2. Uses the **committed** `ios/App` project (only regenerates with `cap add ios`
   if somehow missing).
3. `npx cap sync ios` — resolves the plugin Swift packages (preferences, app,
   haptics, splash-screen, status-bar — NO push) and copies the boot shell.
4. Sets `MARKETING_VERSION` from the tag (`v1.0.0` → `1.0.0`) + a monotonic
   `CURRENT_PROJECT_VERSION` (Codemagic build number + 100).
5. Flips the **Release** config to Manual style (so xcodebuild honors the
   explicit fetched profile) + iPhone Distribution identity.
6. Strips any push leftovers (`aps-environment` / push `UIBackgroundModes`) that a
   fallback `cap add ios` regeneration could have re-added — push is NOT used, so
   the committed `App.entitlements`/`Info.plist` omit it and this keeps it that way.
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
      { "appID": "QFC852BYB6.com.greekstack.app", "paths": ["/app", "/app/*", "/r/*", "/public/*"] }
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

The `paths` cover the member app surface (the bare `/app` entry point and
`/app/*`) plus the short-link (`/r/*`) and public (`/public/*`) namespaces
reserved for future deep links. Until the
file is deployed, universal links simply fall back to opening in the browser —
the app still ships and works fine. (The app also registers a `greekstack://`
custom scheme for direct deep links, which needs no AASA. Push is not used, so
there are no push-notification deep links.)

---

## From TestFlight to the public App Store

1. After a TestFlight build is processed, App Store Connect → your app → prepare
   the **1.0** version for submission.
2. Fill the listing from `ios/AppStore/` (metadata is drafted there) and upload
   the screenshots per `ios/AppStore/SCREENSHOT-PLAN.md`.
3. Answer App Privacy + the export-compliance question (no non-exempt
   encryption → "No"). The App Privacy answers must match the committed
   `ios/App/App/PrivacyInfo.xcprivacy` (no tracking, no collected-data types,
   UserDefaults required-reason `CA92.1` only) — the binary ships **no** tracking
   SDK, so answer **Tracking: No**. The full questionnaire walkthrough is in
   `ios/AppStore/SUBMISSION-CHECKLIST.md` § 3.
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
  have **Associated Domains** enabled before the first fetch (push is NOT used, so
  do NOT enable Push Notifications); if you toggled a capability after a profile
  was created, delete the stale profile in the portal and re-run (the build
  re-creates it).
- **"aps-environment not allowed"** → this should not occur (push is not used).
  The committed entitlements omit `aps-environment` and the build strips any
  leftover; if it appears, a `cap add ios` regeneration re-added push — re-run so
  the strip step removes it. Do NOT "fix" it by enabling Push on the App ID.
- **Build number already exists** → ASC rejects a duplicate (version, build).
  Re-tag with a new patch version (`v1.0.1`) — the build number auto-increments.
- **App appears as iPad-compatible / asks for iPad screenshots** → confirm
  `TARGETED_DEVICE_FAMILY = 1` survived (committed as 1; CI re-asserts it).

Pairs with: `GS-MOBILE-APP.md` (architecture) · `codemagic.yaml` (the pipeline) ·
`ios/AppStore/` (listing + screenshots + checklist).
