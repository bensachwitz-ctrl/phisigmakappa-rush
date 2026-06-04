"use client";

// components/chat/chapter-chat-client.tsx
//
// The actual GetStream-powered chat surface. This module pulls in the heavy
// stream-chat / stream-chat-react runtime + its CSS, so it is ALWAYS loaded via
// a dynamic import with { ssr: false } (see chapter-chat.tsx). Never import it
// directly into a server component.
//
// API note: this targets stream-chat-react@14, where the message input is the
// `MessageComposer` component (the old `MessageInput` / `MessageInputFlat`
// components and the `DefaultStreamChatGenerics` type were removed in v14). Per
// the v14 docs, `MessageComposer` is rendered explicitly inside `Window` — the
// `Channel` component does NOT inject it automatically.
//
// Behavior contract (the brief):
//   • Fetches /api/chat/token. If Stream is unconfigured the route returns 503
//     { configured:false } and we render a tasteful disabled empty-state — we do
//     NOT throw or crash.
//   • If NEXT_PUBLIC_STREAM_API_KEY is absent we don't even bother fetching; the
//     client SDK can't connect without the public key, so we short-circuit to the
//     same empty-state.
//   • On success: connect the user, watch the tenant channel, render the full
//     Chat → Channel → (MessageList + MessageComposer) + Thread surface.
//   • Branded with the chapter color via the --brand-primary CSS var, mapped onto
//     Stream's theming custom properties so message bubbles / send button / focus
//     rings pick up the chapter's color instead of Stream's default blue.

import { useEffect, useRef, useState } from "react";
import { StreamChat, type Channel as StreamChannel } from "stream-chat";
import {
  Chat,
  Channel,
  Window,
  ChannelHeader,
  MessageList,
  MessageComposer,
  Thread,
} from "stream-chat-react";

import "stream-chat-react/dist/css/index.css";
import "./chapter-chat.css";

import { MessageSquare, Loader2, WifiOff, ArrowLeft } from "lucide-react";
import { useChapterIdentity } from "@/components/brand/chapter-identity-context";

type TokenResponse = {
  configured: boolean;
  apiKey?: string;
  token?: string;
  userId?: string;
  channelId?: string;
  channelType?: string;
  channelName?: string;
  user?: { id: string; name?: string; image?: string };
  error?: string;
};

type Phase =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "unauthed" }
  | { status: "error"; message: string }
  | { status: "ready"; client: StreamChat; channel: StreamChannel };

/**
 * Shared chat surface used by BOTH the officers' /admin/chat page and the
 * members' /portal/brothers/chat page. `surface` only tweaks the surrounding
 * chrome copy; the chat itself is the same tenant channel for everyone.
 */
export default function ChapterChatClient({
  surface = "member",
  backHref,
  backLabel,
}: {
  surface?: "admin" | "member";
  backHref?: string;
  backLabel?: string;
}) {
  const identity = useChapterIdentity();
  const collective = identity?.terms?.collective || "Chapter";

  const [phase, setPhase] = useState<Phase>({ status: "loading" });
  // Hold the connected client in a ref so the cleanup effect can disconnect it
  // even if a re-render swaps `phase`. Prevents a dangling websocket on unmount.
  const clientRef = useRef<StreamChat | null>(null);

  // The public key is the cheap pre-check: without it the SDK cannot connect, so
  // there's no point attempting the token fetch — go straight to the inert state.
  const publicKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      if (!publicKey) {
        setPhase({ status: "unconfigured" });
        return;
      }

      let data: TokenResponse;
      try {
        const res = await fetch("/api/chat/token", {
          method: "GET",
          headers: { accept: "application/json" },
          cache: "no-store",
        });

        // 503 → Stream unconfigured server-side. Inert empty-state.
        if (res.status === 503) {
          if (!cancelled) setPhase({ status: "unconfigured" });
          return;
        }
        // 401 → signed-out / not a member. Surface a gentle prompt rather than
        // an error (the user is likely just not signed in to this surface).
        if (res.status === 401) {
          if (!cancelled) setPhase({ status: "unauthed" });
          return;
        }
        if (!res.ok) {
          if (!cancelled)
            setPhase({ status: "error", message: `Chat is unavailable (${res.status}).` });
          return;
        }
        data = (await res.json()) as TokenResponse;
      } catch {
        if (!cancelled)
          setPhase({ status: "error", message: "Could not reach the chat service." });
        return;
      }

      if (!data.configured) {
        if (!cancelled) setPhase({ status: "unconfigured" });
        return;
      }
      if (!data.apiKey || !data.token || !data.userId || !data.channelId) {
        if (!cancelled)
          setPhase({ status: "error", message: "Chat returned an incomplete session." });
        return;
      }

      try {
        const client = StreamChat.getInstance(data.apiKey);
        // Guard against React 18 StrictMode double-invoke / fast remounts:
        // if a different user is connected, disconnect first; if the same user
        // is already connected, reuse the live connection.
        if (client.userID && client.userID !== data.userId) {
          await client.disconnectUser().catch(() => {});
        }
        if (!client.userID) {
          await client.connectUser(
            {
              id: data.userId,
              name: data.user?.name || "Member",
              ...(data.user?.image ? { image: data.user.image } : {}),
            },
            data.token
          );
        }
        clientRef.current = client;

        const channel = client.channel(data.channelType || "messaging", data.channelId, {
          // Pass the friendly name through so a freshly-created channel shows a
          // chapter-branded header. Stream merges this into channel.data.
          name: data.channelName || `${collective} Chat`,
        } as Record<string, unknown>);
        await channel.watch();

        if (cancelled) {
          // Component unmounted mid-connect — tear down so we don't leak a socket.
          await client.disconnectUser().catch(() => {});
          return;
        }
        setPhase({ status: "ready", client, channel });
      } catch {
        if (!cancelled)
          setPhase({
            status: "error",
            message: "Could not connect to chat. Please try again.",
          });
      }
    }

    connect();

    return () => {
      cancelled = true;
      const c = clientRef.current;
      clientRef.current = null;
      if (c) {
        // Best-effort disconnect; ignore errors on teardown.
        c.disconnectUser().catch(() => {});
      }
    };
    // Connect once on mount. `collective`/`publicKey` are stable for the lifetime
    // of this surface (identity is request-scoped; env is build-time).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Empty / non-ready states (all inert, none throw) --------------------

  if (phase.status === "loading") {
    return (
      <ChatFrame surface={surface} collective={collective} backHref={backHref} backLabel={backLabel}>
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--brand-primary)" }} />
          <p className="text-sm">Connecting to {collective.toLowerCase()} chat…</p>
        </div>
      </ChatFrame>
    );
  }

  if (phase.status === "unconfigured") {
    return (
      <ChatFrame surface={surface} collective={collective} backHref={backHref} backLabel={backLabel}>
        <EmptyState
          icon={<MessageSquare className="h-7 w-7" style={{ color: "var(--brand-primary)" }} />}
          title="Real-time chapter chat"
          body={
            surface === "admin"
              ? "Connect Stream to turn this on for your whole chapter. Add your Stream API keys to enable live messaging here."
              : "Ask your admin to connect Stream to enable live chapter messaging."
          }
        />
      </ChatFrame>
    );
  }

  if (phase.status === "unauthed") {
    return (
      <ChatFrame surface={surface} collective={collective} backHref={backHref} backLabel={backLabel}>
        <EmptyState
          icon={<MessageSquare className="h-7 w-7 text-muted-foreground" />}
          title="Sign in to chat"
          body="You need to be signed in as a chapter member to join the conversation."
        />
      </ChatFrame>
    );
  }

  if (phase.status === "error") {
    return (
      <ChatFrame surface={surface} collective={collective} backHref={backHref} backLabel={backLabel}>
        <EmptyState
          icon={<WifiOff className="h-7 w-7 text-muted-foreground" />}
          title="Chat is unavailable"
          body={phase.message}
        />
      </ChatFrame>
    );
  }

  // ---- Connected: full Stream surface --------------------------------------

  return (
    <ChatFrame surface={surface} collective={collective} bleed backHref={backHref} backLabel={backLabel}>
      <div className="gs-chat-root" style={brandVars()}>
        <Chat client={phase.client} theme="str-chat__theme-light">
          <Channel channel={phase.channel}>
            <Window>
              <ChannelHeader />
              <MessageList />
              <MessageComposer />
            </Window>
            <Thread />
          </Channel>
        </Chat>
      </div>
    </ChatFrame>
  );
}

/**
 * Map the chapter brand color (--brand-primary, set per-tenant in app/layout.tsx)
 * onto the Stream theming v2 custom properties so the send button, active states,
 * own-message bubbles and focus rings render in the chapter's color rather than
 * Stream's stock blue. Cast through a loose record so the `--str-*` custom props
 * typecheck under React.CSSProperties.
 */
function brandVars(): React.CSSProperties {
  return {
    ["--str-chat__primary-color"]: "var(--brand-primary)",
    ["--str-chat__active-primary-color"]: "var(--brand-primary-dark, var(--brand-primary))",
    ["--str-chat__primary-color-low-emphasis"]: "var(--brand-primary-soft, var(--brand-primary))",
    ["--str-chat__own-message-bubble-background-color"]: "var(--brand-primary)",
    ["--str-chat__cta-button-background-color"]: "var(--brand-primary)",
    ["--str-chat__cta-button-border-color"]: "var(--brand-primary)",
  } as React.CSSProperties;
}

// Surrounding chrome: a branded header + a bordered card the chat (or empty
// state) sits inside. `bleed` removes inner padding for the live chat so Stream's
// own layout fills the card edge-to-edge.
function ChatFrame({
  children,
  surface,
  collective,
  bleed = false,
  backHref,
  backLabel,
}: {
  children: React.ReactNode;
  surface: "admin" | "member";
  collective: string;
  bleed?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-5">
        {backHref ? (
          <a
            href={backHref}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {backLabel || "Back"}
          </a>
        ) : null}
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--brand-primary)" }}
        >
          <MessageSquare className="h-3.5 w-3.5" /> {collective} chat
        </span>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {surface === "admin" ? "Chapter chat" : `${collective} chat`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {surface === "admin"
            ? "Real-time messaging for officers and members of your chapter."
            : "Talk to your chapter in real time — announcements, planning, and everything in between."}
        </p>
      </div>
      <div
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        style={{ minHeight: bleed ? 560 : undefined }}
      >
        <div className={bleed ? "" : "p-6"}>{children}</div>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: "var(--brand-primary-soft, rgba(0,0,0,0.04))" }}
      >
        {icon}
      </span>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
