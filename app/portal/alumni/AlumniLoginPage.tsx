"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Lock, UserPlus } from "lucide-react";
import { FloatingSymbols } from "@/components/site/floating-symbols";
import { GreekstackLogo } from "@/components/brand/greekstack-logo";
import { PortalForgotOtpFlow } from "@/components/portal/forgot-password-otp";

export interface AlumniLoginPageProps {
  chapterName?: string | null;
  schoolName?: string | null;
}

export default function AlumniLoginPage({ chapterName, schoolName }: AlumniLoginPageProps = {}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password: now the inline OTP flow (email → code → new password).
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/portal/alumni/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed. Please check your credentials.");
      } else {
        router.push("/portal/alumni/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("A connection error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 text-maroon-950 flex flex-col justify-between relative overflow-hidden">
      <FloatingSymbols />
      <div>
        <PublicNav />

        <main className="max-w-md mx-auto px-4 py-12 sm:py-16">
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 text-sm text-maroon-700 hover:text-maroon-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to portals
          </Link>

          {/* Premium classical card — the ELEVATED TEMPLE seal, a Cinzel title +
              Cormorant subhead, and a hairline ring + soft ambient shadow that
              lift it off the page. Chapter-themed (the navy/gold brand ramp),
              not a plain default form. */}
          <div className="relative rounded-2xl border border-maroon-100 bg-white/95 backdrop-blur-sm p-6 sm:p-8 shadow-[0_1px_0_0_rgba(255,255,255,0.7)_inset,0_18px_40px_-20px_rgba(80,0,20,0.35)] ring-1 ring-maroon-900/5 space-y-6">
            <div className="text-center">
              {/* The classical temple seal (navy), centered, with a soft brand
                  halo + a gentle entrance (reduced-motion-safe). */}
              <div className="relative inline-flex mb-3">
                <span aria-hidden className="absolute inset-0 -z-10 rounded-2xl bg-amber-400/35 blur-xl" />
                <GreekstackLogo
                  variant="seal"
                  title="Greekstack"
                  className="h-14 w-14 rounded-2xl shadow-[0_10px_26px_-12px_rgba(11,27,58,0.6)] ring-1 ring-white/10 motion-safe:animate-scale-in"
                />
              </div>
              {/* "Greekstack" wordmark directly UNDER the seal (Cinzel, gold STACK). */}
              <p className="font-display text-base font-bold uppercase leading-none tracking-[0.16em]">
                <span className="text-maroon-900">Greek</span>
                <span className="gs-gold-text">stack</span>
              </p>
              {/* "{School} · {Chapter}". */}
              {(chapterName || schoolName) && (
                <p className="mt-2 font-serif text-sm italic text-maroon-600">
                  {[schoolName, chapterName].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            {showForgot ? (
              <PortalForgotOtpFlow
                role="alumni"
                dashboardHref="/portal/alumni/dashboard"
                onBack={() => setShowForgot(false)}
              />
            ) : (
              <>
              <div className="text-center -mt-2">
                <h1 className="font-display text-2xl font-bold uppercase tracking-[0.06em] text-maroon-900">
                  Welcome Back
                </h1>
                <p className="font-serif text-base italic text-maroon-600 mt-1.5">
                  Sign in to your personalized alumni dashboard
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div role="alert" aria-live="assertive" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="alum-email" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                    <input
                      id="alum-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="off"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-maroon-50 border border-maroon-200 rounded-xl focus:outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/30 text-sm text-maroon-900 transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="alum-password" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-[11px] font-medium text-maroon-700 hover:text-maroon-900 underline underline-offset-2"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                    <input
                      id="alum-password"
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-16 py-2.5 bg-maroon-50 border border-maroon-200 rounded-xl focus:outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/30 text-sm text-maroon-900 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      aria-pressed={showPw}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      className="absolute right-1.5 top-1/2 inline-flex h-9 min-w-[44px] -translate-y-1/2 items-center justify-center rounded-md px-2 text-[11px] font-semibold text-maroon-600 hover:bg-maroon-50 hover:text-maroon-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 transition"
                    >
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* Gold primary "ENTER" — Cinzel caps; the premium classical CTA. */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[48px] bg-gradient-to-b from-cream-300 to-brand-secondary text-maroon-950 hover:from-cream-200 hover:to-cream-300 flex items-center justify-center gap-1.5 py-3 rounded-xl shadow-[0_8px_22px_-8px_rgba(168,120,15,0.6),inset_0_1px_0_0_rgba(255,255,255,0.5)] font-display font-bold uppercase tracking-[0.14em] transition"
                >
                  {loading ? <span>Signing In…</span> : <span>Enter</span>}
                </Button>
              </form>

              <div className="border-t border-maroon-100 pt-4 text-center">
                <p className="text-xs text-maroon-700 mb-2">Don&apos;t have an alumni account yet?</p>
                <Link href="/portal/alumni/register">
                  <Button variant="outline" className="w-full border-maroon-200 text-maroon-900 hover:bg-cream-50 rounded-xl flex items-center justify-center gap-1">
                    <UserPlus className="w-4 h-4" />
                    Register as Alumnus
                  </Button>
                </Link>
              </div>
              </>
            )}
          </div>

          {/* Cohesion with the apex sign-in entry: let a member who landed on the
              wrong chapter hop back to the school/chapter chooser. */}
          <p className="mt-5 text-center text-xs text-maroon-600">
            Not your chapter?{" "}
            <Link href="/login" className="font-medium text-maroon-800 underline-offset-2 hover:underline">
              Choose a different chapter
            </Link>
          </p>
        </main>
      </div>

      <PublicFooter />
    </div>
  );
}
