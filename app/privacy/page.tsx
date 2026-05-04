import Link from "next/link";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy — Phi Sigma Kappa @ USC",
  description: "How the Gamma Triton chapter collects, uses, and protects information from rushees.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <PublicNav />
      <div className="container py-12 sm:py-16 max-w-3xl">
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
          Phi Sigma Kappa Gamma Triton at the University of South Carolina ("the chapter," "we") respects your privacy. This page explains exactly what data we collect from prospective new members and how we use it.
        </p>

        <section className="mt-10 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">What we collect</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When you submit the rush interest form, we collect: full name, email address, phone number, year, major, hometown, optional headshot, and optional background notes. We do not collect government IDs, financial data, or sensitive personal information.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">How we use it</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your information is used solely to communicate with you about Fall 2026 rush at the Gamma Triton chapter — specifically: event reminders, schedule updates, and bid-night logistics. By submitting the form you consent to receive these communications by email and SMS. Message and data rates may apply. Reply <span className="font-mono text-foreground">STOP</span> to opt out of texts at any time, or email <a href="mailto:rush@phisig-usc.com" className="text-phisig-red hover:underline">rush@phisig-usc.com</a> to be removed from all communications.
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
            Rush data is retained through the Fall 2026 recruitment cycle. After Bid Night, records of rushees who declined or were not extended a bid are deleted within 90 days unless you explicitly opt in to future communications. Records of accepted brothers move to the active member directory and are retained while you remain in the chapter.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Your rights</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You can request a copy of your data, ask for it to be corrected, or request deletion at any time by emailing <a href="mailto:rush@phisig-usc.com" className="text-phisig-red hover:underline">rush@phisig-usc.com</a>. We will respond within 30 days.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Hazing reports</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Phi Sigma Kappa national and the Gamma Triton chapter have a zero-tolerance anti-hazing policy. Reports can be submitted anonymously to the chapter advisor or to Phi Sigma Kappa national headquarters at <a href="https://phisigmakappa.org" target="_blank" rel="noreferrer" className="text-phisig-red hover:underline">phisigmakappa.org</a>.
          </p>
        </section>

        <p className="mt-12 text-xs text-muted-foreground">
          Last updated: May 2026 · Questions: <a href="mailto:rush@phisig-usc.com" className="text-phisig-red hover:underline">rush@phisig-usc.com</a>
        </p>
      </div>
      <PublicFooter />
    </main>
  );
}
