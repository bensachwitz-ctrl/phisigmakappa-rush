import { redirect } from "next/navigation";
import { requireRole } from "@/lib/portal-auth";
import { ChapterChat } from "@/components/chat/chapter-chat";
import { PublicFooter } from "@/components/site/footer";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chapter Chat",
  description: "Real-time messaging for your chapter.",
};

/**
 * Members' chapter chat (brothers portal). Standalone page — the portal has no
 * shared layout shell, so we render our own branded background + footer and a
 * back link to the dashboard.
 *
 * Auth: requireRole("brother") accepts a valid brother portal session OR an
 * admin override; anything else redirects to the portal login. The Stream
 * connection + tenant-scoping is handled client-side by <ChapterChat>, which is
 * SSR-safe (ssr:false dynamic import) and renders a disabled empty-state when
 * Stream isn't configured — this page never crashes.
 */
export default function BrothersChatPage() {
  const sess = requireRole("brother");
  if (!sess) {
    redirect("/portal/brothers");
  }

  return (
    <div className="flex min-h-screen flex-col bg-phisig-mist">
      <main className="flex-1 px-4 py-8 sm:py-12">
        <ChapterChat
          surface="member"
          backHref="/portal/brothers/dashboard"
          backLabel="Back to dashboard"
        />
      </main>
      <PublicFooter />
    </div>
  );
}
