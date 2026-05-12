import Link from "next/link";
import type { Metadata } from "next";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { Crest } from "@/components/brand/wordmark";
import { getSiteConfig } from "@/lib/site-config";
import { cleanUrl, cleanMailto, cleanTel, titleCaseAddress } from "@/lib/utils";
import {
  ShieldCheck, ArrowLeft, Mail, Phone, MapPin, GraduationCap,
  HandHeart, Lock, FileText, Users, Heart, Building2, ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "For Parents",
  // Trimmed from 217 to ~155 chars so the description is not truncated in
  // Google SERP. Longer pitch lives on the page body.
  description:
    "Anti-hazing policy, advisor contact, GPA standards, and how Phi Sigma Kappa @ USC handles your son's data when he joins the rush list.",
  alternates: { canonical: "/parents" },
  openGraph: {
    title: "For Parents — Phi Sigma Kappa Gamma Triton",
    description:
      "Anti-hazing policy, advisor contact, GPA standards, and how we handle your son's data when he joins the rush list.",
    url: "/parents",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Phi Sigma Kappa @ USC" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "For Parents — Phi Sigma Kappa Gamma Triton",
    description:
      "Anti-hazing policy, advisor contact, GPA standards, and how we handle your son's data when he joins the rush list.",
    images: ["/twitter-image"],
  },
};

/**
 * Parent-facing landing page. Round-7 parent critic flagged the absence of a
 * dedicated /parents route as a real gap. This page is the single place to
 * answer the questions a skeptical parent actually asks: who's the adult in
 * charge, can I call them, what's the hazing policy, what's the GPA standard,
 * what data do you collect, and what does it cost.
 */
export default async function ParentsPage() {
  const cfg = await getSiteConfig();
  const advisorPlaceholder =
    !cfg["contact.advisorName"] || cfg["contact.advisorName"] === "Chapter Advisor";
  const phonePresent = !!cfg["contact.rushPhone"];

  return (
    <main id="main-content" className="min-h-screen bg-background">      <PublicNav />

      <div className="container section-y max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to home
        </Link>

        <div className="relative overflow-hidden rounded-2xl border border-phisig-red/20 bg-gradient-to-br from-phisig-red-soft/60 via-white to-white p-8 sm:p-12 mb-10">
          {/* Formal Phi Sigma Kappa coat of arms — sits in the upper-right
              corner as the brand authority signal for parents reading this
              page. This is the supplied national heraldic mark. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/coat-of-arms-formal.jpg"
            alt="Phi Sigma Kappa coat of arms"
            width={140}
            height={164}
            className="absolute top-6 right-6 hidden sm:block h-32 w-auto opacity-90 select-none pointer-events-none rounded-md shadow-sm ring-1 ring-phisig-red/10"
            aria-hidden="true"
          />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-phisig-red/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-phisig-red shadow-sm">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" /> For Parents &amp; Guardians
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight max-w-2xl leading-[1.05]">
            Your son&apos;s safety, academics, and contact info — straight talk.
          </h1>
          <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl">
            Phi Sigma Kappa Gamma Triton is the chapter at the University of South Carolina. We
            run a dry, FIPG-compliant rush with a hard zero-tolerance hazing policy. This page
            answers the questions you&apos;ll want answered before your son fills out our interest
            form — and tells you exactly how to reach a real adult if you have a concern.
          </p>
        </div>

        {/* Advisor + risk management ─────────────────────────────────── */}
        <section className="grid sm:grid-cols-2 gap-4 mb-10">
          <article className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
              <Users className="h-3 w-3" aria-hidden="true" /> Chapter advisor
            </div>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">
              {advisorPlaceholder ? "Pending — see below" : cfg["contact.advisorName"]}
            </h2>
            {cfg["contact.advisorTitle"] && (
              <p className="text-sm text-muted-foreground mt-0.5">{cfg["contact.advisorTitle"]}</p>
            )}
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-phisig-red" aria-hidden="true" />
                <a href={cleanMailto(cfg["contact.advisorEmail"])} className="text-phisig-red hover:underline">
                  {cfg["contact.advisorEmail"]}
                </a>
              </li>
              {phonePresent && (
                <li className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-phisig-red" aria-hidden="true" />
                  <a href={cleanTel(cfg["contact.rushPhone"])} className="text-phisig-red hover:underline">
                    {cfg["contact.rushPhone"]}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-phisig-red" aria-hidden="true" />
                {titleCaseAddress(cfg["contact.address"])}, {titleCaseAddress(cfg["contact.cityState"])}
              </li>
            </ul>
            {advisorPlaceholder && (
              <p className="mt-4 text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-md p-2.5">
                The chapter is finalizing the advisor of record for the {new Date().getFullYear()} year — until then,{" "}
                <a href={cleanMailto(cfg["contact.advisorEmail"])} className="underline">
                  {cfg["contact.advisorEmail"]}
                </a>{" "}
                routes to the e-board for any parent concern.
              </p>
            )}
          </article>

          <article className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Anti-hazing — zero tolerance
            </div>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">
              Report any concern — anonymously if you prefer.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {cfg["antiHazing.body"]}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-phisig-red" aria-hidden="true" />
                <a href="tel:+18886684293" className="text-phisig-red hover:underline">
                  National anti-hazing hotline · {cfg["antiHazing.hotline"]}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-phisig-red" aria-hidden="true" />
                <a href={cleanMailto(cfg["contact.advisorEmail"])} className="text-phisig-red hover:underline">
                  {cfg["contact.advisorEmail"]} (advisor, anonymous OK)
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Building2 className="h-3.5 w-3.5 text-phisig-red mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  <a
                    href="https://sc.edu/about/offices_and_divisions/student_life/our_initiatives/fraternity_and_sorority_life/index.php"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-phisig-red hover:underline"
                  >
                    USC Office of Fraternity &amp; Sorority Life
                  </a>
                  <span className="text-muted-foreground"> · the school's escalation channel above any chapter</span>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-phisig-red" aria-hidden="true" />
                <a href={cleanUrl(cfg["antiHazing.hotlineUrl"])} target="_blank" rel="noreferrer noopener" className="text-phisig-red hover:underline">
                  hazingprevention.org · 24/7 reporting + resources
                </a>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-phisig-red" aria-hidden="true" />
                <a href="https://phisigmakappa.org" target="_blank" rel="noreferrer noopener" className="text-phisig-red hover:underline">
                  phisigmakappa.org · National HQ
                </a>
              </li>
            </ul>
          </article>
        </section>

        {/* Quick facts ────────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold tracking-tight mb-5">Quick facts</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Fact icon={GraduationCap} label="Chapter GPA" value={cfg["stats.gpa"]} sub={cfg["stats.gpa.sub"]} />
            <Fact icon={Users} label={cfg["stats.brothers.label"] || "Active brothers"} value={cfg["stats.brothers"]} sub={cfg["stats.brothers.sub"]} />
            <Fact icon={Building2} label={cfg["stats.years.label"] || "Years at USC"} value={cfg["stats.years"]} sub={cfg["stats.years.sub"]} />
            <Fact icon={HandHeart} label={cfg["stats.charity.label"] || "Raised for charity"} value={cfg["stats.charity"]} sub={cfg["stats.charity.sub"]} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            All four numbers are admin-edited by the chapter rush chair. Data current as of the most recent admin save.
          </p>
        </section>

        {/* What rush actually looks like ──────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold tracking-tight mb-5">What rush actually looks like</h2>
          <div className="rounded-2xl border border-border bg-card p-6">
            <ol className="space-y-4 text-sm">
              <li className="flex gap-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-phisig-red text-white text-xs font-semibold shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-semibold">Open events (week 1) — dry.</p>
                  <p className="text-muted-foreground mt-0.5">
                    Cookouts and brotherhood events at the chapter house. No commitment, no application.
                    Brothers are 18+; rushees can be 17 with parent permission. All events are alcohol-free.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-phisig-red text-white text-xs font-semibold shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-semibold">Closed events (week 2) — invite only.</p>
                  <p className="text-muted-foreground mt-0.5">
                    Smaller invite-only events so we and your son can both feel out fit.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-phisig-red text-white text-xs font-semibold shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-semibold">Interviews &amp; Bid Day (week 3).</p>
                  <p className="text-muted-foreground mt-0.5">
                    One-on-ones with the e-board, then bids extended. Your son will receive a complete
                    cost breakdown — dues, house fees, philanthropy, formals — BEFORE he accepts a bid.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* Texting policy — surface the TCPA / CTIA disclosures that the
            full privacy policy spells out, in parent-friendly language. ────── */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold tracking-tight mb-5">Texting policy</h2>
          <div className="rounded-2xl border border-phisig-red/15 bg-phisig-red-soft/30 p-5 sm:p-6">
            <ul className="space-y-3 text-sm text-foreground/90 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-phisig-red shrink-0" />
                <span>
                  <span className="font-semibold">Up to 8 messages per rush cycle.</span>{" "}
                  Schedule announcements and event reminders only — never marketing
                  spam.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-phisig-red shrink-0" />
                <span>
                  <span className="font-semibold">Quiet hours: 9:00 AM – 9:00 PM Eastern.</span>{" "}
                  We never text outside this window (per CTIA SMS best
                  practices §5.1.7).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-phisig-red shrink-0" />
                <span>
                  <span className="font-semibold">Reply STOP to opt out</span> at any time —
                  takes effect immediately, no questions asked. Reply HELP for help
                  or our advisor's contact.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-phisig-red shrink-0" />
                <span>
                  <span className="font-semibold">Express written consent</span> recorded
                  under 47 CFR §64.1200(f)(9) at signup — disclosure text, timestamp,
                  IP, and user-agent retained for the 4-year TCPA recordkeeping
                  window. Your son can audit his own receipt at any time.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-phisig-red shrink-0" />
                <span>
                  <span className="font-semibold">Msg & data rates may apply.</span>{" "}
                  Standard carrier rates from your son's plan. We don't charge
                  anything.
                </span>
              </li>
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Full disclosure on the <Link href="/privacy" className="text-phisig-red hover:underline">privacy policy</Link>.
            </p>
          </div>
        </section>

        {/* Data + privacy ─────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold tracking-tight mb-5">Data, consent &amp; privacy</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <DataCard icon={Lock} title="What we collect">
              Name, phone, email, year, major, hometown, optional headshot. No DOB, no SSN, no payment info.
            </DataCard>
            <DataCard icon={Heart} title="Who sees it">
              Active brothers signed in to the gated admin area. We never sell or rent. Data flows
              through Vercel/Neon (DB), Resend (email), and Twilio (SMS).
            </DataCard>
            <DataCard icon={FileText} title="When it's deleted">
              90 days after Bid Night for any rushee who declines or doesn&apos;t receive a bid.
              Email <a href={cleanMailto(cfg["contact.rushEmail"])} className="text-phisig-red hover:underline">{cfg["contact.rushEmail"]}</a> to request deletion sooner.
            </DataCard>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Full <Link href="/privacy" className="text-phisig-red hover:underline">privacy policy</Link>{" "}
            covers TCPA SMS consent, CCPA/Virginia rights, cookies, and the 4-year recordkeeping window.
            If your son is 17, a parent or guardian can email{" "}
            <a href={cleanMailto(cfg["contact.advisorEmail"])} className="text-phisig-red hover:underline">{cfg["contact.advisorEmail"]}</a>{" "}
            to confirm consent on his behalf.
          </p>
        </section>

        {/* CTA */}
        <section className="rounded-2xl bg-gradient-to-br from-phisig-red via-phisig-red-dark to-phisig-red-dark text-white p-8 sm:p-10 relative overflow-hidden">
          <Crest className="absolute -bottom-6 -right-6 h-40 w-40 text-white opacity-10" aria-hidden="true" />
          <div className="relative max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Have a question we didn&apos;t answer?
            </h2>
            <p className="mt-3 text-white/95">
              Email <a href={cleanMailto(cfg["contact.advisorEmail"])} className="underline font-medium">{cfg["contact.advisorEmail"]}</a>{" "}
              or <a href={cleanMailto(cfg["contact.rushEmail"])} className="underline font-medium">{cfg["contact.rushEmail"]}</a>.
              We reply within 24 hours.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-white text-phisig-red px-4 py-2 text-sm font-semibold hover:bg-phisig-red-soft transition-colors"
            >
              Back to chapter home <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <PublicFooter />
    </main>
  );
}

function Fact({
  icon: Icon, label, value, sub,
}: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
        <Icon className="h-3 w-3" aria-hidden="true" /> {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value || "—"}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function DataCard({
  icon: Icon, title, children,
}: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
        <Icon className="h-3 w-3" aria-hidden="true" /> {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
