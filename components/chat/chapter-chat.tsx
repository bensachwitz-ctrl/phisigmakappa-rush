"use client";

// components/chat/chapter-chat.tsx
//
// SSR-safe entrypoint for the chapter chat. The real surface
// (chapter-chat-client.tsx) imports stream-chat / stream-chat-react, which touch
// browser-only globals (WebSocket, window) and must never execute during the
// server render. We load it with next/dynamic + { ssr: false } so:
//   • it is excluded from the server bundle entirely (no SSR, no hydration of
//     Stream internals),
//   • the heavy Stream chunk is code-split out of the initial page payload.
//
// Both the officers' page (app/admin/chat) and the members' page
// (app/portal/brothers/chat) render THIS component — a single shared surface.

import dynamic from "next/dynamic";
import { MessageSquare } from "lucide-react";

const ChapterChatClient = dynamic(() => import("./chapter-chat-client"), {
  ssr: false,
  loading: () => <ChatSkeleton />,
});

export function ChapterChat({
  surface = "member",
  backHref,
  backLabel,
}: {
  surface?: "admin" | "member";
  /** Optional "← back" link shown above the chat (used by the standalone portal page). */
  backHref?: string;
  backLabel?: string;
}) {
  return <ChapterChatClient surface={surface} backHref={backHref} backLabel={backLabel} />;
}

/**
 * Lightweight placeholder shown while the Stream chunk loads (and during the
 * server render, since the client is ssr:false). Deliberately brand-quiet and
 * crash-proof — it imports nothing from Stream.
 */
function ChatSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-5">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--brand-primary)" }}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Chapter chat
        </span>
        <div className="mt-2 h-8 w-48 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
          Loading chat…
        </div>
      </div>
    </div>
  );
}

export default ChapterChat;
