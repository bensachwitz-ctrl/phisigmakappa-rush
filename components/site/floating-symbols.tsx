"use client";

import React, { useEffect, useState } from "react";
import { Crest } from "@/components/brand/wordmark";

interface FloatingSymbol {
  id: number;
  type: "text" | "crest" | "school";
  content?: string;
  left: number; // percentage
  size: number; // pixels
  delay: number; // seconds
  duration: number; // seconds
  drift: number; // pixels
  rotate: number; // degrees
}

const SCHOOL_NAMES = [
  "USC", "Penn State", "Purdue", "FSU", "Indiana", "Michigan", "UT Austin",
  "UF", "Alabama", "Ohio State", "UNC", "Georgia", "Wisconsin", "UCLA",
  "TAMU", "Clemson", "Virginia", "Auburn", "Arizona", "Oregon"
];

export function FloatingSymbols({
  greekLettersGlyphs = "",
  fraternityLetters = "",
  className = "z-[-10]",
}: {
  /** The chapter's chapter-designation glyphs, e.g. "ΓΤ" (Gamma Triton). */
  greekLettersGlyphs?: string;
  /** The chapter's national-org letters, e.g. "ΦΣΚ" / "ΚΔ". */
  fraternityLetters?: string;
  className?: string;
}) {
  const [symbols, setSymbols] = useState<FloatingSymbol[]>([]);

  useEffect(() => {
    // Build the alphabet PURELY from THIS chapter's letters — combine
    // the national letters + the chapter designation, de-duped.
    const alphabet: string[] = [];
    for (const source of [fraternityLetters, greekLettersGlyphs]) {
      for (const char of source || "") {
        if (char.trim() && !alphabet.includes(char)) {
          alphabet.push(char);
        }
      }
    }
    const hasLetters = alphabet.length > 0;

    const items: FloatingSymbol[] = [];
    for (let i = 0; i < 25; i++) {
      let type: "text" | "crest" | "school" = "crest";
      if (hasLetters) {
        const r = Math.random();
        if (r < 0.50) {
          type = "text";
        } else if (r < 0.75) {
          type = "school";
        } else {
          type = "crest";
        }
      } else {
        type = Math.random() > 0.5 ? "school" : "crest";
      }

      let content: string | undefined;
      let rotate = Math.random() * 180 + 90; // degrees rotation
      let size = 20;

      if (type === "text") {
        content = alphabet[Math.floor(Math.random() * alphabet.length)];
        size = Math.floor(Math.random() * 28) + 20;
      } else if (type === "school") {
        content = SCHOOL_NAMES[Math.floor(Math.random() * SCHOOL_NAMES.length)];
        size = Math.floor(Math.random() * 8) + 14; // 14px to 22px for readability
        rotate = Math.random() * 30 - 15; // restricted rotation (-15 to +15 deg)
      } else {
        size = Math.floor(Math.random() * 36) + 28;
      }

      items.push({
        id: i,
        type,
        content,
        left: Math.random() * 100,
        size,
        delay: Math.random() * 10,
        duration: Math.random() * 15 + 12,
        drift: Math.random() * 80 - 40, // -40px to 40px
        rotate,
      });
    }
    setSymbols(items);
  }, [greekLettersGlyphs, fraternityLetters]);

  if (symbols.length === 0) return null;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-up {
          0% {
            top: 105%;
            transform: translate3d(0, 0, 0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.35;
          }
          90% {
            opacity: 0.35;
          }
          100% {
            top: -10%;
            transform: translate3d(var(--drift), 0, 0) rotate(var(--rotate));
            opacity: 0;
          }
        }
        .floating-item {
          position: absolute;
          animation: float-up var(--duration) linear infinite;
          animation-delay: var(--delay);
          will-change: top, transform, opacity;
          opacity: 0;
          color: var(--brand-primary, #38bdf8);
        }
      `}} />
      {symbols.map((item) => (
        <div
          key={item.id}
          className="floating-item"
          style={{
            left: `${item.left}%`,
            fontSize: (item.type === "text" || item.type === "school") ? `${item.size}px` : undefined,
            width: item.type === "crest" ? `${item.size}px` : undefined,
            height: item.type === "crest" ? `${item.size}px` : undefined,
            "--drift": `${item.drift}px`,
            "--rotate": `${item.rotate}deg`,
            "--duration": `${item.duration}s`,
            "--delay": `${item.delay}s`,
          } as React.CSSProperties}
        >
          {item.type === "crest" ? (
            <div className="opacity-80">
              <Crest className="w-full h-full" />
            </div>
          ) : (
            <span className={`select-none block ${item.type === "school" ? "font-medium opacity-75 tracking-wider font-sans" : "font-semibold font-display"}`}>
              {item.content}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
