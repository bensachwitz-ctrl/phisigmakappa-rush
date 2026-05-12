import Link from "next/link";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { getSiteConfig } from "@/lib/site-config";
import { cleanUrl, cleanMailto } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Privacy — Phi Sigma Kappa @ USC",
  description:
    "How the Gamma Triton chapter collects, uses, and protects information from rushees.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy — Phi Sigma Kappa @ USC",
    description:
      "How the Gamma Triton chapter collects, uses, and protects information from rushees.",
    url: "/privacy",
    type: "website",
    // Falls back through metadataBase (set in app/layout.tsx) to the
    // homepage opengraph-image. Explicit so social unfurls of /privacy
    // render with the chapter brand card instead of a blank gray box.
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Phi Sigma Kappa @ USC" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy — Phi Sigma Kappa @ USC",
    description:
      "How the Gamma Triton chapter collects, uses, and protects information from rushees.",
    images: ["/twitter-image"],
  },
};

export default async function PrivacyPage() {
  const cfg = await getSiteConfig();
  const rushEmail = cfg["contact.rushEmail"];
  const rushMailto = cleanMailto(rushEmail);
  return (
    <main id="main-content" className="min-h-screen bg-background">      <PublicNav />
      <div className="container section-y max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
          <ShieldCheck className="h-3 w-3" /> Privacy
        </span>
        <h1 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">
          What we collect, why, and how we protect it.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Phi Sigma Kappa Gamma Triton at the University of South Carolina ("the chapter," "we") respects your privacy. This page explains exactly what data we collect from prospective new members ("PNMs"), how we use it, and the rights you have over your data.
        </p>

        <section className="mt-10 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">What we collect</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When you submit the rush interest form, we collect: full name, email address, phone number, year, major, hometown, optional headshot, and optional background notes. We do not collect government IDs, financial data, or sensitive personal information.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">SMS &amp; email consent (TCPA)</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your information is used solely to communicate with you about Fall 2026 rush at the Gamma Triton chapter — specifically: schedule announcements, event reminders, and bid-night logistics. By checking the consent box on the rush interest form you provide express written consent under 47 CFR §64.1200(f)(9) to receive recurring marketing and informational text and email messages from <span className="text-foreground font-medium">Phi Sigma Kappa Gamma Triton (USC)</span> sent using an automatic telephone dialing system or other automated technology. You can expect up to 8 messages per rush cycle. Message and data rates may apply. Consent to receive these messages is not a condition of any membership consideration. Reply <span className="font-mono text-foreground">HELP</span> for help, or <span className="font-mono text-foreground">STOP</span> at any time to opt out of texts; you may also email{" "}
            <a href={rushMailto} className="text-phisig-red hover:underline">
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
            By submitting the rush form you affirm one of the following: (a) you are <span className="font-medium text-foreground">18 years of age or older</span>, or (b) you are <span className="font-medium text-foreground">17 and have a parent or legal guardian's permission</span> to receive rush communications by phone and email. Many incoming USC freshmen are 17 at orientation — a parent or guardian may also email{" "}
            <a href={cleanMailto(cfg["contact.advisorEmail"])} className="text-phisig-red hover:underline">
              {cfg["contact.advisorEmail"]}
            </a>{" "}
            to confirm consent on a 17-year-old's behalf or to request removal at any time. We do not knowingly collect personal information from anyone under 13. If we learn we have inadvertently collected data from a minor, we will delete it promptly upon request.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Who sees it</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Only the chapter's executive board and active brothers, signed in to the chapter's gated admin area, can view rushee information. Active brothers are the only people who can vote, leave notes, or extend bids. We do not sell, rent, or share your data with any third party for marketing.
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
            <a href={rushMailto} className="text-phisig-red hover:underline">
              {rushEmail}
            </a>
            . Records of accepted brothers move to the active member directory and are retained while you remain in the chapter. We retain proof of SMS consent (timestamp + IP) for four years as required by TCPA recordkeeping rules.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Your rights — including California &amp; Virginia</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You have the right to request a copy of your data, ask for it to be corrected, or request deletion at any time by emailing{" "}
            <a href={rushMailto} className="text-phisig-red hover:underline">
              {rushEmail}
            </a>
            . We will respond within 30 days. California (CCPA/CPRA) and Virginia (VCDPA) residents have additional rights to know, correct, delete, and opt out of the sale or sharing of personal information for cross-context behavioral advertising. <span className="font-medium text-foreground">We do not sell or share your personal information for cross-context behavioral advertising.</span>
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Cookies</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This site uses only first-party functional cookies necessary to keep brothers signed in to the admin area and to remember booth-mode settings. We do not use advertising or analytics cookies. No third-party trackers are loaded.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Hazing reports</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Phi Sigma Kappa national and the Gamma Triton chapter have a zero-tolerance anti-hazing policy. Reports can be submitted anonymously to <span className="text-foreground font-medium">{cfg["contact.advisorName"]}</span> at{" "}
            <a href={cleanMailto(cfg["contact.advisorEmail"])} className="text-phisig-red hover:underline">
              {cfg["contact.advisorEmail"]}
            </a>
            , via the national anti-hazing hotline{" "}
            <a href={cleanUrl(cfg["antiHazing.hotlineUrl"])} target="_blank" rel="noreferrer noopener" className="text-phisig-red hover:underline font-medium">
              {cfg["antiHazing.hotline"]}
            </a>
            , or through{" "}
            <a href="https://phisigmakappa.org" target="_blank" rel="noreferrer noopener" className="text-phisig-red hover:underline">
              phisigmakappa.org
            </a>
            .
          </p>
        </section>

        <p className="mt-12 text-xs text-muted-foreground">
          Last updated: {cfg["privacy.lastUpdated"]} · Questions:{" "}
          <a href={rushMailto} className="text-phisig-red hover:underline">
            {rushEmail}
          </a>
        </p>
      </div>
      <PublicFooter />
    </main>
  );
}
