import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
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
    <main id="main-content" className="min-h-screen bg-phisig-mist">
      <div className="container py-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Wordmark variant="compact" />
        </Link>
      </div>

      <div className="container max-w-xl py-8 sm:py-16">
        {result.kind === "ok" && (
          <div className="text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-phisig-red text-white shadow-lg shadow-phisig-red/30 mb-5">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="block text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
              Bid invitation · {chapterAttribution}
            </span>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">
              {result.rush.name}, you've been bid.
            </h1>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              The brothers of {chapterAttribution} have voted, deliberated, and want you in this brotherhood.
              This is the official bid — your one-click response below.
            </p>
            <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1.5">
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
    </main>
  );
}
