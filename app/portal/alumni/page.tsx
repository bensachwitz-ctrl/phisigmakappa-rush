import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { getSiteConfig } from "@/lib/site-config";
import AlumniLoginPage from "./AlumniLoginPage";

export const dynamic = "force-dynamic";

export default async function AlumniPortalRootPage() {
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

  return <AlumniLoginPage />;
}
