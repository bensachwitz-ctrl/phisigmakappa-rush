import type { Metadata } from "next";
import { OnboardingForm } from "@/components/site/onboarding-form";
import { Wordmark } from "@/components/brand/wordmark";
import { getChapterIdentity } from "@/lib/chapter-identity";
import { loadInvite } from "@/lib/brother-invite";
import Link from "next/link";

export const dynamic = "force-dynamic";

// One-time invite pages must never be indexed — each token URL is unique to one
// brother and shouldn't be in any search engine's database.
export async function generateMetadata(): Promise<Metadata> {
  const identity = await getChapterIdentity();
  return {
    title: `Welcome to ${identity.greekLetters || identity.fraternityName}`,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function OnboardPage({ params }: { params: { token: string } }) {
  const identity = await getChapterIdentity();

  // Resolve the invite directly against the DB (no fragile self-fetch to our
  // own API). The previous code read process.env.SITE_URL — which is never set
  // (the runbook documents NEXT_PUBLIC_SITE_URL) — so base was "" and EVERY
  // token URL rendered the profile form regardless of validity.
  let data: { ok: boolean; reason: string; invite: any };
  try {
    const { invite, reason } = await loadInvite(params.token);
    data = { ok: reason === "ok", reason, invite };
  } catch {
    data = { ok: false, reason: "fetch-failed", invite: null };
  }

  return (
    <main className="min-h-screen bg-phisig-mist">
      <div className="container py-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Wordmark variant="compact" />
        </Link>
      </div>

      <div className="container max-w-2xl py-8 sm:py-12">
        {!data.ok ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">This invite isn&apos;t usable.</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.reason === "completed" && "Looks like this profile was already completed. Sign in at /admin/login."}
              {data.reason === "expired" && "This invite link expired. Ask the rush chair to send a new one."}
              {data.reason === "revoked" && "This invite was revoked. Reach out to the e-board."}
              {data.reason === "not-found" && "We couldn't find this invite. Double-check the link from your email or text."}
              {data.reason === "fetch-failed" && "We couldn't reach the server. Refresh and try again."}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
                Brother onboarding
              </span>
              <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">
                Welcome to {identity.greekLetters || identity.fraternityName}.
              </h1>
              <p className="mt-2 text-muted-foreground">
                {data.invite?.invitedBy
                  ? `${data.invite.invitedBy} added you to the chapter directory.`
                  : "Finish your brother profile so the chapter has your info on file."}{" "}
                Takes 60 seconds.
              </p>
            </div>
            <OnboardingForm
              token={params.token}
              prefill={{
                name: data.invite?.prefillName || "",
                email: data.invite?.email || "",
                phone: data.invite?.phone || "",
              }}
            />
          </>
        )}
      </div>
    </main>
  );
}
