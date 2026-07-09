// /alumni/onboard/[token] — alum invite redemption.
//
// SERVER SHELL: this thin server component exists solely to run the GO-LIVE GATE
// before the interactive onboarding form (the "use client" component in
// onboard-client.tsx) renders. A suspended or still-pending-billing chapter must
// not serve its alumni onboarding funnel — the gate renders the same neutral
// launching-soon / inactive page every other public chapter surface does, so a
// not-yet-live chapter never leaks its identity here. When the chapter IS live
// (or on the apex, where the client validates the token and 404s a bad one), the
// gate returns null and we render the client form. The single-use token is read
// client-side via useParams, so no props are threaded through.

import { chapterLiveGate } from "@/components/site/chapter-status";
import AlumniOnboardClient from "./onboard-client";

export const dynamic = "force-dynamic";

export default async function AlumniOnboardPage() {
  const gate = await chapterLiveGate();
  if (gate) return gate;

  return <AlumniOnboardClient />;
}
