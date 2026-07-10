"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NotifyChannel } from "@/lib/notify/types";

/**
 * Per-user notification preferences card (notify #2). Self-contained: fetches the
 * signed-in member/alumni's current prefs from /api/portal/notify-prefs, lets
 * them pick WHICH channels and WHICH event types they want, and saves back.
 *
 * The chapter admin controls which channels are OFFERED (notify.channels); the
 * GET payload returns that list so a channel the chapter switched off never
 * appears here. In-app is always available (it is the existing chapter feed).
 */

interface PrefsPayload {
  ok: boolean;
  prefs: { channels: NotifyChannel[]; events: string[]; email?: string };
  offeredChannels: NotifyChannel[];
  eventTypes: string[];
  eventLabels: Record<string, string>;
  channelLabels: Record<string, string>;
}

export function NotifyPrefsCard() {
  const [data, setData] = useState<PrefsPayload | null>(null);
  const [channels, setChannels] = useState<Set<NotifyChannel>>(new Set());
  const [events, setEvents] = useState<Set<string>>(new Set());
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  // Track the save OUTCOME so the status line is colored + announced correctly
  // (green success vs red error) instead of always reading as success.
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/portal/notify-prefs");
        if (!res.ok) {
          if (alive) setUnavailable(true);
          return;
        }
        const json: PrefsPayload = await res.json();
        if (!alive) return;
        setData(json);
        setChannels(new Set(json.prefs.channels));
        setEvents(new Set(json.prefs.events));
        setEmail(json.prefs.email || "");
      } catch {
        if (alive) setUnavailable(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function toggle<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/portal/notify-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channels: [...channels],
          events: [...events],
          email: email.trim() || "",
        }),
      });
      setSaveOk(res.ok);
      setStatus(res.ok ? "Notification preferences saved." : "Could not save. Please try again.");
    } catch {
      setSaveOk(false);
      setStatus("A connection error occurred.");
    } finally {
      setSaving(false);
    }
  }

  if (unavailable) return null;

  return (
    <div className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(10,24,56,0.22)] text-left">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="w-4 h-4 text-maroon-700" />
        <h3 className="text-lg font-bold text-maroon-900">Notifications</h3>
      </div>
      <p className="text-xs text-maroon-600 mb-4">
        Choose how and when the chapter reaches you. You only receive the types and channels you pick
        below.
      </p>

      {loading ? (
        <p className="text-xs text-maroon-500">Loading preferences...</p>
      ) : data ? (
        <form onSubmit={save} className="space-y-5">
          <fieldset>
            <legend className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-2">
              Notify me about
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.eventTypes.map((ev) => (
                <label
                  key={ev}
                  className="flex items-center gap-2.5 p-2.5 bg-cream-50/50 rounded-xl border border-maroon-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={events.has(ev)}
                    onChange={() => setEvents((s) => toggle(s, ev))}
                    className="h-4 w-4 rounded border-maroon-300 text-maroon-700 focus:ring-amber-500 accent-maroon-700"
                  />
                  <span className="text-xs font-semibold text-maroon-900">
                    {data.eventLabels[ev] || ev}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-2">
              Deliver to
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {data.offeredChannels.map((ch) => (
                <label
                  key={ch}
                  className="flex items-center gap-2.5 p-2.5 bg-cream-50/50 rounded-xl border border-maroon-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={channels.has(ch)}
                    onChange={() => setChannels((s) => toggle(s, ch))}
                    className="h-4 w-4 rounded border-maroon-300 text-maroon-700 focus:ring-amber-500 accent-maroon-700"
                  />
                  <span className="text-xs font-semibold text-maroon-900">
                    {data.channelLabels[ch] || ch}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {channels.has("email") && (
            <div>
              <label
                htmlFor="notify-email"
                className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1"
              >
                Email for notifications (optional)
              </label>
              <input
                id="notify-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Leave blank to use your on-file email"
                className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
              />
            </div>
          )}

          {status && (
            <p
              role="status"
              aria-live="polite"
              className={`text-xs font-semibold ${saveOk ? "text-emerald-700" : "text-red-700"}`}
            >
              {status}
            </p>
          )}

          <div className="pt-1">
            <Button
              type="submit"
              disabled={saving}
              className="bg-maroon-800 hover:bg-maroon-900 text-cream-50 font-bold px-6 py-2.5 rounded-xl shadow"
            >
              {saving ? "Saving..." : "Save Notifications"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
