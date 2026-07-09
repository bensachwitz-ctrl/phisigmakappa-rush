import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { chapterLiveGate } from "@/components/site/chapter-status";
import { getSiteConfig } from "@/lib/site-config";
import { getChapterIdentity } from "@/lib/chapter-identity";
import AlumniLoginPage from "./AlumniLoginPage";

export const dynamic = "force-dynamic";

export default async function AlumniPortalRootPage() {
  // GO-LIVE GATE — the public alumni login must not render a suspended or
  // still-pending-billing chapter's identity (the "{School} · {Chapter}" lockup).
  // Runs before any chapter config/identity is read. Mirrors app/alumni/join/page.tsx.
  const gate = await chapterLiveGate();
  if (gate) return gate;

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  if (cfg["chapter.onboarded"] !== "true") {
    redirect("/onboard");
  }

  // Never let a malformed/expired cookie crash the login page (the page a
  // logged-out alumnus must always be able to reach). getPortalSession reads
  // the cookie; if anything throws, fall through to the login form.
  let sess: ReturnType<typeof getPortalSession> = null;
  try {
    sess = getPortalSession();
  } catch {
    sess = null;
  }

  if (sess && sess.role === "alumni") {
    redirect("/portal/alumni/dashboard");
  }

  const identity = await getChapterIdentity().catch(() => null);

  return (
    <AlumniLoginPage
      chapterName={identity?.chapterAttribution || null}
      schoolName={identity?.schoolName || null}
    />
  );
}
