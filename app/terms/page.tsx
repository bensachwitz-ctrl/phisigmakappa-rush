// /terms — PLATFORM Terms of Service for the Greekstack APEX.
//
// This is the contract between Greekstack (the SaaS operator) and the
// fraternity/sorority CHAPTERS that subscribe to it — NOT a chapter↔rushee
// document. It therefore renders ONLY on the apex (getSubdomain === null);
// on any tenant host it 404s, because a chapter's public site should never
// surface the platform's commercial terms to its rushees/parents.
//
// Apex-only means we use the Greekstack-branded chrome (GreekstackWordmark)
// inline rather than the chapter-flavored PublicNav/
// PublicFooter (whose links point at /schedule, /alumni, /portal — all of
// which 404 on the apex). Indexable: this is a real marketing/legal page.

import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getSubdomain } from "@/lib/prisma";
import { GreekstackWordmark } from "@/components/brand/greekstack-logo";
import { IconScale, IconArrowLeft } from "@/components/brand/icons/contact";

export const dynamic = "force-dynamic";

// Effective date is rendered in copy; bump when the terms materially change.
const EFFECTIVE_DATE = "June 2026";

function requestHost(): string {
  try {
    const h = headers();
    return h.get("host") || h.get("x-forwarded-host") || "";
  } catch {
    return "";
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const host = requestHost();
  // On a tenant host this page 404s, so its metadata is irrelevant there; we
  // still emit neutral, indexable apex metadata for the apex render.
  const title = "Terms of Service — Greekstack";
  const description =
    "The agreement between Greekstack and the chapters that subscribe to the platform: acceptable use, subscription and trial terms, data ownership, sub-processors, and liability.";
  return {
    title,
    description,
    alternates: { canonical: "/terms" },
    // Indexable — do NOT noindex. This is a public legal page.
    robots: { index: getSubdomain(host) === null, follow: true },
    openGraph: {
      title,
      description,
      url: "/terms",
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

export default async function TermsPage() {
  // Renders on every host (platform legal page); only INDEXED on the apex
  // (see generateMetadata robots) to avoid duplicate content across tenant
  // subdomains. The footer links here relatively from any host.

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ApexHeader />

      <main id="main-content" className="container section-y max-w-3xl">
        <Link
          href="/"
          className="group mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" /> Back to home
        </Link>

        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
          <IconScale className="h-3.5 w-3.5" aria-hidden="true" /> Terms of Service
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
          The agreement between Greekstack and your chapter.
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          These Terms of Service (the &ldquo;Terms&rdquo;) govern your chapter&apos;s access to and use
          of the Greekstack platform (&ldquo;Greekstack,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) — the
          white-label software platform that powers your chapter&apos;s recruitment pipeline, dues
          collection, member directory, alumni network, and chapter operations. By creating an account,
          starting a trial, or otherwise using the platform, the individual accepting these Terms on
          behalf of a chapter, council, or organization (the &ldquo;Customer&rdquo; or &ldquo;you&rdquo;)
          represents that they are authorized to bind that organization, and agrees to these Terms.
        </p>

        <Section title="1. The service">
          <p>
            Greekstack provides each Customer an isolated, brandable chapter site and admin console on
            its own subdomain. We may add, change, or remove features over time. We aim to keep the
            platform available and performant, but it is provided on an &ldquo;as available&rdquo; basis
            and we do not promise uninterrupted service. Scheduled maintenance and provider-side outages
            (e.g. our hosting or database vendors) may cause downtime.
          </p>
        </Section>

        <Section title="2. Accounts & acceptable use">
          <p>
            You are responsible for the activity of every administrator, officer, and member you grant
            access to your chapter&apos;s console, and for keeping their credentials secure. You agree to
            use the platform only for its intended purpose — running a legitimate Greek-letter
            organization&apos;s operations — and in compliance with all applicable laws, your inter/national
            organization&apos;s policies, and your host institution&apos;s rules.
          </p>
          <p className="mt-3">You agree NOT to:</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>upload unlawful, hateful, harassing, or infringing content, or content that promotes hazing;</li>
            <li>
              send messages (SMS or email) to anyone who has not provided the consent required by law
              (including the TCPA and CAN-SPAM), or outside the consent and quiet-hours rules surfaced in
              your chapter&apos;s own privacy disclosures;
            </li>
            <li>attempt to access another tenant&apos;s data, probe or breach platform security, or circumvent tenant isolation;</li>
            <li>scrape, resell, sublicense, or white-label the platform to third parties without our written agreement;</li>
            <li>upload malware, or use the platform to store or transmit anyone&apos;s government IDs, payment-card numbers, or other sensitive data outside the fields the product provides.</li>
          </ul>
          <p className="mt-3">
            You are solely responsible for obtaining and honoring the SMS/email consent of the prospective
            new members, members, parents, and alumni you contact through the platform, and for the content
            you publish on your chapter site. Greekstack is the processor of that data, not its publisher.
          </p>
        </Section>

        <Section title="3. Free first month">
          <p>
            New chapters start with their <span className="font-medium text-foreground">first month free</span>{" "}
            on the Base plan (or with <span className="font-medium text-foreground">$0 upfront</span> on the
            dues-share plan), with no card required to launch. No charge is made during the first month. Unless
            you cancel before the first month ends, billing begins in month two and the payment method on file
            is charged the then-current fee for your selected plan. You may cancel at any time from your billing
            settings; if you cancel during the first month you are not charged. We may modify or discontinue
            this offer at any time.
          </p>
        </Section>

        <Section title="4. Subscriptions, fees & payment">
          <p>
            Paid plans are billed in advance on a recurring basis (monthly or annually, as selected) through
            our payment processor, Stripe. By providing a payment method you authorize us to charge all fees
            for your plan, plus any applicable taxes, on each renewal until you cancel. Fees are quoted and
            charged in U.S. dollars.
          </p>
          <p className="mt-3">
            <span className="font-medium text-foreground">Renewals &amp; cancellation.</span> Subscriptions
            renew automatically for successive terms unless cancelled before the current term ends. You may
            cancel at any time; cancellation stops the next renewal and your access continues until the end of
            the period already paid for. Except where required by law, fees already paid are{" "}
            <span className="font-medium text-foreground">non-refundable</span> and we do not provide prorated
            refunds for partial periods.
          </p>
          <p className="mt-3">
            <span className="font-medium text-foreground">Dues-share plan.</span> If you choose the dues-share
            plan instead of a flat subscription, you pay nothing up front; instead, Greekstack&apos;s fee is a{" "}
            <span className="font-medium text-foreground">percentage of the dues you collect</span> through the
            platform (currently 1.5% of dues for your first semester as an introductory rate, then 3%
            thereafter), which is calculated on, and charged against, the dues processed through your connected
            Stripe account. You may cancel the dues-share plan at any time; the then-current percentage and any
            introductory terms are disclosed at sign-up and on our pricing page.
          </p>
          <p className="mt-3">
            <span className="font-medium text-foreground">Price changes.</span> We may change plan pricing
            (including subscription fees and the dues-share percentage); any change applies to your next
            renewal or billing cycle, and we will give reasonable advance notice (at least 30 days for the
            affected plan) by email or in-app.
          </p>
          <p className="mt-3">
            <span className="font-medium text-foreground">Dues processing &amp; payouts.</span> If your chapter
            enables dues or donation collection, member and donor payments are processed through your own{" "}
            <span className="font-medium text-foreground">connected Stripe account, with payouts settling to
            that account via Stripe Connect</span>. Standard Stripe processing fees apply to those transactions.
            Except for any dues-share percentage described above, Greekstack adds no markup to dues or
            donations and is not a party to, and is not responsible for, the underlying transactions between
            your chapter and its members or donors. Your use of Stripe is also subject to Stripe&apos;s own
            connected-account and services agreements.
          </p>
        </Section>

        <Section title="5. Data ownership">
          <p>
            <span className="font-medium text-foreground">Your chapter owns its data.</span> All content,
            member records, rushee submissions, alumni profiles, and other information your chapter or its
            users put into the platform (&ldquo;Customer Data&rdquo;) remains the property of your chapter.
            Greekstack acts solely as a <span className="font-medium text-foreground">data processor</span> on
            your behalf — we process Customer Data only to provide and support the service, never to sell it,
            and never to advertise to your members. We claim no ownership of Customer Data.
          </p>
          <p className="mt-3">
            You grant us the limited license to host, copy, transmit, and display Customer Data as needed to
            operate the platform, maintain backups, and provide support. You are responsible for the accuracy
            of Customer Data and for having the rights and consents necessary for us to process it. You may
            export your Customer Data, and may request deletion as described in the{" "}
            <Link href="/privacy" className="text-blue-600 hover:underline">privacy policy</Link>.
          </p>
        </Section>

        <Section title="6. Sub-processors">
          <p>
            To deliver the platform we rely on the following third-party sub-processors, each of which
            operates under its own security and privacy commitments and processes Customer Data only as
            needed to provide its service to us:
          </p>
          <ul className="mt-3 space-y-2">
            <SubProcessor name="Neon" role="Managed Postgres database hosting (the system of record for Customer Data)." />
            <SubProcessor name="Vercel" role="Application hosting, edge delivery, and Blob storage for uploaded images." />
            <SubProcessor name="Stripe" role="Subscription billing for chapters and, where enabled, dues and donation processing with payouts to a chapter's own connected account via Stripe Connect. Stripe stores payment-card data; Greekstack does not." />
            <SubProcessor name="Resend" role="Transactional and chapter email delivery." />
            <SubProcessor name="Twilio" role="SMS delivery for chapter recruitment and notification messages, with A2P 10DLC carrier registration handled at the platform level." />
            <SubProcessor name="Cloudinary" role="Image storage, optimization, and delivery for chapter photos and headshots (where enabled)." />
            <SubProcessor name="Stream" role="Real-time chapter chat and announcement messaging (where enabled)." />
          </ul>
          <p className="mt-3">
            We may add or replace sub-processors as the platform evolves and will keep this list current. Our
            use of these providers does not relieve us of our obligations to you under these Terms.
          </p>
        </Section>

        <Section title="7. Intellectual property">
          <p>
            The platform — including its software, design, brand, and the Greekstack name and logo — is and
            remains our property and that of our licensors. These Terms grant you a limited, non-exclusive,
            non-transferable right to access and use the platform during your subscription. Your chapter&apos;s
            own names, marks, and content remain yours; you grant us the limited right to display them within
            your chapter site to provide the service. Each chapter is responsible for its authorization to use
            any inter/national organization&apos;s marks it uploads.
          </p>
        </Section>

        <Section title="8. Confidentiality & security">
          <p>
            We maintain tenant isolation so one chapter cannot access another chapter&apos;s data, and we use
            industry-standard measures — encryption in transit and at rest through our providers, scoped
            access controls, and audit logging — to protect Customer Data. No system is perfectly secure; you
            are responsible for safeguarding your own administrator credentials and for promptly notifying us
            of any suspected unauthorized access.
          </p>
        </Section>

        <Section title="9. Termination & suspension">
          <p>
            You may terminate by cancelling your subscription. We may suspend or terminate your access if you
            materially breach these Terms (including non-payment or prohibited use), if required by law, or if
            your continued use poses a security or legal risk to the platform or other tenants — with notice
            where reasonably practicable, and immediately for serious violations such as attempted breaches of
            tenant isolation.
          </p>
          <p className="mt-3">
            On termination, your right to use the platform ends. We will make Customer Data available for
            export for <span className="font-medium text-foreground">30 days</span> after termination, after
            which we may delete it from active systems; residual copies in routine backups age out on our
            normal backup cycle. Sections that by their nature should survive termination (data ownership,
            intellectual property, disclaimers, limitation of liability, and governing law) survive.
          </p>
        </Section>

        <Section title="10. Disclaimers">
          <p>
            The platform is provided <span className="font-medium text-foreground">&ldquo;as is&rdquo; and
            &ldquo;as available&rdquo;</span> without warranties of any kind, whether express, implied, or
            statutory, including any implied warranties of merchantability, fitness for a particular purpose,
            and non-infringement. We do not warrant that the platform will be uninterrupted, error-free, or
            secure, or that it will meet your specific requirements. You are responsible for your chapter&apos;s
            compliance with the TCPA, CAN-SPAM, your institution&apos;s policies, and your inter/national
            organization&apos;s rules; Greekstack is a tool and does not provide legal advice.
          </p>
        </Section>

        <Section title="11. Limitation of liability">
          <p>
            To the maximum extent permitted by law, in no event will Greekstack be liable for any indirect,
            incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits,
            revenue, data, goodwill, or other intangible losses, arising out of or relating to your use of (or
            inability to use) the platform — even if advised of the possibility of such damages.
          </p>
          <p className="mt-3">
            Greekstack&apos;s total aggregate liability for all claims relating to the platform will not exceed
            the greater of (a) the total fees you paid to Greekstack for the platform in the{" "}
            <span className="font-medium text-foreground">twelve (12) months</span> before the event giving
            rise to the claim, or (b) one hundred U.S. dollars (US$100). Some jurisdictions do not allow
            certain limitations, so some of the above may not apply to you.
          </p>
        </Section>

        <Section title="12. Indemnification">
          <p>
            You agree to defend, indemnify, and hold Greekstack harmless from any claims, damages, and
            expenses (including reasonable legal fees) arising out of your Customer Data, your content, your
            use of the platform in violation of these Terms or applicable law, or your messaging to
            individuals without the consent the law requires.
          </p>
        </Section>

        <Section title="13. Changes to these Terms">
          <p>
            We may update these Terms from time to time. If we make material changes we will give reasonable
            notice (by email or in-app) before they take effect. Your continued use of the platform after the
            effective date of a change constitutes acceptance of the updated Terms. If you do not agree, your
            remedy is to stop using the platform and cancel your subscription.
          </p>
        </Section>

        <Section title="14. Governing law">
          <p>
            These Terms are governed by the laws of the State of{" "}
            <span className="font-medium text-foreground">Delaware</span>, without regard to its
            conflict-of-laws rules, and any dispute will be subject to the exclusive jurisdiction of the state
            and federal courts located in{" "}
            <span className="font-medium text-foreground">New Castle County, Delaware</span>.
          </p>
        </Section>

        <Section title="15. Contact">
          <p>
            General questions? Email{" "}
            <a href="mailto:hello@greekstack.com" className="text-blue-600 hover:underline">hello@greekstack.com</a>.
            Legal notices may also be sent to{" "}
            <a href="mailto:legal@greekstack.app" className="text-blue-600 hover:underline">legal@greekstack.app</a>.
          </p>
        </Section>

        <p className="mt-12 text-xs text-muted-foreground">
          Effective date: {EFFECTIVE_DATE} · Greekstack — the white-label Greek-life platform · Contact:{" "}
          <a href="mailto:hello@greekstack.com" className="text-blue-600 hover:underline">hello@greekstack.com</a>{" "}
          · See also our{" "}
          <Link href="/privacy" className="text-blue-600 hover:underline">privacy policy</Link>.
        </p>
      </main>

      <ApexFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 space-y-2">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function SubProcessor({ name, role }: { name: string; role: string }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden="true" />
      <span>
        <span className="font-medium text-foreground">{name}</span> — {role}
      </span>
    </li>
  );
}

// ── Apex-only chrome ────────────────────────────────────────────────────
// Self-contained Greekstack header/footer for the platform legal pages. We do
// NOT reuse the chapter-branded PublicNav/PublicFooter here: those link to
// /schedule, /alumni, /portal — chapter routes that 404 on the apex.

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
