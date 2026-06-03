import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSubdomain } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
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
    <main className="min-h-screen bg-cream-50 text-maroon-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,16,46,0.08),transparent_50%)] z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(253,251,247,0.8),transparent_80%)] z-0 pointer-events-none" />
      
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-3xl">
        <OnboardWizard />
      </div>
    </main>
  );
}
