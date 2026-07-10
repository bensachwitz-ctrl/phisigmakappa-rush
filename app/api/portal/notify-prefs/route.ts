import { NextResponse } from "next/server";
import { z } from "zod";
import { getPortalSession } from "@/lib/portal-auth";
import { getNotifyConfig } from "@/lib/notify/config";
import {
  getUserPrefs,
  setUserPrefs,
  normalizePrefs,
  NOTIFY_EVENT_TYPES,
  EVENT_TYPE_LABELS,
  CHANNEL_LABELS,
} from "@/lib/notify/prefs";
import { ALL_CHANNELS, type NotifyChannel } from "@/lib/notify/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Per-user notification preferences (notify #2). A member/alumni reads and
 * writes ONLY their own prefs, keyed by their portal session userId. The GET
 * payload also tells the UI which channels the CHAPTER offers (notify.channels)
 * so it never presents a channel the chapter has switched off.
 */

const ChannelEnum = z.enum(ALL_CHANNELS as [NotifyChannel, ...NotifyChannel[]]);

const PatchSchema = z.object({
  channels: z.array(ChannelEnum).max(ALL_CHANNELS.length),
  events: z.array(z.string().max(64)).max(32),
  email: z.string().email().max(200).optional().or(z.literal("")),
});

export async function GET() {
  const sess = getPortalSession();
  if (!sess) return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });

  const [prefs, config] = await Promise.all([getUserPrefs(sess.userId), getNotifyConfig()]);

  return NextResponse.json({
    ok: true,
    prefs,
    offeredChannels: config.enabledChannels,
    eventTypes: NOTIFY_EVENT_TYPES,
    eventLabels: EVENT_TYPE_LABELS,
    channelLabels: CHANNEL_LABELS,
  });
}

export async function PATCH(req: Request) {
  const sess = getPortalSession();
  if (!sess) return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  const prefs = normalizePrefs({
    channels: parsed.data.channels,
    events: parsed.data.events,
    email: parsed.data.email || undefined,
  });

  await setUserPrefs(sess.userId, prefs);
  return NextResponse.json({ ok: true, prefs });
}
