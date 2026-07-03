// /support — the Greekstack APEX support surface.
//
// Apple REQUIRES every app to have a reachable support URL. This is that page:
// a real, useful help center for the people who actually use Greekstack — chapter
// admins/officers (the console) and members (the mobile app). It carries:
//   1. Fast ways to get help (email + the same /api/contact form /contact uses)
//   2. "Common questions" — a real FAQ (native <details> accordions, no JS)
//   3. Quick links to the things people need (sign in, get started, status,
//      privacy, terms)
//
// Like /contact and /terms this is a PLATFORM page, so it renders the Greekstack
// apex chrome (GreekstackWordmark + inline ApexHeader/ApexFooter) rather than the
// chapter-flavored PublicNav/PublicFooter (whose links 404 on the apex). It does
// NOT 404 on a tenant host — a member could reach it from the mobile app on any
// Greekstack URL — but it is only INDEXED on the apex (see generateMetadata
// robots) to avoid duplicate content across tenant subdomains.
//
// CONFIG (env-driven; this server component is the single place env is read, and
// passes values down to the client island as props):
//   • SUPPORT_CONTACT_EMAIL / SALES_CONTACT_EMAIL — support inbox (mailto + form
//     delivery via the shared /api/contact pipeline). Falls back to a personal
//     address so the page always works even before env is configured.

import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getSubdomain } from "@/lib/prisma";
import { GreekstackWordmark } from "@/components/brand/greekstack-logo";
import { ContactForm } from "@/components/site/sales-contact-forms";
import { IconSpark, IconShieldCheck } from "@/components/brand/icons";
import { IconChevronDown } from "@/components/brand/icons/utility";
import {
  IconArrowLeft,
  IconMail,
  IconBolt,
  IconLifebuoy,
  IconBook,
  IconLock,
  IconMessage,
  IconCalendar,
} from "@/components/brand/icons/contact";

export const dynamic = "force-dynamic";

function requestHost(): string {
  try {
    const h = headers();
    return h.get("host") || h.get("x-forwarded-host") || "";
  } catch {
    return "";
  }
}

/** Support inbox — prefer a dedicated support address, else the sales inbox,
 *  else the BRANDED support address (not a personal inbox) so the page always
 *  works without surfacing a founder's personal email.
 *  OWNER-KEYS: set SUPPORT_CONTACT_EMAIL (and stand up the real support@ inbox)
 *  before launch. */
function supportEmail(): string {
  return (
    process.env.SUPPORT_CONTACT_EMAIL ||
    process.env.SALES_CONTACT_EMAIL ||
    "workbenjaminsachwitz@gmail.com"
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const host = requestHost();
  const title = "Support — Greekstack";
  const description =
    "Get help with Greekstack. Reach the team, browse common questions for chapter admins and members, and find quick links to sign in, get started, privacy, and terms.";
  return {
    title,
    description,
    alternates: { canonical: "/support" },
    // Only index on the apex to avoid duplicate content across tenant subdomains.
    robots: { index: getSubdomain(host) === null, follow: true },
    openGraph: {
      title,
      description,
      url: "/support",
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Greekstack" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/twitter-image"],
    },
  };
}

export default async function SupportPage() {
  const email = supportEmail();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ApexHeader />

      <div className="container section-y max-w-5xl">
        <Link
          href="/"
          className="group mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" /> Back to home
        </Link>

        {/* ── Hero ── */}
        <header className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            <IconLifebuoy className="h-4 w-4" aria-hidden="true" /> Support
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
            We&apos;re here to help your chapter{" "}
            <span className="gs-gradient-text">run smoothly</span>.
          </h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Whether you&apos;re an officer setting up your chapter console or a member using the app,
            real help is one message away. Check the common questions below, or send us a note — a
            real person (the owner) reads and answers every message directly.
          </p>

          {/* Direct contact chip — email always available. */}
          <div className="mt-6 flex flex-wrap gap-2.5">
            <a
              href={`mailto:${email}`}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-blue-300 hover:text-blue-800"
            >
              <IconMail className="h-4 w-4 text-blue-700 transition-transform group-hover:-translate-y-0.5" aria-hidden="true" /> {email}
            </a>
          </div>
        </header>

        {/* ── How to get help (the three lanes) ── */}
        <section aria-labelledby="how-heading" className="mt-12">
          <h2 id="how-heading" className="sr-only">
            How to get help
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <HelpLane
              icon={<IconBolt className="h-5 w-5" aria-hidden="true" />}
              title="Email us"
              body="The fastest way in. Describe what's happening and we'll reply by email — usually the same day."
            />
            <HelpLane
              icon={<IconBook className="h-5 w-5" aria-hidden="true" />}
              title="Read the FAQ"
              body="Common questions from chapter admins and members, answered below — no account needed."
            />
            <HelpLane
              icon={<IconShieldCheck className="h-5 w-5" aria-hidden="true" />}
              title="Account & data"
              body="Questions about your data, privacy, or deleting an account? See the links and policies below."
            />
          </div>
        </section>

        {/* ── Contact form (shared with /contact, posts to /api/contact) ── */}
        <section aria-labelledby="contact-heading" className="mt-12 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="gs-glass rounded-2xl p-6 sm:p-8">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              <IconMessage className="h-4 w-4" aria-hidden="true" /> Contact support
            </span>
            <h2 id="contact-heading" className="mt-2 text-xl font-semibold tracking-tight">
              Send us a message
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us what you need help with and we&apos;ll get back to you by email.
            </p>
            <div className="mt-6">
              <ContactForm contactEmail={email} />
            </div>
          </div>

          {/* Reassurance + reach rail */}
          <aside className="space-y-4">
            <ValueRow
              icon={<IconBolt className="h-5 w-5" aria-hidden="true" />}
              title="Fast, personal replies"
              body="No ticket queue — the owner reads and answers every message directly."
            />
            <ValueRow
              icon={<IconMail className="h-5 w-5" aria-hidden="true" />}
              title="Or email us directly"
              body={email}
              href={`mailto:${email}`}
            />
            <ValueRow
              icon={<IconCalendar className="h-5 w-5" aria-hidden="true" />}
              title="Need a walkthrough?"
              body="Book a quick call or ask for a live demo on the contact page."
              href="/contact#book"
            />
          </aside>
        </section>

        {/* ── FAQ — native accordions, no JS required ── */}
        <section id="faq" aria-labelledby="faq-heading" className="mt-16 scroll-mt-24">
          <div className="mb-6 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              <IconBook className="h-4 w-4" aria-hidden="true" /> Common questions
            </span>
            <h2 id="faq-heading" className="mt-2 text-2xl font-semibold tracking-tight">
              Answers to the things people ask most
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              For chapter officers and members alike. Don&apos;t see your question? Send us a note
              above and we&apos;ll help.
            </p>
          </div>

          <div className="space-y-3">
            <Faq question="How do I sign in to my chapter?">
              <p>
                Members and officers sign in at your chapter&apos;s site or in the Greek Stack app with the
                email your chapter invited. If you don&apos;t have an invite yet, ask your chapter&apos;s
                recruitment chair or president to add you — admins can send an invite from their console.
                You can also reach the sign-in screen any time from{" "}
                <Link href="/login" className="text-blue-600 hover:underline">the login page</Link>.
              </p>
            </Faq>
            <Faq question="I'm a rush chair — how do I get my chapter set up?">
              <p>
                Start at{" "}
                <Link href="/onboard" className="text-blue-600 hover:underline">Get started</Link> and follow the
                guided setup — chapter name, branding, and your first officers. Most chapters are live the same
                day. Want it done for you or have a custom need? Use{" "}
                <Link href="/contact" className="text-blue-600 hover:underline">Contact sales</Link> and we&apos;ll
                help you launch.
              </p>
            </Faq>
            <Faq question="How does billing and the free trial work?">
              <p>
                Your first month is free — paid plans require card setup at signup to start your trial (dues-share and custom plans remain card-free). After that, your chapter is billed on the
                plan you pick, and you can cancel any time from the admin billing settings. Card payments are
                handled securely by Stripe; Greekstack never sees or stores full card numbers. For billing
                questions or a custom quote, email us or use{" "}
                <Link href="/contact" className="text-blue-600 hover:underline">Contact sales</Link>.
              </p>
            </Faq>
            <Faq question="Is my chapter's data private and secure?">
              <p>
                Yes. Each chapter&apos;s data lives in its own isolated database — one chapter can never see
                another&apos;s roster, recruitment, or dues. We use only the trusted providers needed to run the
                platform and never sell your data. The full details, including your rights and how to request an
                export or deletion, are in our{" "}
                <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
              </p>
            </Faq>
            <Faq question="How do I delete my account or my chapter's data?">
              <p>
                Members can ask their chapter admin to remove them, and chapter admins can request full deletion
                of a chapter&apos;s account and data by emailing{" "}
                <a href={`mailto:${email}`} className="text-blue-600 hover:underline">{email}</a> from the
                address on file. We&apos;ll confirm and complete the request — see the &ldquo;Your rights&rdquo;
                section of the{" "}
                <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> for what&apos;s
                covered and the timeline.
              </p>
            </Faq>
            <Faq question="The app or a page isn't working — what should I do?">
              <p>
                First, make sure you&apos;re on the latest version of the app and have a working connection, then
                fully close and reopen it. If it still misbehaves, email us with your chapter name, what you were
                doing, and a screenshot if you can — that&apos;s the quickest way for us to reproduce and fix it.
              </p>
            </Faq>
            <Faq question="Do you support notifications, push, and text messages?">
              <p>
                Yes. Chapters can send announcements and event reminders, and members can receive push
                notifications in the app and (where a chapter enables it) text messages. You&apos;re always in
                control of what you receive — consent and opt-out details are covered in our{" "}
                <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
              </p>
            </Faq>
          </div>
        </section>

        {/* ── Quick links ── */}
        <section aria-labelledby="links-heading" className="mt-16">
          <h2 id="links-heading" className="text-lg font-semibold tracking-tight">
            Quick links
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickLink
              href="/login"
              icon={<IconLock className="h-5 w-5" aria-hidden="true" />}
              title="Sign in"
              body="Members & officers"
            />
            <QuickLink
              href="/onboard"
              icon={<IconSpark className="h-5 w-5" aria-hidden="true" />}
              title="Get started"
              body="Set up your chapter"
            />
            <QuickLink
              href="/contact"
              icon={<IconMessage className="h-5 w-5" aria-hidden="true" />}
              title="Contact sales"
              body="Demos, quotes & calls"
            />
            <QuickLink
              href="/privacy"
              icon={<IconShieldCheck className="h-5 w-5" aria-hidden="true" />}
              title="Privacy Policy"
              body="Your data & rights"
            />
            <QuickLink
              href="/terms"
              icon={<IconBook className="h-5 w-5" aria-hidden="true" />}
              title="Terms of Service"
              body="The agreement"
            />
            <QuickLink
              href="/app?demo=true"
              icon={<IconBolt className="h-5 w-5" aria-hidden="true" />}
              title="Interactive demo"
              body="See it live"
            />
          </div>
        </section>
      </div>

      <ApexFooter />
    </div>
  );
}

function HelpLane({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="gs-glass flex flex-col gap-3 rounded-2xl p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function ValueRow({
  icon,
  title,
  body,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href?: string;
}) {
  const inner = (
    <>
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </>
  );
  const className =
    "flex gap-3.5 rounded-xl border border-border bg-secondary/30 p-4 transition-colors hover:border-blue-300";
  if (href) {
    const isInternal = href.startsWith("/");
    if (isInternal) {
      return (
        <Link href={href} className={className}>
          {inner}
        </Link>
      );
    }
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }
  return <div className="flex gap-3.5 rounded-xl border border-border bg-secondary/30 p-4">{inner}</div>;
}

function Faq({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <details className="group gs-glass rounded-xl px-5 py-1 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-foreground">
        <span>{question}</span>
        <IconChevronDown
          className="h-4 w-4 shrink-0 text-blue-600 transition-transform duration-300 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="pb-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}

function QuickLink({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3.5 rounded-xl border border-border bg-secondary/30 p-4 transition-colors hover:border-blue-300 hover:bg-secondary/50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground transition-colors group-hover:text-blue-800">
          {title}
        </p>
        <p className="truncate text-xs text-muted-foreground">{body}</p>
      </div>
    </Link>
  );
}

// ── Apex-only chrome ────────────────────────────────────────────────────────
// Self-contained Greekstack header/footer for the platform support page. We do
// NOT reuse the chapter-branded PublicNav/PublicFooter here: those link to
// /schedule, /alumni, /portal — chapter routes that 404 on the apex. Mirrors the
// pattern in app/contact/page.tsx, app/terms/page.tsx, and app/privacy/page.tsx.

function ApexHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-[0_4px_30px_-12px_rgba(37,99,235,0.45)]">
      {/* Lit bottom seam */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent"
      />
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="group inline-flex items-center" aria-label="Greekstack home">
          <GreekstackWordmark
            size="md"
            markClassName="h-8 w-8 transition-transform duration-300 ease-gs-spring group-hover:rotate-[-6deg] group-hover:scale-105"
          />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/app?demo=true"
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Interactive demo
          </Link>
          <Link
            href="/onboard"
            className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function ApexFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-secondary/30">
      <div className="container py-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/" className="group inline-flex items-center" aria-label="Greekstack home">
            <GreekstackWordmark
              size="sm"
              markClassName="h-7 w-7 transition-transform duration-300 group-hover:rotate-[-6deg]"
            />
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Footer">
            <Link href="/support" className="link-underline text-sm text-muted-foreground transition-colors hover:text-foreground">
              Support
            </Link>
            <Link href="/privacy" className="link-underline text-sm text-muted-foreground transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="link-underline text-sm text-muted-foreground transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/onboard" className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800">
              Get started
            </Link>
          </nav>
        </div>
        <div className="mt-8 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Greekstack. The white-label Greek-life platform.</p>
        </div>
      </div>
    </footer>
  );
}
