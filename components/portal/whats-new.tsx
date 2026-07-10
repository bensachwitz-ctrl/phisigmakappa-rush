"use client";

// "What's New" — a subtle, dismissible changelog surface for the member portal.
//
// Vendored (not depended): the data shape follows the OSS `featuredrop` SDK's
// `FeatureEntry`, but featuredrop's sole runtime dep is `posthog-node`, a
// server-side analytics transport we will not add to a privacy-light app that
// declares no tracking. This component is self-contained, reads a repo-local
// JSON changelog, and never touches the network. The "last seen" watermark
// lives only in this browser's localStorage.

import * as React from "react";
import { Sparkles, X } from "lucide-react";
import changelogData from "@/content/changelog.json";
import {
  latestVersion,
  unseenEntries,
  sortEntries,
  type ChangelogEntry,
  type WhatsNewType,
} from "@/lib/whats-new";

const ENTRIES = changelogData as ChangelogEntry[];
const LATEST = latestVersion(ENTRIES);
const STORAGE_KEY = "gs:whats-new:last-seen-version";

const TAG: Record<WhatsNewType, { label: string; cls: string }> = {
  feature: { label: "New", cls: "bg-maroon-100 text-maroon-800" },
  improvement: { label: "Improved", cls: "bg-emerald-100 text-emerald-800" },
  fix: { label: "Fixed", cls: "bg-slate-100 text-slate-700" },
};

function readLastSeen(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeLastSeen(version: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, version);
  } catch {
    /* private mode / storage disabled — badge simply won't persist. */
  }
}

/**
 * Header entry point: a small button that shows a badge for unseen entries and
 * opens a dismissible panel. Opening acknowledges the entries (advances the
 * watermark to the latest version), so the badge clears. Keyboard-closable
 * (Escape), closes on outside click, and honours reduced-motion.
 */
export function WhatsNew({ className }: { className?: string }) {
  const [mounted, setMounted] = React.useState(false);
  const [lastSeen, setLastSeen] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  // Read the watermark after mount only — keeps SSR/first paint deterministic
  // (no hydration mismatch from reading localStorage during render).
  React.useEffect(() => {
    setMounted(true);
    setLastSeen(readLastSeen());
  }, []);

  const unseen = React.useMemo(
    () => (mounted ? unseenEntries(ENTRIES, lastSeen).length : 0),
    [mounted, lastSeen],
  );
  const all = React.useMemo(() => sortEntries(ENTRIES), []);

  const openPanel = React.useCallback(() => {
    setOpen(true);
    if (LATEST) {
      writeLastSeen(LATEST);
      setLastSeen(LATEST); // clear the badge — they're seeing them now
    }
  }, []);

  const closePanel = React.useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Escape to close + move focus into the panel when it opens.
  React.useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closePanel();
      }
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, closePanel]);

  if (ENTRIES.length === 0) return null;

  return (
    <div className={`relative ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          unseen > 0 ? `What's New — ${unseen} unread updates` : "What's New"
        }
        className="relative inline-flex items-center gap-1 text-xs font-semibold text-maroon-700 hover:text-maroon-900 border border-maroon-100 rounded-lg px-3 py-1.5 min-h-[40px] hover:bg-cream-50 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500/40"
      >
        <Sparkles className="w-3.5 h-3.5" aria-hidden />
        <span className="hidden sm:inline">What&rsquo;s New</span>
        {mounted && unseen > 0 && (
          <span
            aria-hidden
            className="ml-0.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-maroon-600 px-1 py-0.5 text-[10px] font-bold leading-none text-cream-50"
          >
            {unseen}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="What's New"
          className="gs-glass absolute right-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] origin-top-right rounded-2xl border border-maroon-100 p-1 shadow-[0_20px_48px_-16px_rgba(10,24,56,0.35)] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150"
        >
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-maroon-900">
              What&rsquo;s New
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={closePanel}
              aria-label="Close What's New"
              className="rounded-md p-1 text-maroon-500 hover:bg-maroon-50 hover:text-maroon-800 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500/40"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <ul className="max-h-[min(24rem,60vh)] overflow-y-auto px-1 pb-1.5">
            {all.map((e) => {
              const tag = TAG[e.type];
              return (
                <li
                  key={e.id}
                  className="rounded-xl px-2.5 py-2.5 hover:bg-cream-50/70 transition-colors motion-reduce:transition-none"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tag.cls}`}
                    >
                      {tag.label}
                    </span>
                    <span className="font-serif text-sm font-semibold text-maroon-900">
                      {e.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-maroon-700">
                    {e.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
