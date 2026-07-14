import Link from "next/link";
import { headers } from "next/headers";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { IconShieldCheck } from "@/components/brand/icons";
import { IconArrowLeft } from "@/components/brand/icons/contact";
import { GreekstackWordmark } from "@/components/brand/greekstack-logo";
import { getSubdomain } from "@/lib/prisma";
import { chapterLiveGate } from "@/components/site/chapter-status";
import { chapterLiveMetadataGate } from "@/lib/chapter-live-guard";
import { getSiteConfig } from "@/lib/site-config";
import { cleanUrl, cleanMailto } from "@/lib/utils";

export const dynamic = "force-dynamic";

function requestHost(): string {
  try {
    const h = headers();
    return h.get("host") || h.get("x-forwarded-host") || "";
  } catch {
    return "";
  }
}

// Generated dynamically. Two audiences share this route:
//   • APEX (getSubdomain === null) → the Greekstack PLATFORM privacy policy
//     (what Greekstack collects from the chapters/admins who subscribe).
//   • TENANT → the chapter's privacy policy toward its rushees (unchanged).
export async function generateMetadata() {
  if (getSubdomain(requestHost()) === null) {
    const title = "Privacy Policy — Greekstack";
    const description =
      "How Greekstack collects, uses, and protects data from the chapters and administrators who use the platform, our sub-processors, retention, and your GDPR/CCPA rights.";
    return {
      title,
      description,
      alternates: { canonical: "/privacy" },
      robots: { index: true, follow: true },
      openGraph: {
        title,
        description,
        url: "/privacy",
        type: "website" as const,
        images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Greekstack" }],
      },
      twitter: {
        card: "summary_large_image" as const,
        title,
        description,
        images: ["/twitter-image"],
      },
    };
  }

  // GO-LIVE METADATA GATE (tenant branch) — a suspended / pending-billing chapter
  // must not leak its fraternityName + greekLetters through the tenant privacy
  // policy's title/description/OG (separate execution path from the body's
  // chapterLiveGate). The apex branch above already returns neutral Greekstack
  // metadata and is unaffected (gate returns null on the apex).
  const gated = await chapterLiveMetadataGate();
  if (gated) return gated;

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const fraternityName = cfg["chapter.fraternityName"] || "Your Chapter";
  const greekLetters = cfg["chapter.greekLetters"] || "";
  const schoolShort = cfg["chapter.schoolShort"] || "";
  const title = schoolShort ? `Privacy — ${fraternityName} @ ${schoolShort}` : `Privacy — ${fraternityName}`;
  const description = greekLetters
    ? `How the ${greekLetters} chapter collects, uses, and protects information from rushees.`
    : `How ${fraternityName} collects, uses, and protects information from rushees.`;
  const ogAlt = schoolShort ? `${fraternityName} @ ${schoolShort}` : fraternityName;
  return {
    title,
    description,
    alternates: { canonical: "/privacy" },
    openGraph: {
      title,
      description,
      url: "/privacy",
      type: "website" as const,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: ogAlt }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: ["/twitter-image"],
    },
  };
}

// Route entry: dispatch on apex-vs-tenant. The chapter→rushee policy below is
// kept byte-for-byte identical for tenants; the apex gets the platform policy.
export default async function PrivacyPage() {
  if (getSubdomain(requestHost()) === null) {
    return <PlatformPrivacyPage />;
  }
  // GO-LIVE GATE — the TENANT privacy policy renders chapter identity (fraternity
  // name, greekLetters, school) in its title, meta, and body, so a suspended or
  // still-pending-billing chapter must show the shared neutral state here too.
  // The apex branch above is unaffected: chapterLiveGate() returns null on the
  // apex. Mirrors app/alumni/join/page.tsx.
  const gate = await chapterLiveGate();
  if (gate) return gate;
  return <ChapterPrivacyPage />;
}

async function ChapterPrivacyPage() {
  const cfg = await getSiteConfig();
  const rushEmail = cfg["contact.rushEmail"];
  const rushMailto = cleanMailto(rushEmail);
  // Chapter identity — neutral fallbacks so the page never 500s on a fresh
  // deploy or the apex before /admin/setup has been run, and never leaks a
  // specific reference chapter. Empties are filtered out of joined sentences.
  const fraternityName = cfg["chapter.fraternityName"] || "Your Chapter";
  const greekLetters = cfg["chapter.greekLetters"] || "";
  const schoolName = cfg["chapter.schoolName"] || "";
  const schoolShort = cfg["chapter.schoolShort"] || "";
  const chapterAttribution = [
    [fraternityName, greekLetters].filter(Boolean).join(" "),
    schoolName ? `at the ${schoolName}` : "",
  ].filter(Boolean).join(" ");
  const chapterShortAttribution =
    [fraternityName, greekLetters].filter(Boolean).join(" ") +
    (schoolShort ? ` (${schoolShort})` : "");
  return (
    <div className="min-h-screen bg-background">      <PublicNav />
      <div className="container section-y max-w-3xl">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <IconArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" /> Back to home
        </Link>

        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">
          <IconShieldCheck className="h-3.5 w-3.5" accent="currentColor" aria-hidden="true" /> Privacy
        </span>
        <h1 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">
          What we collect, why, and how we protect it.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          {chapterAttribution} ("the chapter," "we") respects your privacy. This page explains exactly what data we collect from prospective new members ("PNMs"), how we use it, and the rights you have over your data.
        </p>

        <section className="mt-10 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">What we collect</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When you submit the rush interest form, we collect: full name, email address, phone number, year, major, hometown, optional headshot, and optional background notes. We do not collect government IDs, financial data, or sensitive personal information.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">SMS &amp; email consent (<abbr title="Telephone Consumer Protection Act — the federal law governing automated texts and calls" className="cursor-help no-underline decoration-dotted">TCPA</abbr>)</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your information is used solely to communicate with you about rush at {greekLetters ? `the ${greekLetters} chapter` : "the chapter"} — specifically: schedule announcements, event reminders, and bid-night logistics. By checking the consent box on the rush interest form you provide express written consent under <abbr title="Telephone Consumer Protection Act, the federal law governing automated texts and calls" className="cursor-help no-underline decoration-dotted decoration-muted-foreground/40">47 CFR §64.1200(f)(9)</abbr> to receive recurring marketing and informational text and email messages from <span className="text-foreground font-medium">{chapterShortAttribution}</span> sent using an automatic telephone dialing system or other automated technology. You can expect up to 8 messages per rush cycle. Message and data rates may apply. Consent to receive these messages is not a condition of any membership consideration. Reply <span className="font-mono text-foreground">HELP</span> for help, or <span className="font-mono text-foreground">STOP</span> at any time to opt out of texts; you may also email{" "}
            <a href={rushMailto} className="text-brand-red hover:underline">
              {rushEmail}
            </a>{" "}
            to be removed from all communications. Consent to receive texts is not a condition of any membership consideration.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Double opt-in:</span> after you submit the rush form we send one confirmation text to the number you provided asking you to reply <span className="font-mono text-foreground">YES</span> to confirm. We do not send any further marketing messages until you confirm, and your reply (or non-reply) is logged alongside the original consent receipt. If you never reply <span className="font-mono text-foreground">YES</span>, the chapter contacts you only by the email address on the form (if any).
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Quiet hours:</span> we send messages only between <span className="font-medium text-foreground">9:00&nbsp;AM and 9:00&nbsp;PM Eastern</span>. We do not text outside this window, in line with CTIA SMS Best Practices. Time-sensitive event reminders fired by automation are similarly throttled to this window.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Age &amp; minor protections</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By submitting the rush form you affirm one of the following: (a) you are <span className="font-medium text-foreground">18 years of age or older</span>, or (b) you are <span className="font-medium text-foreground">17 and have a parent or legal guardian's permission</span> to receive rush communications by phone and email. Many incoming{schoolShort ? ` ${schoolShort}` : ""} freshmen are 17 at orientation — a parent or guardian may also email{" "}
            <a href={cleanMailto(cfg["contact.advisorEmail"])} className="text-brand-red hover:underline">
              {cfg["contact.advisorEmail"]}
            </a>{" "}
            to confirm consent on a 17-year-old's behalf or to request removal at any time. We do not knowingly collect personal information from anyone under 13. If we learn we have inadvertently collected data from a minor, we will delete it promptly upon request.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Who sees it</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Only the chapter's executive board and active members, signed in to the chapter's gated admin area, can view rushee information. Active members are the only people who can vote, leave notes, or extend bids. We do not sell, rent, or share your data with any third party for marketing.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Where it lives</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Submissions are stored in a Postgres database hosted on Vercel/Neon. Headshots are stored in Vercel Blob. Email is sent via Resend; SMS via Twilio. Each provider operates under industry-standard encryption in transit and at rest.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Retention</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Rush data is retained through the Fall 2026 recruitment cycle. After Bid Night, records of rushees who declined or were not extended a bid are deleted within 90 days unless you explicitly opt in to future communications by emailing{" "}
            <a href={rushMailto} className="text-brand-red hover:underline">
              {rushEmail}
            </a>
            . Records of accepted members move to the active member directory and are retained while you remain in the chapter. We retain proof of SMS consent (timestamp + IP) for four years as required by TCPA recordkeeping rules.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Your rights — including California &amp; Virginia</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You have the right to request a copy of your data, ask for it to be corrected, or request deletion at any time by emailing{" "}
            <a href={rushMailto} className="text-brand-red hover:underline">
              {rushEmail}
            </a>
            . We will respond within 30 days. California (<abbr title="California Consumer Privacy Act / California Privacy Rights Act — state laws giving California residents control over their personal data" className="cursor-help no-underline decoration-dotted decoration-muted-foreground/40">CCPA/CPRA</abbr>) and Virginia (<abbr title="Virginia Consumer Data Protection Act — Virginia&apos;s state privacy law" className="cursor-help no-underline decoration-dotted decoration-muted-foreground/40">VCDPA</abbr>) residents have additional rights to know, correct, delete, and opt out of the sale or sharing of personal information for cross-context behavioral advertising. <span className="font-medium text-foreground">We do not sell or share your personal information for cross-context behavioral advertising.</span>
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Cookies</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This site uses only first-party functional cookies necessary to keep members signed in to the admin area and to remember booth-mode settings. We do not use advertising or analytics cookies. No third-party trackers are loaded.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Hazing reports</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {fraternityName} national and {greekLetters ? `the ${greekLetters} chapter` : "the chapter"} have a zero-tolerance anti-hazing policy. Reports can be submitted anonymously to <span className="text-foreground font-medium">{cfg["contact.advisorName"]}</span> at{" "}
            <a href={cleanMailto(cfg["contact.advisorEmail"])} className="text-brand-red hover:underline">
              {cfg["contact.advisorEmail"]}
            </a>
            , via the national anti-hazing hotline{" "}
            <a href={cleanUrl(cfg["antiHazing.hotlineUrl"])} target="_blank" rel="noreferrer noopener" className="text-brand-red hover:underline font-medium">
              {cfg["antiHazing.hotline"]}
            </a>
            {cfg["chapter.nationalHqUrl"] ? (
              <>
                , or through{" "}
                <a href={cfg["chapter.nationalHqUrl"]} target="_blank" rel="noreferrer noopener" className="text-brand-red hover:underline">
                  {cfg["chapter.nationalHqUrl"].replace(/^https?:\/\//, "")}
                </a>
              </>
            ) : null}
            .
          </p>
        </section>

        <p className="mt-12 text-xs text-muted-foreground">
          Last updated: {cfg["privacy.lastUpdated"]} · Questions:{" "}
          <a href={rushMailto} className="text-brand-red hover:underline">
            {rushEmail}
          </a>
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// PLATFORM privacy policy — rendered ONLY on the apex (greekstack.vercel.app).
// Audience = the chapters and administrators who subscribe to Greekstack, NOT
// rushees. Greekstack is the PROCESSOR of a chapter's data; each chapter is the
// controller. Uses Greekstack-branded apex chrome (not the chapter PublicNav/
// PublicFooter, which link to chapter-only routes that 404 on the apex).
// ════════════════════════════════════════════════════════════════════════

const PLATFORM_PRIVACY_UPDATED = "June 2026";

/** Public, BRANDED contact address for legal/privacy correspondence. Env-configurable
 *  via NEXT_PUBLIC_SUPPORT_EMAIL; defaults to the brand inbox (not a personal email).
 *  OWNER-KEYS: stand up + monitor the real support@ inbox (or set the env) before launch. */
const CONTACT_EMAIL = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "workbenjaminsachwitz@gmail.com").trim();

function PlatformPrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ApexHeader />

      <div className="container section-y max-w-3xl">
        <Link
          href="/"
          className="group mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" /> Back to home
        </Link>

        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
          <IconShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Privacy
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
          What Greekstack collects, why, and how we protect it.
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          This Privacy Policy describes how Greekstack (&ldquo;Greekstack,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us&rdquo;) — the white-label platform that powers fraternity and sorority chapter sites
          — handles data when a chapter, council, or organization (&ldquo;you&rdquo;) signs up for and uses
          the platform. It covers the data <span className="font-medium text-foreground">Greekstack itself</span>{" "}
          collects from chapters and their administrators. It does <span className="font-medium text-foreground">not</span>{" "}
          describe how an individual chapter handles its own rushees&apos; data — each chapter publishes its
          own privacy notice for that on its own chapter site.
        </p>

        <PSection title="Controller vs. processor">
          <p>
            For the data a chapter puts into the platform about its members, rushees, and alumni, the{" "}
            <span className="font-medium text-foreground">chapter is the data controller</span> and{" "}
            <span className="font-medium text-foreground">Greekstack is the data processor</span> — we
            process that data only on the chapter&apos;s instructions, to provide and support the service.
            For the data described on this page — the account and usage data Greekstack collects to run its
            business — <span className="font-medium text-foreground">Greekstack is the controller</span>.
          </p>
        </PSection>

        <PSection title="What we collect from chapters & admins">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <span className="font-medium text-foreground">Account &amp; identity:</span> the name, email
              address, and (optionally) phone number of the administrators and officers who create or are
              granted access to a chapter console, plus their hashed login credentials.
            </li>
            <li>
              <span className="font-medium text-foreground">Chapter &amp; organization details:</span> the
              chapter name, Greek letters, institution, and the branding/configuration you enter during
              setup.
            </li>
            <li>
              <span className="font-medium text-foreground">Billing &amp; payment metadata:</span> your plan,
              subscription status, billing contact, and payment metadata (such as amounts, dates, and status)
              for subscriptions and — where a chapter enables dues or donations — for those transactions. Card
              details are collected and stored by Stripe; we never see or store full card numbers, and dues
              payouts settle to the chapter&apos;s own connected account via Stripe Connect.
            </li>
            <li>
              <span className="font-medium text-foreground">Usage &amp; logs:</span> sign-in events, audit
              records of admin actions, IP address, browser/user-agent, and error/diagnostic logs used to
              keep the platform secure and reliable.
            </li>
            <li>
              <span className="font-medium text-foreground">Support communications:</span> messages you send
              us and our replies.
            </li>
          </ul>
          <p className="mt-3">
            We use only first-party functional cookies needed to keep administrators signed in and the
            service working. We do not run third-party advertising or cross-site tracking cookies.
          </p>
        </PSection>

        <PSection title="How we use it">
          <p>We use the data above to:</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>provide, maintain, and secure the platform and each chapter&apos;s isolated tenant;</li>
            <li>authenticate administrators and prevent unauthorized or cross-tenant access;</li>
            <li>bill subscriptions, process trials, and handle renewals and receipts;</li>
            <li>provide support and send essential service notices (billing, security, and material changes);</li>
            <li>diagnose problems, monitor performance, and improve the product.</li>
          </ul>
          <p className="mt-3">
            We do <span className="font-medium text-foreground">not</span> sell your data, and we do not use a
            chapter&apos;s member/rushee data for our own marketing or to train advertising models.
          </p>
        </PSection>

        <PSection title="Sub-processors">
          <p>
            We share data only with the service providers we rely on to operate the platform, each acting
            under its own security and privacy commitments and processing data only as needed to provide its
            service to us:
          </p>
          <ul className="mt-3 space-y-2">
            <PSubProcessor name="Neon" role="Managed Postgres database hosting (system of record)." />
            <PSubProcessor name="Vercel" role="Application hosting, edge delivery, and image (Blob) storage." />
            <PSubProcessor name="Stripe" role="Subscription billing and, where a chapter enables it, dues and donation payments — including payouts to a chapter's own connected account via Stripe Connect. Stripe collects and stores payment-card data; Greekstack never sees or stores full card numbers." />
            <PSubProcessor name="Resend" role="Transactional and platform email delivery." />
            <PSubProcessor name="Twilio" role="SMS delivery for chapter recruitment and notifications, and A2P 10DLC carrier registration at the platform level." />
            <PSubProcessor name="Cloudinary" role="Image storage, optimization, and delivery for chapter photos and headshots (used where a chapter enables it)." />
            <PSubProcessor name="Stream" role="Real-time chapter chat and announcement messaging (used where a chapter enables it)." />
          </ul>
          <p className="mt-3">
            We may also disclose data if required by law, to protect our rights or the safety of users, or in
            connection with a merger or acquisition (with notice as required). This list is kept current as
            our sub-processors change.
          </p>
        </PSection>

        <PSection title="Multi-tenant data isolation">
          <p>
            Greekstack is multi-tenant, but each chapter&apos;s data is{" "}
            <span className="font-medium text-foreground">isolated in its own dedicated database schema</span>.
            One chapter cannot read, query, or address another chapter&apos;s roster, recruitment, dues, or
            member data, and every request is resolved to a single tenant before any data is read. Within a
            chapter, officer access is further scoped by role-based permissions, and where optional services
            (chat, SMS, image delivery) are used, channels, identifiers, and assets are namespaced per chapter
            so they never cross tenants.
          </p>
        </PSection>

        <PSection title="Payments &amp; card data (Stripe)">
          <p>
            Subscription billing — and, where a chapter enables it, member dues and alumni donations — is
            processed by <span className="font-medium text-foreground">Stripe</span>. Payment-card details are
            collected and stored by Stripe under its own PCI-compliant systems;{" "}
            <span className="font-medium text-foreground">Greekstack never sees or stores full card
            numbers</span>. When a chapter collects dues or donations, funds are paid out to the chapter&apos;s
            own connected account through <span className="font-medium text-foreground">Stripe Connect</span> —
            Greekstack only stores payment metadata (such as amount, status, and the associated member or
            invoice), not card data.
          </p>
        </PSection>

        <PSection title="SMS consent, TCPA &amp; A2P 10DLC">
          <p>
            Where a chapter sends text messages through the platform, those messages are delivered via Twilio
            and are subject to U.S. SMS rules. Recipients must provide the consent required by the{" "}
            <span className="font-medium text-foreground">TCPA</span>, and every message stream honors{" "}
            <span className="font-medium text-foreground">STOP / HELP / START</span> keywords and a recipient
            quiet-hours window. <span className="font-medium text-foreground">A2P 10DLC</span> brand and
            campaign registration is handled by Greekstack at the platform level with the carriers, so
            individual chapters do not each register separately. A chapter is responsible for obtaining and
            honoring the consent of the people it texts; the consent receipts a chapter captures are retained
            as described in that chapter&apos;s own privacy notice.
          </p>
        </PSection>

        <PSection title="Where data lives & security">
          <p>
            Data is stored in a Postgres database hosted on Neon and an application layer hosted on Vercel,
            primarily in the United States; optional images may be delivered via Cloudinary and optional chat
            via Stream. We maintain tenant isolation so one chapter cannot access another&apos;s data, and we
            rely on industry-standard encryption in transit and at rest through our providers, scoped access
            controls, hashed administrator credentials, and audit logging. No method of transmission or storage
            is perfectly secure, but we work to protect your data using reasonable safeguards.
          </p>
        </PSection>

        <PSection title="Retention, export & deletion">
          <p>
            We retain account, chapter, and billing data for as long as your subscription is active and as
            needed to provide the service. You can{" "}
            <span className="font-medium text-foreground">export your data (such as your roster, recruitment
            records, and dues history) to CSV at any time</span>, and you may request a copy or deletion of
            your data by contacting us. After an account is closed or a subscription ends, Customer Data is made
            available for export for <span className="font-medium text-foreground">30 days</span>, after which
            it is deleted from active systems; residual copies in routine backups age out on our normal backup
            cycle. We retain billing records and certain logs longer where required for legal, accounting, tax,
            or security purposes.
          </p>
        </PSection>

        <PSection title="Your rights — GDPR & CCPA/CPRA">
          <p>
            Depending on where you are located, you may have the right to access, correct, delete, or receive
            a portable copy of the personal data we hold about you, to object to or restrict certain
            processing, and to withdraw consent. California residents (CCPA/CPRA) have the right to know,
            access, correct, delete, and to opt out of the sale or sharing of personal information —{" "}
            <span className="font-medium text-foreground">Greekstack does not sell or share personal
            information.</span> EU/UK residents (GDPR) have the rights described above and may lodge a
            complaint with a supervisory authority.
          </p>
          <p className="mt-3">
            To exercise any of these rights, contact us at the address below. We will respond within the time
            required by applicable law (generally within 30–45 days). Where Greekstack processes a chapter&apos;s
            member/rushee data as a processor, requests from those individuals should go to the chapter (the
            controller); we will assist the chapter in responding.
          </p>
        </PSection>

        <PSection title="International transfers">
          <p>
            If you access the platform from outside the United States, your data will be transferred to and
            processed in the United States and other countries where we or our sub-processors operate. Where
            required, we rely on appropriate safeguards (such as the European Commission&apos;s Standard
            Contractual Clauses) for such transfers.
          </p>
        </PSection>

        <PSection title="Children">
          <p>
            The platform is intended for use by chapter administrators, who are adults. It is not directed to
            children, and we do not knowingly collect personal information from children through the
            administrator-facing platform. Any age-related handling of a chapter&apos;s rushees is governed by
            that chapter&apos;s own privacy notice.
          </p>
        </PSection>

        <PSection title="Data Processing Agreement (DPA)">
          <p>
            Because Greekstack processes member and rushee data on a chapter&apos;s behalf, we make a Data
            Processing Agreement available to subscribing chapters. To request a DPA, or to ask any
            data-protection question, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </PSection>

        <PSection title="Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. If we make material changes we will give
            reasonable notice (by email or in-app) before they take effect, and we will update the
            &ldquo;last updated&rdquo; date below.
          </p>
        </PSection>

        <PSection title="Contact">
          <p>
            General questions and privacy-specific requests (access, export, correction, or
            deletion):{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>.
            See also our{" "}
            <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>.
          </p>
        </PSection>

        <p className="mt-12 text-xs text-muted-foreground">
          Last updated: {PLATFORM_PRIVACY_UPDATED} · Greekstack — the white-label Greek-life platform · Contact:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>
        </p>
      </div>

      <ApexFooter />
    </div>
  );
}

function PSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 space-y-2">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function PSubProcessor({ name, role }: { name: string; role: string }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden="true" />
      <span>
        <span className="font-medium text-foreground">{name}</span> — {role}
      </span>
    </li>
  );
}

// ── Apex-only Greekstack chrome (shared shape with app/terms/page.tsx) ────
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
