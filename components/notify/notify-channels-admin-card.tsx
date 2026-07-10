"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { ALL_CHANNELS, type NotifyChannel } from "@/lib/notify/types";
import { CHANNEL_LABELS } from "@/lib/notify/prefs";

/**
 * Chapter admin control (notify #2): which notification channels the chapter
 * OFFERS to members. Persists to the `notify.channels` cfg key through the shared
 * /api/admin/settings PATCH. A channel switched off here never appears in any
 * member's per-user preferences card, and is never dispatched even if its secret
 * is present. Empty selection = offer every channel (matches resolveNotifyConfig).
 */

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

export function NotifyChannelsAdminCard({ initialValue }: { initialValue?: string }) {
  const [offered, setOffered] = useState<Set<NotifyChannel>>(() => parseInitial(initialValue));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

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
      // Persist the selected order (stable ALL_CHANNELS order) as a JSON array.
      const value = JSON.stringify(ALL_CHANNELS.filter((c) => offered.has(c)));
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { "notify.channels": value } }),
      });
      setStatus(res.ok ? "Saved." : "Could not save. Please try again.");
    } catch {
      setStatus("A connection error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <Bell className="h-4 w-4 text-phisig-red" />
        <h2 className="text-lg font-semibold text-foreground">Notification channels</h2>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Pick which delivery channels members can choose from for event, announcement, job, and dues
        notifications. Each channel still stays inert until you add its webhook or token below.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ALL_CHANNELS.map((ch) => (
          <label
            key={ch}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/40 p-2.5 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={offered.has(ch)}
              onChange={() => toggle(ch)}
              className="h-4 w-4 rounded border-border accent-phisig-red"
            />
            <span className="text-sm font-medium text-foreground">{CHANNEL_LABELS[ch]}</span>
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-phisig-red px-4 py-2 text-sm font-semibold text-white hover:bg-phisig-red/90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save channels"}
        </button>
        {status && <span className="text-sm font-medium text-muted-foreground">{status}</span>}
      </div>
    </div>
  );
}
