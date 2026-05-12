import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  LayoutDashboard, Users, CalendarDays, Megaphone, Settings,
  Send, ClipboardCheck, ThumbsUp, Mail, MessageSquare,
  Wand2, Download, Sparkles, ShieldCheck, BookOpen,
  TrendingUp, FileText,
} from "lucide-react";

export const dynamic = "force-dynamic";

const SECTIONS = [
  {
    icon: ShieldCheck,
    title: "Getting in",
    body: (
      <>
        Sign in at <code className="text-foreground">/admin/login</code>. Two tabs:
        <span className="font-medium text-foreground"> Admin</span> uses the chapter
        username + password,{" "}
        <span className="font-medium text-foreground">Brother</span> uses your first
        name + the password you set on your invite link. Sessions last 12 hours.
      </>
    ),
    bullets: [
      "The chapter has one shared admin login distributed via the e-board's password manager.",
      "First time a brother signs in with a new name, the system creates a Brother record automatically.",
      "To onboard a brother with year, major, headshot, and contact info, use Brothers → Invite brother — sends a one-time link they fill out themselves.",
    ],
  },
  {
    icon: TrendingUp,
    title: "Dashboard — decisions at a glance",
    body: (
      <>
        The top of the <Link href="/admin" className="text-phisig-red hover:underline">Rush</Link> tab now
        shows a 6-tile insight strip plus a "Ready to decide" panel — so the e-board knows what needs
        attention without scrolling the roster.
      </>
    ),
    bullets: [
      "KPI tiles: active PNMs, ready-to-decide count, vote participation %, dues collected %, bid conversion %, next event.",
      "Strong-yes panel (green): PNMs with ≥5 votes and an average score of +1 or higher — these are bid candidates.",
      "Strong-no panel (red): PNMs with ≥5 votes averaging -1 or lower — likely drops.",
      "Your unvoted PNMs (cardinal): the ones the chapter is closest to deciding that you haven't weighed in on yet.",
      'Smart-filter chips above the roster: "Ready to decide", "Needs my vote", "Bid pending" — one tap to focus on what matters.',
      "Three CSV/JSON exports: PNM roster, Brothers participation, Weekly digest (paste into Slack or the advisor email).",
    ],
  },
  {
    icon: LayoutDashboard,
    title: "Rush — managing PNMs",
    body: (
      <>
        The <Link href="/admin" className="text-phisig-red hover:underline">Rush</Link> tab is the heart of recruitment.
        Every kid who signs up via the public form lands here.
      </>
    ),
    bullets: [
      "Search by name / email / hometown / major.",
      "Filter by status: Active, Dropped, Bid Extended, Accepted, Declined.",
      "Click a row → full profile with phone, year, major, hometown, headshot, notes, and the brotherhood vote breakdown.",
      "Status pills next to each row — click to update without opening the dialog.",
      "Vote 👍 / 👎 inline on each PNM, or open the profile for the full Strong Yes → Strong No scale.",
      "Multi-select rushes → click Email or Text to send a mass message via Resend / Twilio.",
      "Click Export to download the full roster as a CSV — perfect for sharing with the e-board.",
    ],
  },
  {
    icon: Users,
    title: "Brothers — chapter directory",
    body: (
      <>
        The <Link href="/admin/brothers" className="text-phisig-red hover:underline">Brothers</Link> tab is the active-member roster.
        Use it to track who's paid dues, who's logged service hours, and who's on the e-board.
      </>
    ),
    bullets: [
      "Click Add brother to add a new member — name, position, year, major, pledge class, contact info.",
      "Click the Dues badge on any card to toggle paid / unpaid (one-click).",
      "Service and study hours show on each card; bulk-update by editing brothers individually.",
      "Stats at the top show total brothers and % dues paid.",
      "Click phone or email on any card to call / open mail.",
    ],
  },
  {
    icon: CalendarDays,
    title: "Events — rush + chapter calendar",
    body: (
      <>
        The <Link href="/admin/events" className="text-phisig-red hover:underline">Events</Link> tab feeds the public schedule
        on the homepage. Public events show on the rush page; invite-only events stay hidden from the public site
        but appear on the brother calendar.
      </>
    ),
    bullets: [
      "Click Add event to create — name, start/end time, location, dress code, description, category, and public/invite-only.",
      "Pick a category (Rush / Date / Brotherhood / Chapter / Social / Other) — drives the color stripe brothers see on the calendar.",
      "Toggle Invite-only to hide from the public site while keeping it visible to logged-in brothers.",
      "Click Edit on any event to update — RSVPs are preserved on edit.",
      "Click Attendance on any event to mark who showed up — search PNMs and toggle check-marks.",
      "Brothers RSVP from /admin/events — Going / Maybe / Not going. Click an event to see the full breakdown including who hasn't responded yet.",
    ],
  },
  {
    icon: Megaphone,
    title: "News — chapter announcements",
    body: (
      <>
        The <Link href="/admin/announcements" className="text-phisig-red hover:underline">News</Link> tab is for chapter-wide updates —
        meeting reminders, philanthropy events, dues deadlines.
      </>
    ),
    bullets: [
      "Click New announcement — title, body, audience (Everyone / Brothers / Rushes / E-board), pin to top.",
      "Click the pin icon on any announcement to pin it (pinned ones bubble to the top).",
      "Click Broadcast to send a text or email blast to everyone, brothers only, or rushes only — uses your Twilio + Resend creds.",
      "Edit / delete any announcement at any time.",
    ],
  },
  {
    icon: Settings,
    title: "Site — content control",
    body: (
      <>
        The <Link href="/admin/settings" className="text-phisig-red hover:underline">Site</Link> tab controls everything on the public homepage —
        photos, copy, stats. No code, no Vercel.
      </>
    ),
    bullets: [
      "Hero photos: paste an Instagram post slug (the part after /p/ in the URL) for any of the 3 hero tiles. Each preview updates live.",
      "Brother of the Month: change the post slug, name, role, month, and bio.",
      "About-section photo: change the slug + caption + crop position (top / center / lower) if a new photo crops weird.",
      "Hero copy: edit the eyebrow badge text and the subline paragraph.",
      "Stats: change the headline numbers (60+ brothers, 3.45 GPA, etc.).",
      "Click Save when done — the sticky bar at the top tracks unsaved changes.",
    ],
  },
];

const COMMON_TASKS = [
  {
    icon: Send,
    title: "Add a brother (invite + onboard)",
    steps: [
      "Brothers tab → click Invite brother.",
      "Pick channel: Email, Text, or Copy link.",
      "Type their name (optional) + their email or phone.",
      "Click Send — they get a one-time link.",
      "They open it, fill out year/major/pledge class/headshot, and submit.",
      "Their profile lands in the Brothers directory automatically — no manual data entry.",
    ],
  },
  {
    icon: Sparkles,
    title: "Drop the rush schedule",
    steps: [
      "Go to Events tab.",
      "Click Add event for each rush event — fill in name, date/time, location, dress code, and category (Rush / Brotherhood / Social / etc.).",
      "Toggle Invite-only on the formal and Bid Night so they don't appear on the public page.",
      "Brothers will see all events (public + invite-only) on their calendar with RSVP buttons.",
      "Public homepage schedule updates instantly with each new event.",
    ],
  },
  {
    icon: Send,
    title: "Text every rush about a moved event",
    steps: [
      "Go to Rush tab.",
      "Filter status = Active so only current rushes are shown.",
      "Click the top-left checkbox in the table header to select all visible rushes.",
      "Click Text → pick the Reminder template, edit the message, send.",
      "If Twilio is configured, every rush gets a personalized text within seconds.",
    ],
  },
  {
    icon: ThumbsUp,
    title: "Run a vote on bids",
    steps: [
      "Make sure every active brother has signed in at least once (so they have a Brother record).",
      "Each brother goes to Rush, clicks a PNM row, and uses the vote buttons (Strong Yes → Strong No).",
      "On the PNM detail panel, expand 'View all votes' to see the full breakdown.",
      "When ready, change the rush's status to Bid Extended, then Accepted / Declined as they respond.",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "Take attendance at an event",
    steps: [
      "Go to Events.",
      "Click Attendance on the event card.",
      "Search by name and toggle check-marks for everyone who showed up.",
      "Closes as you click — every toggle saves instantly.",
    ],
  },
  {
    icon: Megaphone,
    title: "Post a chapter announcement",
    steps: [
      "Go to News.",
      "Click New announcement.",
      "Title, body, audience, pin if urgent.",
      "Optionally also click Broadcast to text/email everyone immediately.",
    ],
  },
  {
    icon: FileText,
    title: "Send the weekly chapter digest",
    steps: [
      "Go to Rush.",
      "Click 'Weekly digest (JSON)' in the Jump-to row under the KPI tiles — opens the live snapshot.",
      "Either copy the JSON into a Slack message, OR paste the highlights into the advisor's weekly email.",
      "Want it formatted? Click 'Brothers CSV' for the engagement roster (votes-cast / RSVPs / dues / last-seen) and paste into your meeting deck.",
      "Pro tip: pin /api/admin/digest as a bookmark — it's auth-gated so only signed-in admins can open it.",
    ],
  },
  {
    icon: ThumbsUp,
    title: "Decide bids fast (with consensus thresholds)",
    steps: [
      "Open Rush — the dashboard now shows a green 'Strong consensus — bid candidates' panel.",
      "Each PNM listed there has ≥5 votes with an average of +1 or higher. Confident bid.",
      "Click a name → opens the PNM profile with full vote breakdown so you can sanity-check.",
      "Change status to Bid Extended. Use the bulk Email button to send the bid template.",
      "Watch the Bid Conversion KPI tile climb as PNMs accept/decline.",
    ],
  },
  {
    icon: Wand2,
    title: "Swap the homepage photos",
    steps: [
      "Open Instagram, find the post you want, copy the slug from the URL (after /p/).",
      "Go to Site tab.",
      "Paste the slug into Hero Tile 1 / 2 / 3 (or Spotlight, or About).",
      "Watch the preview update.",
      "Click Save — homepage updates instantly.",
    ],
  },
];

export default function HelpPage() {
  return (
    <main className="container py-8">
      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
          <BookOpen className="h-3 w-3" /> Chapter handbook
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          How to run the chapter from this site.
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Everything the rush chair, social chair, and e-board need to know — under 5 minutes of reading.
          Bookmark this page.
        </p>
      </div>

      {/* Common tasks first — most used */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Common tasks</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {COMMON_TASKS.map((t) => (
            <Card key={t.title} className="lift">
              <CardContent className="p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-phisig-red text-white shadow-md shadow-phisig-red/20">
                  <t.icon className="h-4 w-4" />
                </span>
                <h3 className="mt-3 text-base font-semibold tracking-tight">{t.title}</h3>
                <ol className="mt-3 space-y-1.5 text-sm text-muted-foreground list-decimal list-inside leading-relaxed">
                  {t.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Reference per tab */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Tab-by-tab reference</h2>
        {SECTIONS.map((s) => (
          <Card key={s.title} className="lift">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-phisig-red-soft text-phisig-red shrink-0">
                  <s.icon className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {s.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-phisig-red shrink-0" />
                        <span className="text-muted-foreground">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

    </main>
  );
}
