"use client";

import { useState } from "react";
import { IconBell as Bell } from "@/components/brand/icons";
import { ALL_CHANNELS, type NotifyChannel } from "@/lib/notify/types";
import { CHANNEL_LABELS } from "@/lib/notify/labels";

/**
 * Chapter admin control (notify #2): which notification channels the chapter
 * OFFERS to members, AND the per-tenant credentials that make each one live.
 *
 * OFFERED CHANNELS persist to the `notify.channels` cfg key. A channel switched
 * off here never appears in any member's per-user preferences card, and is never
 * dispatched even if its secret is present. Empty selection = offer every channel.
 *
 * CHANNEL CREDENTIALS are WRITE-ONLY. The card NEVER receives a stored secret —
 * only a `secretsSet` presence map (booleans) so it can show "Set" / "Not set".
 * Typing a new value PATCHes it; leaving a field blank keeps the existing secret.
 * Without a per-tenant credential a channel is INERT (lib/notify never falls back
 * to a shared operator webhook — that would leak one tenant's posts into another's
 * channel). All writes go through the shared /api/admin/settings PATCH.
 */

// Write-only credential fields, in render order. `secret` fields are password
// inputs; `text` fields (telegram chat id) are plain — a chat id is not a bearer
// credential, so it is shown/edited normally.
const CRED_FIELDS: Array<{ key: string; label: string; placeholder: string; secret: boolean }> = [
  { key: "notify.slack.webhook", label: "Slack incoming webhook URL", placeholder: "https://hooks.slack.com/services/…", secret: true },
  { key: "notify.teams.webhook", label: "Microsoft Teams webhook URL", placeholder: "https://outlook.office.com/webhook/…", secret: true },
  { key: "notify.discord.webhook", label: "Discord webhook URL", placeholder: "https://discord.com/api/webhooks/…", secret: true },
  { key: "notify.telegram.botToken", label: "Telegram bot token", placeholder: "123456:ABC-DEF…", secret: true },
  { key: "notify.webhook.url", label: "Generic webhook URL", placeholder: "https://your-endpoint.example/hook", secret: true },
  { key: "notify.webhook.secret", label: "Generic webhook signing secret (optional)", placeholder: "shared secret sent as X-Notify-Secret", secret: true },
];

function parseInitial(raw: string | undefined): Set<NotifyChannel> {
  if (!raw || !raw.trim()) return new Set(ALL_CHANNELS);
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set(ALL_CHANNELS);
    const valid = arr.filter(
      (c): c is NotifyChannel => typeof c === "string" && (ALL_CHANNELS as string[]).includes(c),
    );
    return valid.length ? new Set(valid) : new Set(ALL_CHANNELS);
  } catch {
    return new Set(ALL_CHANNELS);
  }
}

export function NotifyChannelsAdminCard({
  initialValue,
  secretsSet = {},
  telegramChatId = "",
}: {
  initialValue?: string;
  /** Presence map (booleans only) for each notify credential key — never the value. */
  secretsSet?: Record<string, boolean>;
  /** Current telegram chat id (not a secret; shown/edited normally). */
  telegramChatId?: string;
}) {
  const [offered, setOffered] = useState<Set<NotifyChannel>>(() => parseInitial(initialValue));
  // Only newly-typed credential values live here; a key absent from this map is
  // left untouched on save (its existing stored secret is preserved).
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [chatId, setChatId] = useState(telegramChatId);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [ok, setOk] = useState(false);

  function toggle(ch: NotifyChannel) {
    setOffered((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setStatus("");
    try {
      // Offered channels: persist the selected set in stable ALL_CHANNELS order.
      const updates: Record<string, string> = {
        "notify.channels": JSON.stringify(ALL_CHANNELS.filter((c) => offered.has(c))),
      };
      // Only include a credential the admin actually typed (non-empty) — a blank
      // field keeps the existing stored secret rather than wiping it.
      for (const f of CRED_FIELDS) {
        const v = (creds[f.key] ?? "").trim();
        if (v) updates[f.key] = v;
      }
      // Telegram chat id is not write-only; save it when it changed.
      if (chatId.trim() !== telegramChatId.trim()) {
        updates["notify.telegram.chatId"] = chatId.trim();
      }
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      setOk(res.ok);
      setStatus(res.ok ? "Saved." : "Could not save. Please try again.");
      if (res.ok) setCreds({}); // typed secrets are now stored; clear the inputs
    } catch {
      setOk(false);
      setStatus("A connection error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <Bell className="h-4 w-4 text-brand-red" />
        <h2 className="text-lg font-semibold text-foreground">Notification channels</h2>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Pick which delivery channels members can choose from for event, announcement, job, and dues
        notifications. Each channel stays inert until you add its webhook or token below.
      </p>

      <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <legend className="sr-only">Channels offered to members</legend>
        {ALL_CHANNELS.map((ch) => (
          <label
            key={ch}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/40 p-2.5 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={offered.has(ch)}
              onChange={() => toggle(ch)}
              className="h-4 w-4 rounded border-border accent-brand-red"
            />
            <span className="text-sm font-medium text-foreground">{CHANNEL_LABELS[ch]}</span>
          </label>
        ))}
      </fieldset>

      {/* WRITE-ONLY per-tenant channel credentials. Never pre-filled; shows a
          "Set" / "Not set" badge from the presence map. */}
      <fieldset className="mt-6 space-y-3 border-t border-border pt-5">
        <legend className="text-sm font-semibold text-foreground">Channel credentials</legend>
        <p className="max-w-2xl text-xs text-muted-foreground">
          These are write-only. Saved values are never shown again. Leave a field blank to keep the
          existing credential, or type a new value to replace it.
        </p>
        {CRED_FIELDS.map((f) => {
          const isSet = !!secretsSet[f.key];
          return (
            <div key={f.key}>
              <label
                htmlFor={`cred-${f.key}`}
                className="mb-1 flex items-center gap-2 text-xs font-medium text-foreground"
              >
                {f.label}
                <span
                  className={
                    isSet
                      ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20"
                      : "rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground ring-1 ring-border"
                  }
                >
                  {isSet ? "Set" : "Not set"}
                </span>
              </label>
              <input
                id={`cred-${f.key}`}
                type={f.secret ? "password" : "text"}
                autoComplete="off"
                spellCheck={false}
                value={creds[f.key] ?? ""}
                onChange={(e) => setCreds((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={isSet ? "configured - leave blank to keep" : f.placeholder}
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
              />
            </div>
          );
        })}
        <div>
          <label
            htmlFor="cred-telegram-chatid"
            className="mb-1 inline-block text-xs font-medium text-foreground"
          >
            Telegram chat ID
          </label>
          <input
            id="cred-telegram-chatid"
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="-1001234567890"
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
          />
        </div>
      </fieldset>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red/90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save channels"}
        </button>
        {status && (
          <span
            role="status"
            className={ok ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-brand-red"}
          >
            {status}
          </span>
        )}
      </div>
    </div>
  );
}
