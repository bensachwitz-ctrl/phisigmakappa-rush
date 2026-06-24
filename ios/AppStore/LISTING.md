# Greek Stack — App Store Listing Metadata

Paste-ready copy for App Store Connect → your app → **App Information** +
**Version → Prepare for Submission**. Character limits are Apple's; counts shown
are within limits. Edit names/links before submitting if anything changed.

---

## App name (max 30 chars)
```
Greek Stack
```
(11 chars.)

## Subtitle (max 30 chars)
```
Your chapter, in your pocket
```
(28 chars.)

## Primary category
**Education**

## Secondary category
**Social Networking**

## Promotional text (max 170 chars — updatable without a new build)
```
Sign in to your fraternity or sorority chapter: events, dues, roster, rush, and announcements — all in one app, themed to your letters.
```
(133 chars.)

## Description (max 4000 chars)
```
Greek Stack is the all-in-one app for your fraternity or sorority chapter. Sign in with the same account you use on the web and your whole chapter comes with you — themed to your letters and colors.

Built for brothers, sisters, alumni, and officers alike.

TRY IT WITHOUT AN ACCOUNT
Tap "See the live demo" on the first screen to explore a full sample chapter — Feed, Events, Rush, Dues, Directory, Profile, and the officer view — with no sign-in required.

EVERYTHING YOUR CHAPTER NEEDS
• Feed & announcements — never miss chapter news; open the app to see the latest posts the moment they go up.
• Events & calendar — see what's coming up, RSVP in a tap, and add any event straight to your phone's calendar.
• Dues — check your balance and pay your chapter dues securely through your chapter's Stripe checkout.
• Roster & directory — find any brother, sister, or alum, with profiles, majors, and contact info.
• Rush & recruitment — see the recruitment pipeline and where each prospective member stands.
• Career opportunities — alumni post jobs that surface right in your feed.

MADE FOR OFFICERS, TOO
If you're a chapter officer, switch into the Exec view to manage your roster (add or remove members, send password-reset links), post announcements, see the rush pipeline, and track dues collection — all from your phone. Officer tools appear only for verified officers.

THEMED TO YOUR CHAPTER
Greek Stack is multitenant: when you sign in, the entire app re-skins to your organization's letters, colors, and brand. It's your chapter's system, not a generic template.

YOUR ACCOUNT, YOUR CONTROL
You can delete your account and member data at any time from the Profile screen. Your data is scoped to your chapter.

Greek Stack pairs with the Greek Stack web platform (greekstack.com). Your chapter's admin sets up the chapter site; members and alumni just sign in here.

Questions? Visit greekstack.com or contact support@greekstack.com.
```

## Keywords (max 100 chars, comma-separated, no spaces after commas)
```
fraternity,sorority,greek life,chapter,rush,dues,roster,panhellenic,IFC,alumni,recruitment,brotherhood
```
(99 chars — verify in ASC; trim the last term if it reports over.)

## Support URL
```
https://greekstack.com/support
```

## Marketing URL (optional)
```
https://greekstack.com
```

## Privacy Policy URL  (REQUIRED)
```
https://greekstack.com/privacy
```
> If `/support` or `/privacy` don't exist yet on the marketing site, create them
> before submitting — Apple requires a reachable Privacy Policy URL and rejects
> dead support links. See SUBMISSION-CHECKLIST.md.

---

## Pricing & availability
- **App price:** Free (the chapter pays for the Greek Stack platform on the web;
  the app itself is a free companion).
- **In-app purchases:** None. Chapter dues and alumni donations are processed through
  the chapter's own Stripe (the checkout opens in the system browser), not Apple IAP.
  Apple IAP is NOT required and is intentionally not added: chapter dues are payment
  for a **real-world membership** in the fraternity/sorority — a good/service used
  outside the app — which is expressly permitted to be sold via an external mechanism
  under **App Review Guideline 3.1.3(e) "Goods and Services Outside the App."** (IAP
  applies only to digital content/services consumed within the app; chapter
  membership is not that.) This is a deliberate, documented compliance position.
- **Availability:** United States (expand later as chapters onboard).

## Age rating
**4+** (no objectionable content). In the ASC questionnaire answer "None" to all
content descriptors. Note: the app contains user-generated content (announcements,
profiles, rush notes) scoped to a private chapter — answer the UGC questions
truthfully (moderation = chapter officers; content is not public).

## App Review notes (paste into "Notes" for the reviewer)
```
Greek Stack is a companion app for the Greek Stack web platform. The member
experience is BUNDLED in the binary (it is not a webview wrapper pointed at a
website); it talks to each chapter's backend over our HTTPS APIs and adds native
features (haptics, universal/deep links, offline cache).

NO-LOGIN DEMO for review (no account needed):
On the first screen, tap "See the live demo — no sign in." The app loads a fully
interactive, read-only sample chapter (Phi Sigma Kappa) with no credentials, so
you can exercise every feature:
  • Feed (announcements + career posts)
  • Events (RSVP + add to calendar)
  • Rush (recruitment pipeline)
  • Dues (balance + the "Pay online with Stripe" action)
  • Directory (actives + alumni)
  • Profile — including the "Delete account" action
  • Exec view (officer tools: roster add/remove, reset links, announcements,
    dues collection) via the "Member view / Exec view" switcher at the top

ACCOUNT DELETION (Guideline 5.1.1(v)):
Profile screen → "Delete account" → confirm. For a real signed-in member this
deletes their account and member data; in the demo it confirms and returns to the
chapter picker. No separate website visit is required.

To test a real sign-in if desired:
  Chapter/subdomain: <PROVIDE A TEST CHAPTER>
  Email: <PROVIDE A TEST MEMBER EMAIL>
  Password: <PROVIDE A TEST PASSWORD>

DUES: tapping "Pay online with Stripe" opens the chapter's Stripe Checkout in the
system browser. These are real-world chapter membership dues collected via the
chapter's own Stripe account, not digital goods consumed in the app — so Apple
IAP does not apply (Guideline 3.1.3(e)).
```
> Fill the `<...>` test-account placeholders before submitting, OR rely on the
> no-login demo path (recommended — guarantees the reviewer can exercise the app).

## Copyright
```
2026 Greek Stack
```
