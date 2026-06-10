# Greek Stack — iOS Release Runbook (TestFlight + App Store)

How the **Greek Stack** iOS app gets built, signed, and shipped. The app is a
**Capacitor** native Swift host (`ios/App`) that loads the device-adaptive
`/app` client from `https://greekstack.vercel.app/app` (multitenant: a member
signs in → their chapter, per-chapter theming). Native value (push, haptics,
biometric session, deep links, offline cache) is wired in `lib/native-bridge.ts`
and stays inert on the web.

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

You do this once. Three buckets: (A) Apple Developer / App Store Connect,
(B) Codemagic secrets, (C) push (APNs). Budget ~45–60 min.

### A. Apple Developer + App Store Connect

1. **App ID** — Developer portal → Certificates, IDs & Profiles → Identifiers →
   register an App ID with bundle id **`com.greekstack.app`**. Enable capabilities:
   - **Push Notifications**
   - **Associated Domains** (for universal links)
2. **App record** — App Store Connect → Apps → **+** → New App:
   - Platform: iOS · Name: **Greek Stack** · Bundle ID: `com.greekstack.app`
   - SKU: `greekstack-ios` · Primary language: English (U.S.)
3. **Distribution certificate** — create an **iOS Distribution (App Store)**
   certificate (Developer portal or Xcode). Export it as a **`.p12`** with a
   password (you'll need both for Codemagic).
4. **Provisioning profile** — create an **App Store** distribution profile for
   `com.greekstack.app` using that distribution cert. Download the
   `.mobileprovision`. Note its **Name** and **UUID** (UUID is in the filename /
   `security cms -D -i profile.mobileprovision`).
5. **App Store Connect API key** — Users and Access → Integrations → App Store
   Connect API → generate a key with **App Manager** role. Download the
   **`AuthKey_XXXXXXXXXX.p8`** (one download only). Note the **Key ID** and the
   team **Issuer ID**.

> Prefer less manual work? Codemagic supports **automatic signing** via the App
> Store Connect API key alone (skip steps 3–4 and the `IOS_DIST_*` / `IOS_PROFILE_*`
> secrets). See "Alternative: automatic signing" at the bottom.

### B. Codemagic

1. Connect the **greek-stack** GitHub repo in Codemagic (it auto-detects
   `codemagic.yaml`).
2. Add the App Store Connect API key as a Codemagic **integration** named
   `codemagic` (Teams → Integrations → Apple → add the `.p8` + Key ID + Issuer
   ID). The workflow references `integrations: app_store_connect: codemagic`.
3. Create the secret environment-variable **group `greekstack_ios`** (App
   settings → Environment variables). All marked **Secret**:

   | Variable | Value |
   |---|---|
   | `APP_STORE_CONNECT_KEY_IDENTIFIER` | the ASC API **Key ID** (10 chars) |
   | `APP_STORE_CONNECT_ISSUER_ID` | the ASC API **Issuer ID** (UUID) |
   | `APP_STORE_CONNECT_PRIVATE_KEY_B64` | `base64 -i AuthKey_XXXX.p8` |
   | `IOS_DIST_P12_BASE64` | `base64 -i dist.p12` |
   | `IOS_DIST_P12_PASSWORD` | password you set on the `.p12` |
   | `IOS_PROFILE_BASE64` | `base64 -i profile.mobileprovision` |
   | `IOS_PROFILE_NAME` | the profile **Name** (e.g. `Greek Stack App Store`) |
   | `IOS_PROFILE_UUID` | the profile **UUID** |

   On macOS, `base64 -i FILE | pbcopy` copies the value to paste into Codemagic.
   (On Linux use `base64 -w0 FILE`.)

### C. Push notifications (APNs)

1. Developer portal → Keys → create an **APNs Auth Key (.p8)**. Download it.
2. App Store Connect → your app → (or Users & Access → Keys) upload/register the
   APNs key so the backend can send pushes. Note the **Key ID** + **Team ID**.
3. Set the backend env vars (wherever GS server runs — Vercel) so
   `/api/mobile/push/register` tokens can actually be pushed:
   - `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` (the `.p8` contents),
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
5. Flips the **Release** config to Manual signing + iPhone Distribution.
6. Re-asserts the push entitlement (committed in `App.entitlements`).
7. Imports the distribution cert + provisioning profile into a temp keychain.
8. `xcodebuild archive` + `-exportArchive` → signed `.ipa`.
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
      { "appID": "<TEAMID>.com.greekstack.app", "paths": ["/app/*", "/r/*", "/public/*"] }
    ]
  }
}
```

> ⚠️ **OWNER ACTION — replace `<TEAMID>`.** The committed file ships with a
> `<TEAMID>` placeholder. Before universal links work, edit
> `public/.well-known/apple-app-site-association` and replace `<TEAMID>` with your
> **Apple Developer Team ID** (a 10-character string like `A1B2C3D4E5`, found in
> Apple Developer portal → Membership, or App Store Connect). The full `appID` is
> then `TEAMID.com.greekstack.app`. Commit + redeploy. The 1-hour `Cache-Control`
> on the file means the change propagates quickly. You can verify with
> `curl -sI https://greekstack.vercel.app/.well-known/apple-app-site-association`
> (expect `content-type: application/json`) and
> [Apple's AASA validator](https://app-site-association.cdn-apple.com/a/v1/greekstack.vercel.app).

The `paths` cover the member app surface (`/app/*`) plus the short-link (`/r/*`)
and public (`/public/*`) namespaces reserved for future deep links. Until the
TEAMID is filled in, universal links simply fall back to opening in the browser —
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

## Alternative: automatic signing (fewer secrets)

If you'd rather not manage the `.p12`/profile manually, Codemagic can sign
automatically using just the App Store Connect API key:
- Keep the `app_store_connect: codemagic` integration + the three
  `APP_STORE_CONNECT_*` vars.
- Replace the manual cert/profile import + archive steps with Codemagic's
  `app-store-connect fetch-signing-files com.greekstack.app --type IOS_APP_STORE
  --create` + `keychain add-certificates` + `xcode-project use-profiles`. Drop the
  `IOS_DIST_*` / `IOS_PROFILE_*` secrets.
This trades a bit of CI YAML for not handling cert files by hand. The committed
manual-signing flow is kept as the default because it's the proven DailyTool /
Bar Crawl Golf pipeline.

---

## Troubleshooting

- **"No signing certificate found"** → the `.p12` didn't import; re-check
  `IOS_DIST_P12_BASE64` (no wrapping/newlines) and `IOS_DIST_P12_PASSWORD`.
- **"Provisioning profile doesn't match"** → `IOS_PROFILE_NAME` must equal the
  profile's exact Name, and the profile must include the distribution cert +
  the `com.greekstack.app` App ID with Push + Associated Domains.
- **"aps-environment not allowed"** → enable Push Notifications on the App ID and
  regenerate the provisioning profile.
- **Build number already exists** → ASC rejects a duplicate (version, build).
  Re-tag with a new patch version (`v1.0.1`) — the build number auto-increments.
- **App appears as iPad-compatible / asks for iPad screenshots** → confirm
  `TARGETED_DEVICE_FAMILY = 1` survived (committed as 1; CI re-asserts it).

Pairs with: `GS-MOBILE-APP.md` (architecture) · `codemagic.yaml` (the pipeline) ·
`ios/AppStore/` (listing + screenshots + checklist).
