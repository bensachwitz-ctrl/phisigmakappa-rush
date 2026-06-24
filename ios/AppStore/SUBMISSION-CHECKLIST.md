# Greek Stack — App Store Submission Checklist

Run top-to-bottom. Everything above the line is the owner's; the build/sign/upload
is automated by `codemagic.yaml` (see `IOS-RELEASE.md`).

## 0. Before the first TestFlight build
- [ ] Apple Developer Program membership active ($99/yr).
- [ ] App ID `com.greekstack.app` created with the **Associated Domains**
      capability (universal links). Push Notifications is NOT needed — the
      shipped bundled shell does not use push, so the capability/entitlement are
      intentionally omitted (Apple 2.3.1 — declare only what's used).
- [ ] App record created in App Store Connect (name "Greek Stack", bundle id above).
- [ ] App Store Connect API key (.p8) created (App Manager role). The pipeline uses
      AUTOMATIC signing — it fetches/creates the distribution cert + App Store
      provisioning profile from this API key alone (no manual `.p12` or
      `.mobileprovision` to create or upload).
- [ ] Codemagic `greekstack_ios` secret group populated (see IOS-RELEASE.md table).

## 1. Ship a build to TestFlight
- [ ] `git tag v1.0.0 && git push origin v1.0.0`.
- [ ] Codemagic `ios-testflight` build goes green; `.ipa` uploaded.
- [ ] Build appears in App Store Connect → TestFlight (≈15 min after upload).
- [ ] Install via TestFlight on a real iPhone; smoke-test:
  - [ ] Launch shows the branded splash, then the School → Chapter picker.
  - [ ] "See the live demo — no sign in" loads the read-only sample dashboard
        and ALL tabs work (Feed/Events/Rush/Dues/Directory/Profile).
  - [ ] In the demo, the Member/Exec switcher reveals the officer tools
        (roster, announce, rush, dues).
  - [ ] Bottom nav sits above the home indicator (safe-area correct).
  - [ ] Sign in with a real test member; data loads from the live API.
  - [ ] Dues → "Pay online with Stripe" opens Stripe Checkout in the browser.
  - [ ] Profile → "Delete account" → confirm works (test with a throwaway
        member account; it signs out and returns to the picker).
  - [ ] Haptics fire on tab switches / actions; universal links open the right page.

## 2. Listing (App Store Connect → Version 1.0 → Prepare for Submission)
- [ ] Name, subtitle, promo text, description, keywords from `LISTING.md`.
- [ ] Primary category **Education**, secondary **Social Networking**.
- [ ] Support URL `https://greekstack.com/support` — **page must be live**.
- [ ] Privacy Policy URL `https://greekstack.com/privacy` — **page must be live**.
- [ ] Screenshots uploaded for 6.9" (required) + 6.5" (secondary) — matching the
      on-disk `screenshots/6.9/` and `screenshots/6.5/` folders (per
      `SCREENSHOT-PLAN.md`). 6.9" covers the 6.7" slot (Apple down-scales).
- [ ] App icon shows (pulled from the build's asset catalog — 1024 icon is in the
      binary; ASC also wants a 1024 marketing icon, auto-derived from the build).
- [ ] Copyright "2026 Greek Stack".

## 3. App Privacy (Data collection questionnaire)
Answer truthfully. Greek Stack collects, scoped to the member's chapter:
- [ ] **Contact info** (name, email, phone) — linked to identity; for app
      functionality (roster/profile). Not used for tracking.
- [ ] **User content** (announcements, profile) — app functionality.
- [ ] **Identifiers** (account/user id) — app functionality. Not for tracking.
      (No APNs device token: the shipped shell does not use push.)
- [ ] **Payments** are processed by Stripe (the chapter's Stripe Checkout opens in
      the browser) — declare per how dues flow.
- [ ] **Camera / Photos: NOT collected** — the shipped bundled app does not use the
      camera or photo library (no in-app QR scanner or photo picker), and the
      camera/photo usage strings were removed from Info.plist. Do not declare them.
- [ ] Tracking: **No** (no cross-app/ad tracking, no third-party ad SDKs).
- [ ] Set the privacy "nutrition label" accordingly; link the Privacy Policy URL.

## 4. App Review Information
- [ ] Sign-in required? Provide either the **no-login demo path** note OR a working
      test account (chapter + email + password) — see the review note in `LISTING.md`.
      The no-login demo ("See the live demo — no sign in") exercises every surface.
- [ ] Account deletion (5.1.1(v)): the in-app path is **Profile → Delete account**
      (DELETE /api/mobile/account). Confirm the review note documents it.
- [ ] Contact first/last name, phone, email for the reviewer.
- [ ] Notes pasted (the demo-access + account-deletion block from `LISTING.md`).
- [ ] **App Review Notes — external dues payment** pasted (next section). This
      pre-empts the most likely first-pass rejection: a reviewer mis-classifying
      the in-app dues link as IAP-required digital content.

## 4a. App Review Notes — external dues payment (paste into ASC → App Review Information → Notes)

> Paste this VERBATIM, appended to the demo-access + account-deletion block from
> `LISTING.md`. It states the Greek Stack dues/donations external-payment position
> for the reviewer so the in-app "Pay online with Stripe" action is not
> mis-classified as in-app digital content requiring Apple IAP.

```
EXTERNAL PAYMENT — CHAPTER DUES & DONATIONS (Guidelines 3.1.3(e) / 3.1.5):

Chapter dues are a REAL-WORLD MEMBERSHIP OBLIGATION paid TO AN EXTERNAL
ORGANIZATION — the student's fraternity/sorority chapter — for their membership
in that physical, off-app organization (chapter meetings, housing, events,
brotherhood/sisterhood). They are NOT in-app digital content, digital services,
or features consumed within the app. Paying or not paying dues does not unlock,
gate, or enable ANY functionality in the app — every screen works the same
whether dues are paid or unpaid.

Because dues are a good/service used OUTSIDE the app, they are expressly permitted
to be collected by an external mechanism under Guideline 3.1.3(e) "Goods and
Services Outside the App," and the in-app link opening the chapter's Stripe
Checkout in the system browser is permitted under 3.1.5 (apps may use purchase
methods other than IAP for physical goods/services). Apple's own guidelines name
this category directly — e.g. a GYM or CLUB MEMBERSHIP collected in-app is the
canonical precedent, and chapter dues are the same kind of real-world membership.
Alumni donations to the chapter are likewise external, real-world contributions,
not digital content.

For this reason Apple In-App Purchase is INTENTIONALLY NOT IMPLEMENTED for dues
or donations. If the reviewer believes IAP is required, please contact us before
rejecting — we are confident this falls under 3.1.3(e)/3.1.5, and we would prefer
to clarify. We will NOT switch to IAP unless Apple explicitly insists; if so, note
that a manual treasurer payment path already exists (the in-app dues action
returns a "pay via your chapter treasurer" message when online dues are not
configured), so dues can be settled out-of-band without IAP either way.

NO-LOGIN DEMO (no account needed): on the first screen tap "See the live demo —
no sign in" to exercise every surface, including Dues → "Pay online with Stripe".
To test a real sign-in if desired, use the test chapter/email/password provided
in the demo-access block above (fill the <...> placeholders before submitting).
```

## 5. Version & compliance
- [ ] Export Compliance: uses only standard HTTPS/TLS → **No** non-exempt
      encryption. `ITSAppUsesNonExemptEncryption=false` is already baked into
      `ios/App/App/Info.plist` (and re-injected by codemagic.yaml), so ASC should
      not prompt; if it does, answer "No".
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
- **4.2 minimum functionality / "just a website"** — mitigated: the member UI is
  BUNDLED in the binary (`webDir: mobile-shell/`, no `server.url`), not a webview
  wrapper pointed at the site, and adds native value (haptics, universal/deep
  links, offline cache — `lib/native-bridge.ts`). The review note explains this.
- **5.1.1 privacy / sign-in** — the no-login demo ("See the live demo — no sign in")
  lets the reviewer exercise the whole app without an account; sign-in is only for a
  member's real chapter.
- **5.1.1(v) account deletion** — the app has an in-app **Profile → Delete account**
  path (DELETE /api/mobile/account); no website visit required. Documented in the
  review note.
- **2.3 / 2.3.1 accurate metadata** — the listing, screenshots, and review note all
  describe the SHIPPED bundled binary's real surfaces (no over-claimed features). The
  app declares no camera/photo permission because it uses neither.
- **3.1.3(e) Goods & Services Outside the App** — chapter dues (and alumni
  donations) are real-world fraternity/sorority memberships processed via the
  chapter's Stripe in the system browser, not in-app digital goods → Apple IAP is
  not required and is intentionally not added. Keep dues/donation checkout external.
  This is the single most likely first-submission rejection vector, so HARDEN it:
  - [ ] Paste the **App Review notes block** from `LISTING.md` ("App Review notes")
        **verbatim** into App Store Connect → App Review Information → Notes. The
        last paragraph states the 3.1.3(e) position explicitly for the reviewer.
  - [ ] Confirm the dues screen copy frames the charge as **real-world chapter
        membership dues** ("Active chapter dues" / "your dues are unpaid"), and
        contains **no language that "unlocks" app content/features on payment**
        (which would pull it under 3.1.1 IAP). Current copy in `mobile-shell/
        index.html` paintDues() complies — re-verify after any copy edit.
  - [ ] Fallback if a reviewer insists on IAP: the **manual treasurer payment
        path already exists** (dues/checkout returns 503 → "Pay via your
        treasurer"), so dues can be marked paid out-of-band without IAP. Cite it
        if challenged rather than retrofitting IAP under time pressure.
- **Dead URLs** — make sure `/support`, `/privacy`, and `/terms` resolve before
  submitting (they are now linked in-app from the Profile screen footer, so a
  dead URL there is a visible, reviewer-facing break, not just a listing field).
