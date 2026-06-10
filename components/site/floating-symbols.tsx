"use client";

import React, { useEffect, useState } from "react";
import { Crest } from "@/components/brand/wordmark";

interface FloatingSymbol {
  id: number;
  type: "text" | "crest";
  content?: string;
  left: number; // percentage
  size: number; // pixels
  delay: number; // seconds
  duration: number; // seconds
  drift: number; // pixels
  rotate: number; // degrees
}

export function FloatingSymbols({
  greekLettersGlyphs = "",
  fraternityLetters = "",
}: {
  /** The chapter's chapter-designation glyphs, e.g. "ΓΤ" (Gamma Triton). */
  greekLettersGlyphs?: string;
  /** The chapter's national-org letters, e.g. "ΦΣΚ" / "ΚΔ". */
  fraternityLetters?: string;
}) {
  const [symbols, setSymbols] = useState<FloatingSymbol[]>([]);

  useEffect(() => {
    // Build the alphabet PURELY from THIS chapter's letters — never a hardcoded
    // ΦΣΚ base (which rained Phi Sig's glyphs over a Kappa Delta hero). Combine
    // the national letters + the chapter designation, de-duped. If a chapter has
    // no letters configured, the alphabet is empty and we render Crest-only.
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
    for (let i = 0; i < 20; i++) {
      // With no letters configured, every floating item is a brand-tinted Crest
      // (no foreign glyphs); otherwise keep the ~65% letters / 35% crest mix.
      const type = hasLetters ? (Math.random() > 0.35 ? "text" : "crest") : "crest";
      items.push({
        id: i,
        type,
        content: type === "text" ? alphabet[Math.floor(Math.random() * alphabet.length)] : undefined,
        left: Math.random() * 100,
        size: type === "text" ? Math.floor(Math.random() * 28) + 20 : Math.floor(Math.random() * 36) + 28,
        delay: Math.random() * 10,
        duration: Math.random() * 15 + 12,
        drift: Math.random() * 80 - 40, // -40px to 40px
        rotate: Math.random() * 180 + 90, // degrees rotation
      });
    }
    setSymbols(items);
  }, [greekLettersGlyphs, fraternityLetters]);

  if (symbols.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[-10]" aria-hidden="true">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-up {
          0% {
            transform: translate3d(0, 105vh, 0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.12;
          }
          90% {
            opacity: 0.12;
          }
          100% {
            transform: translate3d(var(--drift), -10vh, 0) rotate(var(--rotate));
            opacity: 0;
          }
        }
        .floating-item {
          position: absolute;
          bottom: 0;
          animation: float-up var(--duration) linear infinite;
          animation-delay: var(--delay);
          will-change: transform, opacity;
          opacity: 0;
          color: var(--brand-primary, #C8102E);
        }
      `}} />
      {symbols.map((item) => (
        <div
          key={item.id}
          className="floating-item"
          style={{
            left: `${item.left}%`,
            fontSize: item.type === "text" ? `${item.size}px` : undefined,
            width: item.type === "crest" ? `${item.size}px` : undefined,
            height: item.type === "crest" ? `${item.size}px` : undefined,
            "--drift": `${item.drift}px`,
            "--rotate": `${item.rotate}deg`,
            "--duration": `${item.duration}s`,
            "--delay": `${item.delay}s`,
          } as React.CSSProperties}
        >
          {item.type === "text" ? (
            <span className="font-semibold select-none font-display block">
              {item.content}
            </span>
          ) : (
            <div className="opacity-80">
              <Crest className="w-full h-full" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
