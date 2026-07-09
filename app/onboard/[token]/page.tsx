import type { Metadata } from "next";
import { OnboardingForm } from "@/components/site/onboarding-form";
import { Wordmark } from "@/components/brand/wordmark";
import { chapterLiveGate } from "@/components/site/chapter-status";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import Link from "next/link";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// One-time invite pages must never be indexed — each token URL is unique
// to one member and shouldn't be in any search engine's database. Title is
// generated from the chapter's own identity (greek letters) so a white-label
// deploy never shows another chapter's name. Reads cfg (force-dynamic).
export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const { greekLetters } = chapterIdentityFromCfg(cfg);
  return {
    title: `Welcome to ${greekLetters}`,
    robots: { index: false, follow: false, nocache: true },
  };
}

async function fetchInvite(token: string, base: string) {
  try {
    const res = await fetch(`${base}/api/onboard/${token}`, { cache: "no-store" });
    return await res.json();
  } catch {
    return { ok: false, reason: "fetch-failed" };
  }
}

export default async function OnboardPage({ params }: { params: { token: string } }) {
  // GO-LIVE GATE — a suspended or still-pending-billing chapter must not serve its
  // member-invite redemption funnel; render the shared neutral launching-soon /
  // inactive state instead of leaking the chapter's identity (greekLetters in the
  // heading + generateMetadata title). Runs before any chapter config is read.
  // Mirrors app/alumni/join/page.tsx and the alumni-onboard server shell.
  const gate = await chapterLiveGate();
  if (gate) return gate;

  let base = "";
  try {
    const host = headers().get("host") || "";
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    base = `${protocol}://${host}`;
  } catch {
    base = process.env.SITE_URL || "";
  }
  const data = base ? await fetchInvite(params.token, base) : null;
  // Chapter identity for the white-label heading/copy — falls back to the
  // reference values, so a fresh deploy renders correctly before /admin/setup.
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const { greekLetters } = chapterIdentityFromCfg(cfg);

  return (
    <div className="min-h-screen bg-phisig-mist">
      <div className="container py-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Wordmark variant="compact" />
        </Link>
      </div>

      <div className="container max-w-2xl py-8 sm:py-12">
        {data && !data.ok ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">This invite isn't usable.</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.reason === "completed" && "Looks like this profile was already completed. Sign in at /admin/login."}
              {data.reason === "expired" && "This invite link expired. Ask the rush chair to send a new one."}
              {data.reason === "revoked" && "This invite was revoked. Reach out to the e-board."}
              {data.reason === "not-found" && "We couldn't find this invite. Double-check the link from your email or text."}
              {data.reason === "fetch-failed" && "Server hiccup. Refresh and try again."}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
                Member onboarding
              </span>
              <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">
                Welcome to {greekLetters}.
              </h1>
              <p className="mt-2 text-muted-foreground">
                {data?.invite?.invitedBy
                  ? `${data.invite.invitedBy} added you to the chapter directory.`
                  : "Finish your member profile so the chapter has your info on file."}{" "}
                Takes 60 seconds.
              </p>
            </div>
            <OnboardingForm
              token={params.token}
              prefill={{
                name: data?.invite?.prefillName || "",
                email: data?.invite?.email || "",
                phone: data?.invite?.phone || "",
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
