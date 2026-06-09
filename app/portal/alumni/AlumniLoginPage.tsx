"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft, Mail, Lock, LogIn, UserPlus } from "lucide-react";
import { FloatingSymbols } from "@/components/site/floating-symbols";

export default function AlumniLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password flow states
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

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

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    setForgotLoading(true);

    try {
      const res = await fetch("/api/portal/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, role: "alumni" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setForgotError(data.error || "Failed to process request. Please try again.");
      } else {
        setForgotSuccess(data.message || "A password reset link has been sent to your email.");
        setForgotEmail("");
      }
    } catch (err) {
      setForgotError("A connection error occurred. Please try again.");
    } finally {
      setForgotLoading(false);
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

          {/* Frosted, layered card — a hairline ring + soft ambient shadow lift
              it off the page for a premium, finished feel. Chapter-themed
              (maroon/amber = the white-label brand tokens), not the apex palette. */}
          <div className="relative rounded-2xl border border-maroon-100 bg-white/95 backdrop-blur-sm p-6 sm:p-8 shadow-[0_1px_0_0_rgba(255,255,255,0.7)_inset,0_18px_40px_-20px_rgba(80,0,20,0.35)] ring-1 ring-maroon-900/5 space-y-6">
            <div className="text-center">
              <div className="relative inline-flex mb-3">
                <span aria-hidden className="absolute inset-0 -z-10 rounded-xl bg-amber-400/35 blur-xl" />
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-cream-50 shadow-md ring-1 ring-amber-900/10">
                  <GraduationCap className="w-6 h-6" />
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-maroon-900">
                {showForgot ? "Forgot Password" : "Alumni Sign In"}
              </h1>
              <p className="text-xs text-maroon-600 mt-1">
                {showForgot ? "Recover your alumni portal credentials" : "Access your personalized alumni dashboard"}
              </p>
            </div>

            {showForgot ? (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-maroon-600 leading-relaxed text-center px-1">
                  Enter your registered email address and we will dispatch a secure password reset link to your inbox.
                </p>

                {forgotError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                    {forgotError}
                  </div>
                )}

                {forgotSuccess && (
                  <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs text-center font-medium">
                    {forgotSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="alumnus@example.com"
                      className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-maroon-800 hover:bg-maroon-900 text-cream-50 flex items-center justify-center gap-1.5 py-2.5 rounded-xl shadow-sm font-semibold transition"
                  >
                    {forgotLoading ? "Sending Link..." : "Send Reset Link"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowForgot(false);
                      setForgotError("");
                      setForgotSuccess("");
                    }}
                    className="w-full text-maroon-800 hover:text-maroon-900 hover:bg-cream-50 rounded-xl py-2 font-semibold text-xs transition"
                  >
                    Back to Sign In
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="brother@example.com"
                      className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900">
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
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-maroon-800 hover:bg-maroon-900 text-cream-50 flex items-center justify-center gap-1.5 py-2.5 rounded-xl shadow-sm font-semibold transition"
                >
                  {loading ? (
                    <span>Signing In...</span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>
            )}

            <div className="border-t border-maroon-100 pt-4 text-center">
              <p className="text-xs text-maroon-700 mb-2">Don&apos;t have an alumni account yet?</p>
              <Link href="/portal/alumni/register">
                <Button variant="outline" className="w-full border-maroon-200 text-maroon-900 hover:bg-cream-50 rounded-xl flex items-center justify-center gap-1">
                  <UserPlus className="w-4 h-4" />
                  Register as Alumnus
                </Button>
              </Link>
            </div>
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
