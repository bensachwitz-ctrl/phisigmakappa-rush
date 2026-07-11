import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getSubdomain } from "@/lib/prisma";
import { resolveTestFlightUrl } from "@/lib/ios-app";
import { GreekstackWordmark } from "@/components/brand/greekstack-logo";
import { IconSmartphone as Smartphone, IconDownload as Download, IconArrowLeft as ArrowLeft, IconBell as Bell, IconLink as Link2, IconWifiOff as WifiOff, IconCheckCircle as CheckCircle2, IconQrCode as QrCode, IconShieldCheck as ShieldCheck, IconChevronRight as ChevronRight, IconExternal as ExternalLink, IconCalendar as Calendar, IconMembers as Users, IconUser as User } from "@/components/brand/icons";

export const dynamic = "force-dynamic";

/**
 * The chapter's TestFlight invite link. Owner-gated: it only exists once the iOS
 * build is live in App Store Connect / TestFlight. Set NEXT_PUBLIC_TESTFLIGHT_URL
 * to the real `https://testflight.apple.com/join/<code>` invite to light up the
 * install CTAs. Until then the /ios page renders an honest "coming soon" state
 * instead of a dead `…/join/placeholder` link (resolution + validation live in
 * lib/ios-app.ts so they're unit-tested and reused).
 */
function testFlightUrl(): string | null {
  return resolveTestFlightUrl(process.env.NEXT_PUBLIC_TESTFLIGHT_URL);
}

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
  const title = "iOS App — Greekstack";
  const description =
    "Download the companion Greekstack iOS app for fast native access, deep links, and offline-ready chapter data.";
  return {
    title,
    description,
    alternates: { canonical: "/ios" },
    robots: { index: getSubdomain(host) === null, follow: true },
    openGraph: {
      title,
      description,
      url: "/ios",
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

export default async function IosPage() {
  const tfUrl = testFlightUrl();
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ApexHeader />

      <div className="container section-y max-w-5xl flex-1 px-4 sm:px-6">
        <Link
          href="/"
          className="group mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" /> Back to home
        </Link>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-slate-100 p-8 sm:p-12 shadow-[0_24px_50px_-12px_rgba(15,23,42,0.6)]">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
          <div className="absolute -right-24 -top-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid gap-8 lg:grid-cols-12 items-center relative z-10">
            <div className="lg:col-span-7 space-y-6 text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-400/10 text-sky-300 text-xs font-semibold uppercase tracking-wider border border-sky-400/20">
                <Smartphone className="w-3.5 h-3.5" /> Mobile Companion
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl leading-tight">
                Greek Stack on <span className="bg-gradient-to-r from-sky-300 via-blue-400 to-amber-300 bg-clip-text text-transparent">your iPhone</span>.
              </h1>
              <p className="text-base sm:text-lg text-slate-300/90 leading-relaxed">
                Unlock native iOS capabilities to stay connected with your chapter. Keep track of events, complete service hours, check-in for attendance, and coordinate directly on the go.
              </p>
              
              <div className="flex flex-wrap gap-4 pt-2">
                {tfUrl ? (
                  <a
                    href={tfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-sm font-bold rounded-2xl shadow-[0_8px_30px_rgb(37,99,235,0.35)] transition duration-200 hover:-translate-y-px"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    Install via TestFlight
                  </a>
                ) : (
                  <span
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/10 text-slate-200 text-sm font-bold rounded-2xl border border-white/10"
                    role="status"
                  >
                    <Smartphone className="w-4 h-4" aria-hidden="true" />
                    iOS app — coming soon
                  </span>
                )}
                <Link
                  href="#install-steps"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white text-sm font-semibold rounded-2xl border border-white/10 transition duration-200"
                >
                  Step-by-step Guide
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center justify-center gap-3">
              {/* iPhone Visual Mockup — a decorative illustration of the app, not
                  live data. Hidden from assistive tech and captioned below so the
                  sample figures never read as a real member's stats. */}
              <div
                aria-hidden="true"
                className="relative w-64 h-[480px] rounded-[42px] border-4 border-slate-700 bg-slate-950 p-2.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] ring-1 ring-white/10 flex flex-col justify-between overflow-hidden">
                {/* Dynamic Island */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-30 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-slate-900 rounded-full absolute right-3" />
                </div>
                
                {/* Screen Header */}
                <div className="h-10 pt-3 flex items-center justify-between px-3 text-[10px] font-semibold text-slate-400 z-20">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    <span>5G</span>
                  </div>
                </div>

                {/* Simulated WebApp Content */}
                <div className="flex-1 bg-slate-900 rounded-[30px] p-4 flex flex-col justify-between overflow-hidden text-slate-200 relative">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-[10px] font-bold">
                          GS
                        </div>
                        <span className="text-xs font-bold tracking-tight text-white">Greek Stack</span>
                      </div>
                      <Bell className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                    </div>

                    {/* Active Chapter Card */}
                    <div className="bg-slate-800/80 border border-slate-700/50 p-3 rounded-xl space-y-2 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                        <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400">Upcoming Event</span>
                      </div>
                      <h4 className="text-xs font-bold text-white leading-tight">Chapter Meeting & Voting</h4>
                      <p className="text-[9px] text-slate-400">Sunday @ 7:00 PM • Memorial Hall</p>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-left">
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/30">
                        <span className="text-[8px] text-slate-400">Service Hours</span>
                        <p className="text-xs font-bold text-white mt-0.5">14.5 / 15.0</p>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/30">
                        <span className="text-[8px] text-slate-400">Dues Paid</span>
                        <p className="text-xs font-bold text-white mt-0.5">100%</p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation bar */}
                  <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center px-1 text-[8px] text-slate-400 font-medium z-20">
                    <div className="flex flex-col items-center gap-0.5 text-sky-400">
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Feed</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Events</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Roster</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Profile</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">Illustration — not live data.</p>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <section className="mt-16 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Why use the iOS app?</h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              The iOS app integrates deeply with Apple's platform features to deliver a seamless mobile experience.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FeatureCard
              icon={<WifiOff className="h-6 w-6 text-amber-600" />}
              title="Offline Resilience"
              description="Launches instantly and displays cached data even in basement chapter rooms, campus library basements, or areas with poor cellular service."
            />
            <FeatureCard
              icon={<Link2 className="h-6 w-6 text-blue-600" />}
              title="Native Speed & Deep Links"
              description="Tactile haptics on every action, instant launch, and universal links that open the right page in the app — a faster, more polished feel than the mobile web."
            />
          </div>
        </section>

        {/* Installation Steps Section */}
        <section id="install-steps" className="mt-20 scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How to install & configure</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Follow these simple steps to install the app on your Apple device and get started.
            </p>
          </div>

          <div className="max-w-3xl mx-auto border border-border bg-card rounded-2xl shadow-sm p-6 sm:p-10 space-y-8 text-left">
            <StepItem
              number="1"
              title="Get TestFlight"
              description="Download Apple's official beta testing utility, TestFlight, from the App Store on your iPhone."
              actionLink="https://apps.apple.com/app/testflight/id899247664"
              actionText="Download TestFlight"
            />
            <StepItem
              number="2"
              title="Join the Beta"
              description={
                tfUrl
                  ? "Tap our TestFlight invitation link to install the latest build of Greek Stack."
                  : "The TestFlight beta link will appear here the moment your chapter's iOS build goes live. Until then, the full platform runs in your mobile browser — add it to your Home Screen for an app-like experience."
              }
              actionLink={tfUrl || undefined}
              actionText={tfUrl ? "Join Greek Stack Beta" : undefined}
            />
            <StepItem
              number="3"
              title="Log In & Select Chapter"
              description="Open the Greek Stack app on your phone, choose your organization, and sign in using your portal credentials. The app automatically scopes your data to your chapter."
            />
            <StepItem
              number="4"
              title="Make it yours"
              description="That's it — you're in. The app responds with native haptics, opens shared links straight to the right page, and keeps your chapter's data cached so it loads instantly even when you're offline."
            />
          </div>
        </section>
      </div>

      <ApexFooter />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-start rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-3 rounded-xl bg-secondary/80 border border-border mb-4">{icon}</div>
      <h3 className="font-bold text-lg text-foreground text-left">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-left">{description}</p>
    </div>
  );
}

function StepItem({
  number,
  title,
  description,
  actionLink,
  actionText,
}: {
  number: string;
  title: string;
  description: string;
  actionLink?: string;
  actionText?: string;
}) {
  return (
    <div className="flex items-start gap-4 sm:gap-6 border-b border-border/50 pb-6 last:border-0 last:pb-0">
      <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-600/20">
        {number}
      </div>
      <div className="space-y-1.5 flex-1 text-left">
        <h4 className="font-bold text-base text-foreground leading-tight">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        {actionLink && (
          <a
            href={actionLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 pt-1.5 transition-colors"
          >
            {actionText} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function ApexHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-[0_4px_30px_-12px_rgba(37,99,235,0.45)]">
      {/* Lit bottom seam */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent"
      />
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
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
      <div className="container py-10 px-4 sm:px-6">
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
        <div className="mt-8 border-t border-border pt-6 text-xs text-muted-foreground text-center sm:text-left">
          <p>© {new Date().getFullYear()} Greekstack. The white-label Greek-life platform.</p>
        </div>
      </div>
    </footer>
  );
}
