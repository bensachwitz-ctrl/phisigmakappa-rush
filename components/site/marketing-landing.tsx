"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GreekstackLogo } from "@/components/brand/greekstack-logo";
import {
  Sparkles, Shield, Users, CreditCard, Calendar, BarChart3,
  Flame, CheckCircle2, ArrowRight, Zap, GraduationCap, Building2,
} from "lucide-react";

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white overflow-hidden relative selection:bg-maroon-700 selection:text-white">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-maroon-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-red-900/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[600px] h-[600px] bg-maroon-950/15 rounded-full blur-[130px] pointer-events-none" />

      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0B0B0C]/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GreekstackLogo className="h-8 w-8 text-red-500" />
            <span className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
              Greekstack
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="#features" className="text-sm text-white/70 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-white/70 hover:text-white transition-colors">
              Pricing
            </Link>
            <Button asChild variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/5 border border-white/10">
              <Link href="/onboard">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container pt-20 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-400 mb-6 shadow-lg backdrop-blur-sm animate-pulse-slow">
          <Sparkles className="h-3.5 w-3.5" /> Next-Gen Greek Life Operations
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.05] bg-gradient-to-b from-white via-white to-white/70 bg-clip-text text-transparent">
          The flawless white-label SaaS built for Greek chapters.
        </h1>
        <p className="mt-6 text-base sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
          Greekstack coordinates recruitment pipelines, automated dues collection, anti-hazing reporting, and officer management on a single multitenant operating footprint. Set up in 60 seconds.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="bg-red-600 hover:bg-red-700 text-white border border-red-500 shadow-lg shadow-red-900/20 font-semibold px-8">
            <Link href="/onboard" className="flex items-center gap-2">
              Launch Your Chapter <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold px-8">
            <Link href="#features">Explore Modules</Link>
          </Button>
        </div>
      </section>

      {/* Dashboard Preview Widget */}
      <section className="container pb-20 relative z-10">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-md shadow-2xl max-w-5xl mx-auto">
          <div className="rounded-xl border border-white/10 bg-[#0B0B0C] overflow-hidden aspect-[16/9] relative flex flex-col">
            <div className="h-10 border-b border-white/10 bg-white/[0.02] flex items-center px-4 justify-between shrink-0">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-white/10" />
                <span className="w-3 h-3 rounded-full bg-white/10" />
                <span className="w-3 h-3 rounded-full bg-white/10" />
              </div>
              <span className="text-[10px] text-white/40 font-mono tracking-wider">demo.greekstack.com/admin</span>
              <span className="w-12" />
            </div>
            <div className="flex-1 p-6 grid grid-cols-[200px_1fr] gap-6 text-left">
              <div className="space-y-2 border-r border-white/5 pr-4">
                <span className="block text-[10px] font-bold tracking-widest text-white/30 uppercase mb-4">GREEKSTACK APPS</span>
                <span className="flex items-center gap-2 text-xs font-semibold bg-white/5 text-white px-3 py-2 rounded-lg"><Users className="h-3.5 w-3.5 text-red-500" /> Rush Pipeline</span>
                <span className="flex items-center gap-2 text-xs text-white/50 px-3 py-2 rounded-lg"><CreditCard className="h-3.5 w-3.5" /> Dues &amp; Billing</span>
                <span className="flex items-center gap-2 text-xs text-white/50 px-3 py-2 rounded-lg"><Calendar className="h-3.5 w-3.5" /> Events &amp; Attendance</span>
                <span className="flex items-center gap-2 text-xs text-white/50 px-3 py-2 rounded-lg"><Shield className="h-3.5 w-3.5" /> Risk Management</span>
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold">Fall Recruitment Funnel</h3>
                    <p className="text-xs text-white/40">Real-time rushee pipeline status and activity logs.</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400 border border-green-500/20">
                    Active Cycle
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                    <span className="text-[10px] text-white/40 block">TOTAL PNMS</span>
                    <span className="text-2xl font-bold mt-1 block">184</span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                    <span className="text-[10px] text-white/40 block">ACTIVE RUSHEES</span>
                    <span className="text-2xl font-bold mt-1 block">62</span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                    <span className="text-[10px] text-white/40 block">BIDS EXTENDED</span>
                    <span className="text-2xl font-bold mt-1 block">28</span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                    <span className="text-[10px] text-white/40 block">Dues Collections</span>
                    <span className="text-2xl font-bold mt-1 block text-green-400">$18.4k</span>
                  </div>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center font-bold text-red-500 text-sm">JC</div>
                    <div>
                      <p className="text-xs font-semibold">James Carter</p>
                      <p className="text-[10px] text-white/40">Status: Bid Accepted · SOPHOMORE · FINANCE</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-white/30">Just Now</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container py-24 border-t border-white/10 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Four Powerful Modules. One Shared Footprint.</h2>
          <p className="mt-4 text-white/60">Every feature is dynamically optimized to support your local chapter branding and school regulations.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <FeatureCard
            icon={Users}
            title="Recruitment Pipeline"
            desc="PNM check-in via QR, double opt-in TCPA-compliant SMS notifications, and anonymous voting dashboard for brothers."
          />
          <FeatureCard
            icon={CreditCard}
            title="Stripe Connect Splits"
            desc="Connected accounts for treasurers. Platform takes a tiny split (1.5% cut) on top of merchant processing to keep bank settlements simple and automatic."
          />
          <FeatureCard
            icon={Shield}
            title="Risk Management &amp; Hazing Portal"
            desc="Zero-tolerance anti-hazing reporting form, anonymous incident intake log, and mandatory officer review acknowledgments."
          />
          <FeatureCard
            icon={Calendar}
            title="Chapter Management"
            desc="Sunday meeting roster check-in, chore rotation wheels, scholarship hour logging, and local Google Calendar event syncing."
          />
        </div>
      </section>

      {/* Monetization / Pricing */}
      <section id="pricing" className="container py-24 border-t border-white/10 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Clear, Flexible Billing Tiers</h2>
          <p className="mt-4 text-white/60">Choose the integration model that aligns with your chapter budget.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Flat SaaS Tier */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-8 flex flex-col justify-between backdrop-blur-sm">
            <div>
              <span className="inline-block px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-semibold tracking-wider uppercase text-white/80">Flat Subscription</span>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-bold">$79</span>
                <span className="text-white/40 text-sm">/ month</span>
              </div>
              <p className="mt-4 text-sm text-white/50 leading-relaxed">
                Paid annually or monthly. Perfect for established chapters who handle high-volume member dues and prefer static pricing.
              </p>
              <ul className="mt-6 space-y-3 text-xs text-white/70">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-red-500" /> Fully white-labeled chapter site</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-red-500" /> Full admin suite &amp; dashboards</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-red-500" /> Resend email &amp; Twilio integration</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-red-500" /> Unlimited PNM signups &amp; voting</li>
              </ul>
            </div>
            <Button asChild className="mt-8 bg-white text-black hover:bg-white/90">
              <Link href="/onboard">Launch SaaS Instance</Link>
            </Button>
          </div>

          {/* Dues split Tier */}
          <div className="rounded-2xl border border-red-500/30 bg-red-950/5 p-8 flex flex-col justify-between backdrop-blur-sm relative">
            <div className="absolute -top-3 right-6 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 border border-red-500">
              Most Popular
            </div>
            <div>
              <span className="inline-block px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-xs font-semibold tracking-wider uppercase text-red-400">Transactional Split</span>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-bold">1.5%</span>
                <span className="text-white/40 text-sm">/ dues transaction</span>
              </div>
              <p className="mt-4 text-sm text-white/50 leading-relaxed">
                Zero setup cost or monthly operational fees. Platform takes a minor percentage split on card dues processed via Stripe Connect Express.
              </p>
              <ul className="mt-6 space-y-3 text-xs text-white/70">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-red-400" /> Zero upfront cost for the chapter</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-red-400" /> Direct Stripe Connect treasurer routing</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-red-400" /> Automatic dues ledger reconciliation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-red-400" /> All premium operations modules included</li>
              </ul>
            </div>
            <Button asChild className="mt-8 bg-red-600 text-white hover:bg-red-700 border border-red-500">
              <Link href="/onboard">Launch Connected Instance</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 bg-[#0B0B0C]">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <p>© {new Date().getFullYear()} Greekstack. All rights reserved.</p>
          <p>Instantly generated fraternity subdomains are secure and isolated.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon, title, desc,
}: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 hover:bg-white/[0.02] hover:border-white/10 transition-all text-left">
      <div className="h-10 w-10 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-xs text-white/50 leading-relaxed">{desc}</p>
    </div>
  );
}
