# Greek Stack — App Store Connect Listing

Copy-paste ready metadata for App Store Connect. Bundle ID `com.greekstack.app`.
Character counts are noted so nothing overflows ASC's field limits.

---

## App Name (limit 30)
`Greek Stack` *(11)*

## Subtitle (limit 30)
`Your chapter, in your pocket` *(28)*

Alternates (all ≤30): `Rush, dues, roster & events` · `Chapter life, one app` · `Fraternity & sorority hub`

---

## Promotional Text (limit 170 — editable any time without review)
`Everything your chapter runs on — the feed, events, rush pipeline, dues, and the full member directory — now native on your phone. Sign in with your chapter account.` *(163)*

---

## Keywords (limit 100, comma-separated, no spaces)
`fraternity,sorority,greek,chapter,rush,recruitment,dues,roster,brotherhood,frat,panhellenic,ifc,alumni` *(100)*

*(Do not repeat words already in the App Name/Subtitle — Apple indexes those separately. "greek life" is covered by "greek" + "life" tokenization.)*

---

## Description (limit 4000)

```
Greek Stack is the companion app for your fraternity or sorority chapter. Sign in with the same account you use on the web and carry your whole chapter in your pocket — the feed, events, rush pipeline, dues, and the full member directory, all native and fast.

Built for the people who actually run the chapter: recruitment chairs, treasurers, social chairs, exec boards, and every active member and alum who wants to stay in the loop.

WHAT YOU GET

• Chapter Feed — announcements and updates from your exec board, first thing when you open the app.

• Events — the full calendar of chapter events, mixers, philanthropy, and meetings. Never miss a mandatory again.

• Rush & Recruitment — for recruitment chairs and exec: see the rush pipeline, track prospective members, and keep the whole class moving through the funnel.

• Dues — check your balance and stay current, without digging through email.

• Member Directory — every brother or sister in one searchable place. New members, big-little, contact info, all at a glance.

• Your Profile — your info, your chapter, your role.

• Exec View — officers get the operations layer: pipeline, roster management, and the tools to run rush and keep the chapter organized.

BUILT TO FEEL NATIVE

• Stay signed in — your session persists so you open straight into your chapter.
• Works offline — your last view is cached, so a dead zone at the house doesn't lock you out.
• Deep links — tap a chapter link and land right where you need to be.
• Haptics and smooth transitions throughout.

BUILT FOR TRUST

Greek Stack was built with recruitment compliance in mind from day one — consent-first communications, quiet-hours protection on messaging, and privacy handling designed around student data. Your chapter's data belongs to your chapter.

ONE PLATFORM, EVERY CHAPTER

Greek Stack powers the full chapter workflow on the web — public rush site, admin pipeline, brother onboarding, events, and announcements — and this app is the member-facing companion to it. Whether your chapter runs solo or your national HQ operates it across every chapter, the app is the same clean experience.

Not affiliated with any single fraternity or sorority — Greek Stack is a platform any chapter can use.

Questions or want your chapter set up? Visit greekstack.vercel.app.
```

---

## What's New (version notes — limit 4000)

```
The first release of Greek Stack for iPhone.

• Your whole chapter, native: Feed, Events, Rush, Dues, Directory, and Profile.
• Stay signed in and pick up right where you left off.
• Works offline — your last view is cached for dead zones.
• Exec board gets the full rush pipeline and roster tools on the go.

Have feedback? We're just getting started — reach us at greekstack.vercel.app.
```

---

## URLs
- **Marketing URL:** `https://greekstack.vercel.app`
- **Support URL:** `https://greekstack.vercel.app` *(or a dedicated `/support` if you add one)*
- **Privacy Policy URL:** `https://greekstack.vercel.app/privacy` *(the app already ships a CCPA + VCDPA + COPPA + TCPA policy)*

## Categories
- **Primary:** Productivity *(chapter operations: roster, dues, events, pipeline)*
- **Secondary:** Social Networking *(feed + member directory)*
- *(Alternative primary if you want student-org discovery: Education.)*

## Age Rating
- **17+** is the safe call if the directory/feed carries user-generated content and the app references a fraternity/sorority context (alcohol/social themes may surface in event content). If content is fully moderated and no UGC, **12+** is defensible. Confirm during the ASC age-rating questionnaire.

## App Privacy (Data collected — for the ASC privacy questionnaire)
Declare honestly against the shipped build:
- **Contact Info** (name, email, phone) — linked to identity; used for App Functionality (directory, account). Not used for tracking.
- **User Content** (feed/announcements, profile) — App Functionality.
- **Identifiers** (account/user ID) — App Functionality.
- **No push notifications** — the binary ships no push capability, so do NOT declare push tokens.
- **No third-party tracking / no ads.**

## Screenshots to prepare (6.9"/6.7" 1290×2796 + 6.5" 1242×2688)
Capture these from the bundled member shell (`mobile-shell/index.html`) or the live demo:
1. Chapter Feed (announcements)
2. Events calendar
3. Member Directory
4. Rush / recruitment pipeline (exec view)
5. Dues / balance
6. Profile
Add a one-line caption per shot (e.g. "Your chapter feed, first thing" / "Every event, one calendar" / "The whole roster, searchable").

## Notes for review (App Review "Notes" field)
```
Greek Stack is a companion app for fraternity/sorority chapter members. Reviewers can use the built-in no-login DEMO chapter from the School → Chapter picker to see the full member experience (Feed, Events, Rush, Dues, Directory, Profile) without credentials. Live web platform: https://greekstack.vercel.app. The app is a bundled native client (Capacitor), not a webview wrapper of a hosted site — session persistence, offline cache, deep links, and haptics are native. No push notifications ship in this build.
```

---
*Generated 2026-07-10. Keep app name/subtitle stable across releases; iterate Promotional Text freely (no review needed). Update What's New per version.*
