# Greek Stack — App Store Submission Checklist

Run top-to-bottom. Everything above the line is the owner's; the build/sign/upload
is automated by `codemagic.yaml` (see `IOS-RELEASE.md`).

## 0. Before the first TestFlight build
- [ ] Apple Developer Program membership active ($99/yr).
- [ ] App ID `com.greekstack.app` created with **Push Notifications** +
      **Associated Domains** capabilities.
- [ ] App record created in App Store Connect (name "Greek Stack", bundle id above).
- [ ] Distribution cert (.p12) + App Store provisioning profile created.
- [ ] App Store Connect API key (.p8) created (App Manager role).
- [ ] Codemagic `greekstack_ios` secret group populated (see IOS-RELEASE.md table).
- [ ] APNs Auth Key (.p8) created + uploaded (for push to actually deliver).

## 1. Ship a build to TestFlight
- [ ] `git tag v1.0.0 && git push origin v1.0.0`.
- [ ] Codemagic `ios-testflight` build goes green; `.ipa` uploaded.
- [ ] Build appears in App Store Connect → TestFlight (≈15 min after upload).
- [ ] Install via TestFlight on a real iPhone; smoke-test:
  - [ ] Launch shows the branded splash, then the chapter chooser / sign-in.
  - [ ] Demo chapter loads and all tabs work (Feed/Events/Rush/Dues/Directory).
  - [ ] Bottom nav sits above the home indicator (safe-area correct).
  - [ ] Sign in with a real test member; data loads from the live API.
  - [ ] Haptics fire on tab switches / actions; Face ID prompt (if enabled).
  - [ ] (If APNs send is wired) a test push arrives and deep-links in.

## 2. Listing (App Store Connect → Version 1.0 → Prepare for Submission)
- [ ] Name, subtitle, promo text, description, keywords from `LISTING.md`.
- [ ] Primary category **Education**, secondary **Social Networking**.
- [ ] Support URL `https://greekstack.com/support` — **page must be live**.
- [ ] Privacy Policy URL `https://greekstack.com/privacy` — **page must be live**.
- [ ] Screenshots uploaded for 6.9"/6.7" (per `SCREENSHOT-PLAN.md`); 6.5" optional.
- [ ] App icon shows (pulled from the build's asset catalog — 1024 icon is in the
      binary; ASC also wants a 1024 marketing icon, auto-derived from the build).
- [ ] Copyright "2026 Greek Stack".

## 3. App Privacy (Data collection questionnaire)
Answer truthfully. Greek Stack collects, scoped to the member's chapter:
- [ ] **Contact info** (name, email, phone) — linked to identity; for app
      functionality (roster/profile). Not used for tracking.
- [ ] **User content** (announcements, profile, rush notes) — app functionality.
- [ ] **Identifiers** (account/user id; APNs device token) — app functionality
      (push). Not for tracking.
- [ ] **Payments** are processed by Stripe on the web — declare per how dues flow.
- [ ] Tracking: **No** (no cross-app/ad tracking, no third-party ad SDKs).
- [ ] Set the privacy "nutrition label" accordingly; link the Privacy Policy URL.

## 4. App Review Information
- [ ] Sign-in required? Provide either the **no-login demo path** note OR a working
      test account (chapter + email + password) — see the review note in `LISTING.md`.
- [ ] Contact first/last name, phone, email for the reviewer.
- [ ] Notes pasted (the demo-access block from `LISTING.md`).

## 5. Version & compliance
- [ ] Export Compliance: uses only standard HTTPS/TLS → **No** non-exempt
      encryption (answer "No" to the encryption question, or set
      `ITSAppUsesNonExemptEncryption=false` if prompted).
- [ ] Content rights: you have rights to all content. Age rating **4+**.
- [ ] Answer the UGC questions (chapter officers moderate; content is private to a
      chapter, not public) — add the **block/report** affordance expectation if the
      reviewer flags it (UGC apps need a way to report; chapter admins remove members
      and content — note this if asked).

## 6. Submit
- [ ] Attach the processed TestFlight build to the 1.0 version.
- [ ] Click **Add for Review** → **Submit**.
- [ ] Watch email for the review result (typically 24–48h). Address any rejection,
      re-tag (`v1.0.1`) if a code change is needed, resubmit.

## Common rejection avoiders (Greek Stack-specific)
- **4.2 minimum functionality / "just a website"** — mitigated: the app adds push
  notifications, Face/Touch ID, haptics, deep links, and offline cache (native
  value layer in `lib/native-bridge.ts`). The review note explains this.
- **5.1.1 privacy / sign-in** — the no-login demo lets the reviewer exercise the
  app without an account; sign-in is only for a member's real chapter.
- **3.1.1 IAP** — chapter dues are real-world memberships processed via Stripe,
  not in-app digital goods → no Apple IAP required. Keep dues checkout external.
- **Dead URLs** — make sure `/support` and `/privacy` resolve before submitting.
