"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Wordmark } from "@/components/brand/wordmark";
import { Loader2, Lock, ArrowLeft, User } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { push } = useToast();
  const [name, setName] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("phisig_brother_name") : null;
    if (stored) setName(stored);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, password: pw }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        push({ title: j.error || "Login failed", variant: "destructive" });
        return;
      }
      try { localStorage.setItem("phisig_brother_name", name); } catch {}
      const from = params.get("from") || "/admin";
      router.push(from);
      router.refresh();
    } catch {
      push({ title: "Login failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-phisig-mist flex flex-col">
      <div className="container py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to public site
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Wordmark className="justify-center" />
            <h1 className="mt-6 text-2xl font-semibold tracking-tight">
              Brothers Sign In
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Active members only. Use the chapter password.
            </p>
          </div>
          <Card>
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="name" className="mb-1.5 inline-block">Your name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name" autoFocus autoComplete="name"
                      value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="James Carter" className="pl-9" required
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Used to track your votes and notes.
                  </p>
                </div>
                <div>
                  <Label htmlFor="pw" className="mb-1.5 inline-block">Chapter password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="pw" type="password" autoComplete="current-password"
                      value={pw} onChange={(e) => setPw(e.target.value)}
                      className="pl-9" placeholder="••••••••" required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={busy} size="lg" className="w-full">
                  {busy ? (<><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>) : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Forgot the password? Ask the rush chair.
          </p>
        </div>
      </div>
    </main>
  );
}
