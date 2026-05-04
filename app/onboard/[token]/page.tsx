import { OnboardingForm } from "@/components/site/onboarding-form";
import { Wordmark } from "@/components/brand/wordmark";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function fetchInvite(token: string, base: string) {
  try {
    const res = await fetch(`${base}/api/onboard/${token}`, { cache: "no-store" });
    return await res.json();
  } catch {
    return { ok: false, reason: "fetch-failed" };
  }
}

export default async function OnboardPage({ params }: { params: { token: string } }) {
  const base = process.env.SITE_URL || "";
  const data = base ? await fetchInvite(params.token, base) : null;

  return (
    <main className="min-h-screen bg-phisig-mist">
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
                Brother onboarding
              </span>
              <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">
                Welcome to Gamma Triton.
              </h1>
              <p className="mt-2 text-muted-foreground">
                {data?.invite?.invitedBy
                  ? `${data.invite.invitedBy} added you to the chapter directory.`
                  : "Finish your brother profile so the chapter has your info on file."}{" "}
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
    </main>
  );
}
