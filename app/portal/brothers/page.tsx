import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { getSiteConfig } from "@/lib/site-config";
import BrothersLoginPage from "./BrothersLoginPage";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brothers Portal Sign In",
  description: "Sign in to the active brother portal.",
};

export default async function BrothersPortalRootPage() {
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

  return <BrothersLoginPage />;
}
