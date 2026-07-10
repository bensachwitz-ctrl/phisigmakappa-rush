import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { chapterLiveGate } from "@/components/site/chapter-status";
import { getSiteConfig } from "@/lib/site-config";
import { Wordmark } from "@/components/brand/wordmark";
import { BidResponseForm } from "@/components/site/bid-response-form";
import { ConfettiPayoff } from "@/components/ui/confetti";
import { CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

// Single-use invite pages must never be indexed.
export const metadata: Metadata = {
  title: "Bid invitation",
  robots: { index: false, follow: false, nocache: true },
};

type LookupResult =
  | { kind: "ok"; rush: { id: string; name: string }; expiresAt: string }
  | { kind: "already-responded"; choice: string; rush: { name: string } }
  | { kind: "expired" }
  | { kind: "not-found" };

async function lookup(token: string): Promise<LookupResult> {
  if (!/^[a-f0-9]{16,64}$/i.test(token)) return { kind: "not-found" };
  try {
    const rush = await prisma.rush.findUnique({
      where: { bidToken: token },
      select: {
        id: true,
        name: true,
        bidTokenExpiresAt: true,
        bidRespondedAt: true,
        bidResponseChoice: true,
        status: true,
      },
    });
    if (!rush) return { kind: "not-found" };
    if (rush.bidRespondedAt && rush.bidResponseChoice) {
      return {
        kind: "already-responded",
        choice: rush.bidResponseChoice,
        rush: { name: rush.name },
      };
    }
    if (rush.bidTokenExpiresAt && rush.bidTokenExpiresAt < new Date()) {
      return { kind: "expired" };
    }
    return {
      kind: "ok",
      rush: { id: rush.id, name: rush.name },
      expiresAt: rush.bidTokenExpiresAt?.toISOString() || "",
    };
  } catch {
    return { kind: "not-found" };
  }
}

export default async function BidPage({ params }: { params: { token: string } }) {
  // GO-LIVE GATE — a suspended or still-pending-billing chapter must not serve its
  // bid links (same gated state app/page.tsx renders). Runs BEFORE the token
  // lookup, so no rush/PNM data leaks. Returns null (proceeds) on the apex.
  const gate = await chapterLiveGate();
  if (gate) return gate;

  const [result, cfg] = await Promise.all([
    lookup(params.token),
    getSiteConfig().catch(() => ({} as Record<string, string>)),
  ]);
  const fraternityName = cfg["chapter.fraternityName"] || "Your Chapter";
  const greekLetters = cfg["chapter.greekLetters"] || "";
  const schoolShort = cfg["chapter.schoolShort"] || "";
  const chapterAttribution = [
    [fraternityName, greekLetters].filter(Boolean).join(", "),
    schoolShort ? `at ${schoolShort}` : "",
  ].filter(Boolean).join(" ");
  const rushEmail = cfg["contact.rushEmail"] || "";

  return (
    <div className="relative min-h-screen overflow-x-clip bg-phisig-mist">
      {/* Soft, chapter-tinted ambient wash: brand-token-driven (phisig-red is
          bound to the live --brand-primary) and static (reduced-motion-safe), so
          this celebratory moment reads premium in ANY chapter's color. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[520px] overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-13rem] h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-phisig-red/12 blur-3xl" />
        <div className="absolute right-[-8rem] top-6 h-72 w-72 rounded-full bg-phisig-red/10 blur-3xl" />
      </div>

      <div className="relative container py-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Wordmark variant="compact" />
        </Link>
      </div>

      <div className="relative container max-w-xl py-8 sm:py-16">
        {result.kind === "ok" && (
          <div className="text-center">
            {/* Elevated brand seal with a soft halo: the emotional anchor for the
                bid. Gentle entrance (self-disables under prefers-reduced-motion). */}
            <div className="relative mx-auto mb-6 inline-flex">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-phisig-red/30 blur-2xl"
              />
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shadow-[0_16px_36px_-12px_hsl(var(--primary)/0.55)] ring-1 ring-white/20 motion-safe:animate-scale-in">
                <ShieldCheck className="h-7 w-7" aria-hidden="true" />
              </span>
            </div>
            <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-phisig-red">
              Bid invitation · {chapterAttribution}
            </span>
            <h1 className="mx-auto mt-3 max-w-lg text-[clamp(2rem,6vw,3.25rem)] font-bold leading-[1.05] tracking-tight [text-wrap:balance]">
              {result.rush.name}, you've been bid.
            </h1>
            {/* Brand hairline divider with a centered diamond: a restrained
                classical flourish, tinted in the chapter color. */}
            <span aria-hidden className="mx-auto mt-5 mb-1 flex w-24 items-center justify-center gap-2">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-phisig-red/40" />
              <span className="h-1.5 w-1.5 rotate-45 rounded-[1px] bg-phisig-red" />
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-phisig-red/40" />
            </span>
            <p className="mx-auto mt-4 max-w-md text-pretty leading-relaxed text-muted-foreground sm:text-lg">
              The brothers of {chapterAttribution} have voted, deliberated, and want you in this brotherhood.
              This is the official bid. Your one-click response is below.
            </p>
            <p className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Link expires {new Date(result.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>

            <div className="mt-8">
              <BidResponseForm token={params.token} pnmName={result.rush.name} rushEmail={rushEmail} />
            </div>
          </div>
        )}

        {result.kind === "already-responded" && (
          <div className="rounded-2xl border bg-card p-8 text-center">
            {result.choice === "ACCEPTED" && <ConfettiPayoff />}
            <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full mb-4 ${
              result.choice === "ACCEPTED" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-700"
            }`}>
              {result.choice === "ACCEPTED"
                ? <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                : <XCircle className="h-6 w-6" aria-hidden="true" />}
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">
              You already responded.
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Thanks {result.rush.name} — your <strong>{result.choice === "ACCEPTED" ? "acceptance" : "decline"}</strong> is on file.
              {result.choice === "ACCEPTED"
                ? " The chapter has your contact info and will be in touch with bid-night details."
                : " The chapter wishes you the best wherever you land."}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Need to change your mind? Email <a href={`mailto:${rushEmail}`} className="text-phisig-red hover:underline">{rushEmail}</a>.
            </p>
          </div>
        )}

        {result.kind === "expired" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">This bid link has expired.</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Bid links are valid for 14 days. Reach out to{" "}
              <a href={`mailto:${rushEmail}`} className="text-phisig-red hover:underline">{rushEmail}</a>{" "}
              and the rush chair can re-issue.
            </p>
          </div>
        )}

        {result.kind === "not-found" && (
          <div className="rounded-2xl border bg-card p-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Bid link not found.</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Double-check the link from your email or text. If it still doesn't work, email{" "}
              <a href={`mailto:${rushEmail}`} className="text-phisig-red hover:underline">{rushEmail}</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
