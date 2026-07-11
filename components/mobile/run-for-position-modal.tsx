"use client";

import React from "react";
import { IconClose, IconCheck, IconAward } from "@/components/brand/icons";

/**
 * Run-for-a-position modal (item 3). The MEMBER-side counterpart to the officer
 * tool pages: a non-exec brother never sees exec tools — instead they get a
 * button that opens this sheet to express interest in running for / holding an
 * officer position next election. On submit it records a durable PositionInterest
 * and the current holder is notified (they see it in their officer tools) so they
 * can mentor. Self-contained (own state via props) so it drops into the mobile
 * client with a minimal footprint.
 *
 * Design: single accent = the chapter brand color (no gradients/glows), labels
 * above inputs, 44px targets, brand icon set, reduced-motion honored by the
 * caller's animation utility.
 */
export interface RunForPositionModalProps {
  open: boolean;
  brandColor: string;
  /** Officer positions the chapter offers (titles). */
  positions: string[];
  position: string;
  message: string;
  submitting: boolean;
  /** True after a successful submit → shows the confirmation state. */
  done: boolean;
  /** Name of the notified current holder (null when none was found). */
  doneName: string | null;
  onPosition: (v: string) => void;
  onMessage: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function RunForPositionModal(props: RunForPositionModalProps) {
  const {
    open, brandColor, positions, position, message, submitting, done, doneName,
    onPosition, onMessage, onSubmit, onClose,
  } = props;

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const accent = /^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : "#1e3a8a";

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-50 flex flex-col justify-end bg-slate-950/75 text-left backdrop-blur-sm motion-reduce:backdrop-blur-none lg:absolute lg:inset-0"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="run-position-title"
        className="flex grow flex-col space-y-4 overflow-y-auto rounded-t-[32px] border-t border-slate-200 bg-white p-6 shadow-2xl lg:max-h-[85%] lg:grow-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: `${accent}14`, color: accent }}
            >
              <IconAward className="h-5 w-5" />
            </span>
            <h4 id="run-position-title" className="text-sm font-bold text-slate-900">
              Run for a position
            </h4>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600 transition hover:text-slate-900"
            type="button"
            aria-label="Close"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-12 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: `${accent}14`, color: accent }}
            >
              <IconCheck className="h-6 w-6" />
            </div>
            <h5 className="text-sm font-bold text-slate-900">Interest recorded</h5>
            <p className="max-w-xs text-xs text-slate-500">
              {doneName
                ? `We let ${doneName} know you're interested. They can reach out to mentor you before the next election.`
                : "The current officer will see your interest and can reach out to mentor you before the next election."}
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
            className="space-y-4 pb-6"
          >
            <p className="text-xs leading-relaxed text-slate-500">
              Thinking about stepping up? Pick a position you would like to run for
              or hold next term. The current officer will be notified so they can
              show you the ropes.
            </p>
            <div>
              <label
                htmlFor="run-position-select"
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500"
              >
                Position
              </label>
              <select
                id="run-position-select"
                required
                value={position}
                onChange={(e) => onPosition(e.target.value)}
                className="brand-focus min-h-[44px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-300"
              >
                <option value="" disabled>Choose a position…</option>
                {positions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="run-position-message"
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500"
              >
                Why (optional)
              </label>
              <textarea
                id="run-position-message"
                rows={3}
                value={message}
                onChange={(e) => onMessage(e.target.value)}
                placeholder="A line on why you're interested (the officer sees this)."
                className="brand-focus w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-300"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !position}
              className="press min-h-[44px] w-full rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {submitting ? "Sending…" : "Express interest"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
