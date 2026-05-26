"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft, Mail, Lock, LogIn, UserPlus } from "lucide-react";

export default function AlumniLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-cream-50 text-maroon-950 flex flex-col justify-between">
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

          <div className="bg-white rounded-2xl border border-maroon-100 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-cream-50 mb-3 shadow-sm">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-maroon-900">Alumni Sign In</h1>
              <p className="text-xs text-maroon-600 mt-1">
                Access your personalized alumni dashboard
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                  Password
                </label>
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
        </main>
      </div>

      <PublicFooter />
    </div>
  );
}
