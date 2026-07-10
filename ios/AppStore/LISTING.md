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

SIMPLE SIGN-IN
Open the app, pick your school and your chapter, and sign in with the account your chapter gave you — as a brother/sister or as an alum. The whole app then re-skins to your chapter's letters and colors.

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

Questions? Visit greekstack.com or contact workbenjaminsachwitz@gmail.com.
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

HOW TO SIGN IN FOR REVIEW (a working account is provided — the app is login-only):
On the first screen, tap your school, then your chapter, then sign in with the
credentials below. The app is scoped to a single private chapter, so a real
member account is required to review it (there is no in-app demo; the marketing
demo is on the website only).

  School:            University of South Carolina
  Chapter:           Phi Sigma Kappa
  Sign-in tab:       Brother
  Email:             appreview@greekstack.app
  Password:          GreekStack!Review2026

  (The provided account is an OFFICER account, so you can also test the
   "Member view / Exec view" switcher at the top of the dashboard.)

After signing in you can exercise every feature:
  • Feed (announcements + career posts)
  • Events (RSVP + add to calendar)
  • Dues (balance + the "Pay online with Stripe" action)
  • Directory (actives + alumni)
  • Rush (recruitment pipeline)   • Vote (chapter elections, when a ballot is open)
  • Profile — including the "Delete account" action
  • Exec view (officer tools: roster add/remove, reset links, announcements,
    dues collection) via the "Member view / Exec view" switcher at the top

ACCOUNT DELETION (Guideline 5.1.1(v)):
Profile screen → "Delete account" → confirm. This deletes the signed-in member's
account and member data in-app; no separate website visit is required.

USER-GENERATED CONTENT — REPORT + BLOCK (Guideline 1.2):
The app shows cross-member content (officer announcements, a member/alumni
directory, alumni career posts). Two mitigations are in place:
  1) The structural mitigation. Each install is scoped to a single PRIVATE,
     closed chapter that the member must authenticate into — content is never
     public or cross-chapter. The only broadcast surface (announcements) is
     OFFICER-ONLY: regular members cannot post to the feed, so member-to-member
     objectionable broadcast is not possible. Member profiles/directory entries
     are admin/self-curated, and chapter officers are the moderators (they can
     edit/remove members and content from the admin console).
  2) The in-app controls. Every announcement, career post, and directory member
     row has a "Report" action that files a report to the chapter's officers
     (recorded server-side AND delivered to admins through our notification
     path). Every directory member row also has a "Block" control: blocking
     hides that member's directory listing and content on the device
     immediately (persisted across launches) and notifies an admin; it is
     reversible from a "Blocked members" list. To exercise after signing in:
     open Directory → tap the flag (Report) or the no-entry (Block) icon on any
     row, or tap "Report" under any Feed card.

DUES: tapping "Pay online with Stripe" opens the chapter's Stripe Checkout in the
system browser. These are real-world chapter membership dues collected via the
chapter's own Stripe account, not digital goods consumed in the app — so Apple
IAP does not apply (Guideline 3.1.3(e)).

DONATIONS: the iOS app has NO in-app donate action. Alumni see only a read-only
record of any prior donations on their profile; making a donation is web-only
(done on the chapter's website), so there is no in-app purchase path for
donations to review here.
```
> REQUIRED before submitting: fill the `<PROVIDE A REVIEW MEMBER EMAIL>` /
> `<PROVIDE A REVIEW PASSWORD>` placeholders with a WORKING officer account on the
> Phi Sigma Kappa (USC) chapter. The app is login-only (no in-app demo), so Apple
> WILL reject with Guideline 2.1 if they cannot sign in. To create the account:
> chapter admin console → Roster → add a Brother with your reviewer email and mark
> them an officer, then set/confirm a password (or use the "send reset link" and
> set one). Verify the credentials sign in on the live app before you submit.

## Copyright
```
2026 Greek Stack
```
