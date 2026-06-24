"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PublicNav } from "@/components/site/nav";
// "use client" page → use the client-safe footer. The async server
// <PublicFooter/> throws "Not implemented." at request time inside a client
// tree, which silently broke (omitted) the footer on this screen.
import { PublicFooterClient } from "@/components/site/footer-client";
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { FloatingSymbols } from "@/components/site/floating-symbols";

// NOTE: force-dynamic route config lives in the sibling server-component
// layout.tsx — `export const dynamic` is ignored inside a "use client" file.

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  // Two reset modes share this screen:
  //  • "link" — legacy magic-LINK reset (?token=...), POSTs to /reset-password.
  //  • "otp"  — PHASE-3: the member already verified an emailed CODE and holds a
  //    mustReset session (?step=new, no token); POSTs to /reset/complete, which
  //    is authenticated by that session cookie (no token in the URL).
  const isOtp = !token && searchParams.get("step") === "new";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token && !isOtp) {
      setError("No reset token provided. Please request a new password reset link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = isOtp
        ? await fetch("/api/portal/reset/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password, confirm: confirmPassword }),
          })
        : await fetch("/api/portal/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password }),
          });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password. The link may have expired.");
      } else {
        setSuccess(true);
        // OTP path: the session is now a normal (non-mustReset) session, so send
        // the member straight into the app after a beat.
        if (isOtp && data.role) {
          const dest =
            data.role === "alumni"
              ? "/portal/alumni/dashboard"
              : "/portal/brothers/dashboard";
          setTimeout(() => {
            router.push(dest);
            router.refresh();
          }, 1200);
        }
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

          <div className="relative rounded-2xl border border-maroon-100 bg-white/95 backdrop-blur-sm p-6 sm:p-8 shadow-[0_1px_0_0_rgba(255,255,255,0.7)_inset,0_18px_40px_-20px_rgba(80,0,20,0.35)] ring-1 ring-maroon-900/5 space-y-6">
            <div className="text-center">
              <div className="relative inline-flex mb-3">
                <span aria-hidden className="absolute inset-0 -z-10 rounded-xl bg-maroon-400/30 blur-xl" />
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-maroon-650 to-maroon-900 text-cream-50 shadow-md ring-1 ring-maroon-900/10">
                  <Lock className="w-6 h-6" />
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-maroon-900">Set New Password</h1>
              <p className="text-xs text-maroon-600 mt-1">
                Choose a strong password to secure your portal access
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <span className="font-semibold">Password updated successfully!</span>
                </div>
                <p className="text-xs text-maroon-600">
                  Your new password is now active. You can sign in to your portal below.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Link href="/portal/brothers" className="w-full">
                    <Button className="w-full bg-maroon-800 hover:bg-maroon-900 text-cream-50 rounded-xl py-2.5 font-semibold text-xs">
                      Brothers Portal
                    </Button>
                  </Link>
                  <Link href="/portal/alumni" className="w-full">
                    <Button variant="outline" className="w-full border-maroon-200 text-maroon-950 hover:bg-cream-50 rounded-xl py-2.5 font-semibold text-xs">
                      Alumni Portal
                    </Button>
                  </Link>
                </div>
              </div>
            ) : !token && !isOtp ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Missing reset token</span>
                  This URL is invalid because it lacks a token parameter. Please check the reset email link or request a new reset request.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-sm text-maroon-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-sm text-maroon-900"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-maroon-800 hover:bg-maroon-900 text-cream-50 flex items-center justify-center gap-1.5 py-2.5 rounded-xl shadow-sm font-semibold transition"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Save New Password</span>
                  )}
                </Button>
              </form>
            )}
          </div>
        </main>
      </div>

      <PublicFooterClient />
    </div>
  );
}
