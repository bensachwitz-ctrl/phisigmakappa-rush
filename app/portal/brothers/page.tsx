import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { chapterLiveGate } from "@/components/site/chapter-status";
import { getSiteConfig } from "@/lib/site-config";
import { getChapterIdentity } from "@/lib/chapter-identity";
import BrothersLoginPage from "./BrothersLoginPage";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brothers Portal Sign In",
  description: "Sign in to the active brother portal.",
};

export default async function BrothersPortalRootPage() {
  // GO-LIVE GATE — the public brothers login must not render a suspended or
  // still-pending-billing chapter's identity (the "{School} · {Chapter}" lockup).
  // Runs before any chapter config/identity is read. Mirrors app/alumni/join/page.tsx.
  const gate = await chapterLiveGate();
  if (gate) return gate;

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  if (cfg["chapter.onboarded"] !== "true") {
    redirect("/onboard");
  }

  let sess: ReturnType<typeof getPortalSession> = null;
  try {
    sess = getPortalSession();
  } catch {
    sess = null;
  }

  if (sess && sess.role === "brother") {
    redirect("/portal/brothers/dashboard");
  }

  // Identity for the centered lockup subline ("{School} · {Chapter}").
  const identity = await getChapterIdentity().catch(() => null);

  return (
    <BrothersLoginPage
      chapterName={identity?.chapterAttribution || null}
      schoolName={identity?.schoolName || null}
    />
  );
}
