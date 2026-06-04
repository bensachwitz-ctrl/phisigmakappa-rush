import { redirect } from "next/navigation";
import { requireRole } from "@/lib/portal-auth";
import { ChapterChat } from "@/components/chat/chapter-chat";
import { PublicFooter } from "@/components/site/footer";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alumni Chat",
  description: "Real-time messaging for your chapter's alumni network.",
};

/**
 * Alumni chat page (alumni portal). Twin of app/portal/brothers/chat/page.tsx —
 * standalone branded shell (the portal has no shared layout) with a back link to
 * the alumni dashboard.
 *
 * Auth: requireRole("alumni") accepts a valid alumni portal session OR an admin
 * override; anything else redirects to the alumni portal login.
 *
 * Channel scope (flagged for the orchestrator): <ChapterChat> connects via
 * /api/chat/token + lib/stream, which today expose exactly ONE channel per
 * tenant (`chapter-<subdomain>`) with no topic/suffix support — so alumni share
 * the main chapter channel with actives/officers rather than getting a dedicated
 * "alumni-network" channel. Giving alumni their own space needs the token route +
 * lib/stream to accept a channel topic; both are out of scope for this task and
 * owned elsewhere. NOTE: /api/chat/token also authorizes via getCurrentBrother(),
 * which resolves admin + brother-portal sessions but NOT alumni-portal sessions —
 * so a pure-alumni session will currently receive 401 and see the inert "Sign in
 * to chat" empty-state. The page itself is correct and crash-proof; enabling live
 * alumni chat requires the token route to also accept an alumni portal session
 * (and, for a separate space, a channel-topic param). Inert-without-Stream-keys
 * behavior is fully preserved either way — this page never throws.
 */
export default function AlumniChatPage() {
  const sess = requireRole("alumni");
  if (!sess) {
    redirect("/portal/alumni");
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream-50">
      <main className="flex-1 px-4 py-8 sm:py-12">
        <ChapterChat
          surface="member"
          backHref="/portal/alumni/dashboard"
          backLabel="Back to dashboard"
        />
      </main>
      <PublicFooter />
    </div>
  );
}
