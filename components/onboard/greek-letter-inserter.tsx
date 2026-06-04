"use client";

import * as React from "react";
import { IconSpark, IconClose } from "@/components/brand/icons";
import { GREEK_ALPHABET } from "@/lib/greek-orgs";
import { cn } from "@/lib/utils";

/**
 * GREEK LETTER INSERTER — a tiny "Greek keyboard" row that lets a chapter
 * compose ANY glyph string (e.g. a chapter designation like ΓΤ) without an
 * external keyboard. Clicking a letter APPENDS its uppercase glyph to the bound
 * field via `onInsert`. Built from `GREEK_ALPHABET` (24 letters).
 *
 * Purely additive: it never reads or clears the field, it only appends — so the
 * user's manual typing always wins. Collapses to a single trigger button to keep
 * the form tidy; opens an inline grid (no portal/dialog dependency needed).
 */
export function GreekLetterInserter({
  onInsert,
  label = "Insert Greek letters",
}: {
  onInsert: (glyph: string) => void;
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
          open
            ? "border-sky-400/50 bg-sky-500/15 text-sky-100"
            : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
        )}
      >
        {open ? <IconClose className="h-3.5 w-3.5" /> : <IconSpark className="h-3.5 w-3.5" />}
        {open ? "Close letter picker" : label}
      </button>

      {open && (
        <div className="animate-soft-enter mt-2 rounded-xl border border-white/10 bg-slate-950/50 p-2.5 shadow-lg ring-1 ring-white/5 backdrop-blur-md">
          <p className="mb-2 px-0.5 text-[10px] font-medium text-slate-400">
            Tap to append a letter — combine any to build your glyphs.
          </p>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
            {GREEK_ALPHABET.map((g) => (
              <button
                key={g.name}
                type="button"
                onClick={() => onInsert(g.upper)}
                title={`${g.name} (${g.upper})`}
                aria-label={`Insert ${g.name} ${g.upper}`}
                className="flex aspect-square items-center justify-center rounded-md border border-white/10 bg-white/5 text-base font-bold text-slate-100 transition-all hover:border-sky-400/50 hover:bg-sky-500/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 active:scale-95"
              >
                {g.upper}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
