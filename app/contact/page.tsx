// /contact — the Greekstack APEX sales surface.
//
// Premium "talk to sales" page for PROSPECTS (rush chairs, chapter presidents,
// advisors) to reach the platform owner. It carries three paths:
//   1. A general contact form           → POST /api/contact
//   2. "Request a customized system"    → POST /api/contact/quote  (pricing METHOD 3)
//   3. "Book a 15-min call"             → Cal.com embed, or a request-call form
//
// Like /terms this is a PLATFORM page, so it renders the Greekstack apex chrome
// (GreekstackWordmark + inline ApexHeader/ApexFooter) rather than the
// chapter-flavored PublicNav/PublicFooter. Unlike /terms it does NOT 404 on
// a tenant host — a prospect could land here from any Greekstack URL — but it is
// only INDEXED on the apex (see generateMetadata robots) to avoid duplicate
// content across tenant subdomains.
//
// CONFIG (env-driven; this server component is the single place env is read, and
// passes values down to the client island as props):
//   • SALES_CONTACT_EMAIL      — owner inbox (mailto + form delivery). Falls back
//                                to a personal address so the page always works.
//   • NEXT_PUBLIC_SALES_PHONE  — rendered ONLY when set (no fake number ever).
//   • NEXT_PUBLIC_CAL_LINK     — a Cal.com link ("yourname/15min"); when set we
//                                embed the booker, else we show the call form.

import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getSubdomain } from "@/lib/prisma";
import { GreekstackWordmark } from "@/components/brand/greekstack-logo";
import {
  ContactForm,
  CustomQuoteForm,
  CalEmbed,
  RequestCallForm,
} from "@/components/site/sales-contact-forms";
import { IconSpark, IconShieldCheck } from "@/components/brand/icons";
import {
  IconArrowLeft,
  IconMail,
  IconPhone,
  IconCalendar,
  IconMessage,
  IconBolt,
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

/** Owner sales inbox — mirrors the lib/sales-contact contract. */
function salesEmail(): string {
  return process.env.SALES_CONTACT_EMAIL || "bensachwitz@gmail.com";
}

export async function generateMetadata(): Promise<Metadata> {
  const host = requestHost();
  const title = "Contact sales — Greekstack";
  const description =
    "Talk to the team behind Greekstack. Get a demo, ask about pricing, request a fully custom-built chapter system, or book a 15-minute call.";
  return {
    title,
    description,
    alternates: { canonical: "/contact" },
    // Only index on the apex to avoid duplicate content across tenant subdomains.
    robots: { index: getSubdomain(host) === null, follow: true },
    openGraph: {
      title,
      description,
      url: "/contact",
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

export default async function ContactPage() {
  const email = salesEmail();
  // NEXT_PUBLIC_* are inlined at build; we still read them here so the page is
  // the single source of truth and the client island just receives props.
  const phone = (process.env.NEXT_PUBLIC_SALES_PHONE || "").trim();
  const calLink = (process.env.NEXT_PUBLIC_CAL_LINK || "").trim();
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : "";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ApexHeader />

      <main id="main-content" className="container section-y max-w-5xl">
        <Link
          href="/"
          className="group mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" /> Back to home
        </Link>

        {/* ── Hero ── */}
        <header className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            <IconMessage className="h-4 w-4" aria-hidden="true" /> Talk to sales
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
            Let&apos;s get your chapter on{" "}
            <span className="gs-gradient-text">Greekstack</span>.
          </h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Questions about pricing, a walkthrough of the platform, or a fully custom build for your
            chapter? Send a note, request a quote, or grab time for a quick call — a real person
            (the owner) reads every message.
          </p>

          {/* Direct contact chips — email always; phone only when configured. */}
          <div className="mt-6 flex flex-wrap gap-2.5">
            <a
              href={`mailto:${email}`}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-blue-300 hover:text-blue-800"
            >
              <IconMail className="h-4 w-4 text-blue-700 transition-transform group-hover:-translate-y-0.5" aria-hidden="true" /> {email}
            </a>
            {phone ? (
              <a
                href={telHref}
                className="group inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-blue-300 hover:text-blue-800"
              >
                <IconPhone className="h-4 w-4 text-blue-700 transition-transform group-hover:-translate-y-0.5" aria-hidden="true" /> {phone}
              </a>
            ) : null}
          </div>
        </header>

        {/* ── Contact form ── */}
        <section aria-labelledby="contact-heading" className="mt-12 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="gs-glass rounded-2xl p-6 sm:p-8">
            <h2 id="contact-heading" className="text-xl font-semibold tracking-tight">
              Send us a message
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us about your chapter and what you&apos;re looking for.
            </p>
            <div className="mt-6">
              <ContactForm contactEmail={email} />
            </div>
          </div>

          {/* Reassurance rail */}
          <aside className="space-y-4">
            <ValueRow
              icon={<IconBolt className="h-5 w-5" aria-hidden="true" />}
              title="Fast, personal replies"
              body="No ticket queue — the owner reads and answers every message directly."
            />
            <ValueRow
              icon={<IconSpark className="h-5 w-5" aria-hidden="true" />}
              title="Three ways to start"
              body="Pick a plan, request a fully custom build, or just book a quick call — whatever fits."
            />
            <ValueRow
              icon={<IconShieldCheck className="h-5 w-5" aria-hidden="true" />}
              title="No pressure"
              body="We'll point you to the right option for your chapter, even if that's the free trial."
            />
          </aside>
        </section>

        {/* ── Custom build / quote (pricing METHOD 3) ── */}
        <section
          id="custom"
          aria-labelledby="custom-heading"
          className="mt-16 scroll-mt-24 gs-shimmer-border rounded-2xl"
        >
          <div className="rounded-2xl bg-background p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="lg:w-2/5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  <IconSpark className="h-4 w-4" aria-hidden="true" /> Fully custom
                </span>
                <h2 id="custom-heading" className="mt-2 text-2xl font-semibold tracking-tight">
                  Request a customized chapter system
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Want a fully custom-built version tailored to your chapter? Tell us what you need
                  and we&apos;ll send a quote — a custom base fee applies. This is for chapters and
                  councils that need bespoke flows, integrations, branding, or reporting beyond the
                  standard plans.
                </p>
                <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
                  <CustomBullet>Bespoke recruitment, dues, or alumni-giving flows</CustomBullet>
                  <CustomBullet>Integrations with your council or national tools</CustomBullet>
                  <CustomBullet>Custom branding, reporting, and exports</CustomBullet>
                </ul>
              </div>
              <div className="lg:w-3/5">
                <CustomQuoteForm contactEmail={email} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Book a 15-min call ── */}
        <section id="book" aria-labelledby="book-heading" className="mt-16 scroll-mt-24">
          <div className="mb-6 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              <IconCalendar className="h-4 w-4" aria-hidden="true" /> 15 minutes
            </span>
            <h2 id="book-heading" className="mt-2 text-2xl font-semibold tracking-tight">
              Book a 15-minute call
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {calLink
                ? "Pick a time that works for you and we'll walk through Greekstack live — no slides, just your questions answered."
                : "Leave your details and a few times that work, and we'll reach out to lock in a quick call — no slides, just your questions answered."}
            </p>
          </div>

          {calLink ? (
            <CalEmbed calLink={calLink} />
          ) : (
            <div className="gs-glass rounded-2xl p-6 sm:p-8">
              <RequestCallForm contactEmail={email} />
            </div>
          )}
        </section>
      </main>

      <ApexFooter />
    </div>
  );
}

function ValueRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3.5 rounded-xl border border-border bg-secondary/30 p-4">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function CustomBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span
        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-sky-400"
        aria-hidden="true"
      />
      <span>{children}</span>
    </li>
  );
}

// ── Apex-only chrome ────────────────────────────────────────────────────────
// Self-contained Greekstack header/footer for the platform sales page. We do
// NOT reuse the chapter-branded PublicNav/PublicFooter here: those link to
// /schedule, /alumni, /portal — chapter routes that 404 on the apex. Mirrors the
// pattern in app/terms/page.tsx.

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
            markClassName="h-8 w-8 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-[-6deg] group-hover:scale-105"
          />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/app?demo=true"
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Interactive Demo
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
