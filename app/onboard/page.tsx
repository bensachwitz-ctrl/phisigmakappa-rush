import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSubdomain } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
import { AnimatedBackground } from "@/components/ui/animated-background";

import OnboardWizard from "./onboard-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardPage() {
  let host = "";
  try {
    host = headers().get("host") || "";
  } catch {}

  const subdomain = getSubdomain(host);

  if (subdomain) {
    const cfg = await getSiteConfig();
    if (cfg["chapter.onboarded"] === "true") {
      redirect("/");
    }
  }

  return (
    <AnimatedBackground
      variant="aurora-grid"
      tone="platform"
      className="min-h-screen bg-slate-950 text-slate-100"
    >
      {/* Drifting Greek letters rendered globally by app/layout.tsx. */}
      <main className="relative z-[2] flex min-h-screen flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <OnboardWizard />
        </div>
      </main>
    </AnimatedBackground>
  );
}
