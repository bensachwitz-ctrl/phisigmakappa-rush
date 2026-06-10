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

EVERYTHING YOUR CHAPTER NEEDS
• Feed & announcements — never miss chapter news, with push notifications when something is posted.
• Events & calendar — see what's coming up, RSVP in a tap, and add any event straight to your phone's calendar.
• Dues & payments — check your balance and pay securely.
• Roster & directory — find any brother, sister, or alum, with profiles, majors, and contact info.
• Rush & recruitment — officers manage the PNM pipeline, votes, and notes; check guests in with a QR scan.
• Career network — alumni post opportunities and connect with actives.

MADE FOR OFFICERS, TOO
Switch into the officer view to manage your roster, run dues, post announcements, move rush candidates through the pipeline, and run elections — all from your phone.

THEMED TO YOUR CHAPTER
Greek Stack is multitenant: when you sign in, the entire app re-skins to your organization's letters, colors, and brand. It's your chapter's system, not a generic template.

SECURE BY DESIGN
Your data is scoped to your chapter. Sign in once and unlock with Face ID or Touch ID. Push notifications keep you in the loop on events and announcements.

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
- **In-app purchases:** None in the app. Dues/payments are handled via the chapter's
  Stripe (web checkout / external), not Apple IAP — this is a "reader"/companion to a
  paid web service, which is the correct model (no IAP required for chapter dues, as
  they are real-world memberships, not digital content consumed in-app). Confirm with
  current App Review guidelines 3.1.3(e) "Goods and Services Outside the App".
- **Availability:** United States (expand later as chapters onboard).

## Age rating
**4+** (no objectionable content). In the ASC questionnaire answer "None" to all
content descriptors. Note: the app contains user-generated content (announcements,
profiles, rush notes) scoped to a private chapter — answer the UGC questions
truthfully (moderation = chapter officers; content is not public).

## App Review notes (paste into "Notes" for the reviewer)
```
Greek Stack is a companion app for the Greek Stack web platform. It loads the
member experience at greekstack.com/app inside a native shell and adds native
features (push notifications, Face/Touch ID unlock, haptics, deep links, offline
cache).

DEMO ACCESS for review (no real account needed):
Open the app, tap "Explore the demo" / load any demo chapter — the app runs a
fully interactive sample chapter (Phi Sigma Kappa) with no login required, so you
can see all features (Feed, Events, Rush, Dues, Directory, officer view) without
credentials.

To test a real sign-in if desired:
  Chapter/subdomain: <PROVIDE A TEST CHAPTER>
  Email: <PROVIDE A TEST MEMBER EMAIL>
  Password: <PROVIDE A TEST PASSWORD>

Dues payments open the chapter's Stripe checkout (real-world membership dues, not
digital goods consumed in-app).
```
> Fill the `<...>` test-account placeholders before submitting, OR rely on the
> no-login demo path (recommended — guarantees the reviewer can exercise the app).

## Copyright
```
2026 Greek Stack
```
