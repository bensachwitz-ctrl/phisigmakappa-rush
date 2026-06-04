// lib/stream.ts — SERVER-ONLY GetStream Chat integration.
//
// This module is the single trust boundary for the real-time chapter chat. It
// holds the STREAM_API_SECRET and mints short-lived per-user tokens server-side;
// the secret must NEVER reach the client bundle. Importing this file from a
// "use client" component would be a security bug (the secret would be inlined
// into the JS sent to browsers) — so every export here is designed to be called
// only from route handlers / server components.
//
// Design points:
//
// 1. INERT WHEN UNCONFIGURED. Stream is an OPTIONAL add-on. If the three env
//    vars aren't set, `isStreamConfigured()` returns false and `getServerClient`
//    returns null. The token route turns that into a 503 {configured:false} and
//    the UI renders a tasteful disabled empty-state. Nothing throws, nothing
//    crashes a page render. A chapter that never connects Stream sees a polished
//    "coming soon" card, not a 500.
//
// 2. TENANT-SCOPED CHANNELS. Stream is a single shared app across all chapters,
//    so we MUST namespace channels by tenant or chapter A would read chapter B's
//    messages. The channel id is `chapter-<subdomain>` (sanitized). Two
//    different chapters resolve to two different ids and therefore two isolated
//    channels. Optional topic channels get `chapter-<subdomain>--<topic>`.
//
// 3. USER IDS ARE TENANT-PREFIXED. The same human could be a member of two
//    chapters; Stream user ids are global to the app, so we prefix the local
//    member/brother id with the tenant — `<subdomain>__<localId>` — to keep
//    identities from colliding across chapters and to make it impossible to
//    address another chapter's user by guessing a bare id.

import "server-only";
import { StreamChat } from "stream-chat";
import { getSubdomain } from "@/lib/prisma";
import { headers } from "next/headers";

/**
 * Stream allows only `[a-z0-9@_-]` (case-insensitive) in user / channel ids and
 * caps length at 64 chars. We sanitize aggressively: anything else becomes `_`.
 * Empty input collapses to "apex" so the apex (no-subdomain) context still gets
 * a stable, legal id rather than an empty string Stream would reject.
 */
function sanitizeId(input: string | null | undefined, fallback = "apex"): string {
  const cleaned = (input || "")
    .toString()
    .trim()
    .replace(/[^a-zA-Z0-9@_-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return cleaned || fallback;
}

/** Read the three Stream env vars in one place. */
function streamEnv() {
  return {
    apiKey: process.env.STREAM_API_KEY || process.env.NEXT_PUBLIC_STREAM_API_KEY || "",
    apiSecret: process.env.STREAM_API_SECRET || "",
  };
}

/**
 * True only when BOTH the API key and the secret are present. The public key
 * alone (NEXT_PUBLIC_STREAM_API_KEY) is not enough — without the secret we
 * cannot mint tokens server-side, so we must report unconfigured and stay inert.
 */
export function isStreamConfigured(): boolean {
  const { apiKey, apiSecret } = streamEnv();
  return Boolean(apiKey && apiSecret);
}

// Cache the server client across hot invocations in a single Node process so we
// don't re-instantiate (and re-open connection pools) on every request. Keyed by
// apiKey so a key rotation in dev naturally produces a fresh instance.
const globalForStream = globalThis as unknown as {
  __streamServerClient?: { key: string; client: StreamChat };
};

/**
 * Returns the shared server-side StreamChat instance, or `null` when Stream is
 * unconfigured. Callers MUST null-check — the null path is the inert behavior.
 */
export function getServerClient(): StreamChat | null {
  if (!isStreamConfigured()) return null;
  const { apiKey, apiSecret } = streamEnv();
  const cached = globalForStream.__streamServerClient;
  if (cached && cached.key === apiKey) return cached.client;
  const client = StreamChat.getInstance(apiKey, apiSecret);
  globalForStream.__streamServerClient = { key: apiKey, client };
  return client;
}

/**
 * Resolve the current request's tenant tag from the Host header — the subdomain,
 * or "apex" off the apex. Mirrors lib/prisma.getSubdomain so the chat tenant
 * lines up exactly with the Prisma schema the rest of the request is reading.
 * Resilient: any failure (called outside a request context) yields "apex".
 */
export function currentChatTenant(): string {
  try {
    const h = headers();
    const host = h.get("host") || h.get("x-forwarded-host");
    return sanitizeId(getSubdomain(host), "apex");
  } catch {
    return "apex";
  }
}

/**
 * The chapter-wide channel id for the CURRENT tenant. Every member of a chapter
 * shares exactly this one channel; no two chapters share it. Optionally pass a
 * `topic` to derive a sub-channel id (`chapter-<tenant>--<topic>`), e.g. an
 * "officers" or "pledge-class-2026" room scoped to the same chapter.
 */
export function chapterChannelId(topic?: string): string {
  const tenant = currentChatTenant();
  const base = `chapter-${tenant}`;
  if (!topic) return base.slice(0, 60);
  const t = sanitizeId(topic, "general");
  return `${base}--${t}`.slice(0, 60);
}

/**
 * Build the tenant-prefixed Stream user id for a local member/brother id. The
 * same person in two chapters gets two distinct Stream ids, so identities never
 * collide across the shared app and a token minted for one chapter cannot be
 * replayed to act as a user in another.
 */
export function streamUserId(localId: string, tenantOverride?: string): string {
  const tenant = tenantOverride ? sanitizeId(tenantOverride) : currentChatTenant();
  const local = sanitizeId(localId, "user");
  return sanitizeId(`${tenant}__${local}`, "user");
}

export interface StreamCreds {
  apiKey: string;
  token: string;
  userId: string;
}

/**
 * Upsert the signed-in member into Stream server-side and return the creds the
 * client needs to connect: the PUBLIC api key, a signed user token, and the
 * resolved (tenant-prefixed) Stream user id.
 *
 * - `localId` is the app's own brother/PortalUser id; we prefix it with the
 *   tenant via streamUserId so it's globally unique within the Stream app.
 * - `name` / `image` populate the Stream user profile so messages render with a
 *   display name + avatar without a second round-trip.
 * - Token: minted with `createToken` (a proper signed JWT). We do NOT use
 *   devToken — that only works with dev-mode auth and would be insecure in prod.
 *
 * Returns `null` when Stream is unconfigured (inert path). The SECRET is never
 * part of the return value.
 */
export async function getStreamCreds(
  localId: string,
  name: string,
  image?: string | null
): Promise<StreamCreds | null> {
  const client = getServerClient();
  if (!client) return null;
  const { apiKey } = streamEnv();

  const userId = streamUserId(localId);

  // Upsert keeps the Stream-side profile in sync on every connect. Tolerate
  // upstream hiccups: if the upsert fails we still return a token so the client
  // can attempt to connect (Stream auto-creates the user from the token on
  // first use) rather than hard-failing the whole chat surface.
  try {
    await client.upsertUser({
      id: userId,
      name: name || "Member",
      ...(image ? { image } : {}),
    });
  } catch {
    // non-fatal — see comment above
  }

  const token = client.createToken(userId);
  return { apiKey, token, userId };
}

/**
 * Ensure the chapter channel exists and the given user is a member, server-side.
 * Optional convenience for the token route so the very first member to open chat
 * doesn't race a not-yet-created channel. Best-effort: failures are swallowed so
 * channel-provisioning trouble never blocks issuing creds (the client can also
 * create/watch the channel itself).
 */
export async function ensureChapterChannel(
  userId: string,
  opts?: { name?: string; topic?: string }
): Promise<string | null> {
  const client = getServerClient();
  if (!client) return null;
  const id = chapterChannelId(opts?.topic);
  try {
    const channel = client.channel("messaging", id, {
      // created_by_id is required when creating a channel from server-side.
      created_by_id: userId,
      members: [userId],
      // `name` is custom channel data Stream stores and the UI can show as the
      // channel header. Default to a friendly chapter label.
      ...(opts?.name ? { name: opts.name } : {}),
    } as Record<string, unknown>);
    await channel.create();
    // Make sure THIS user is a member (create() only adds the initial members
    // list; a returning user who wasn't in that list still needs adding).
    await channel.addMembers([userId]);
  } catch {
    // best-effort — see comment above
    return id;
  }
  return id;
}
