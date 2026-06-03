"use client";

import React, { useEffect, useState } from "react";
import { Crest } from "@/components/brand/wordmark";
import { useChapterIdentity } from "@/components/brand/chapter-identity-context";

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

export function FloatingSymbols({ greekLettersGlyphs: propGlyphs }: { greekLettersGlyphs?: string }) {
  const { greekLettersGlyphs: ctxGlyphs, fraternityLetters } = useChapterIdentity();
  const greekLettersGlyphs = propGlyphs ?? ctxGlyphs;
  const [symbols, setSymbols] = useState<FloatingSymbol[]>([]);

  useEffect(() => {
    // Compile characters
    const alphabet: string[] = [];
    if (fraternityLetters) {
      for (const char of fraternityLetters) {
        if (char.trim() && !alphabet.includes(char)) {
          alphabet.push(char);
        }
      }
    }
    if (greekLettersGlyphs) {
      for (const char of greekLettersGlyphs) {
        if (char.trim() && !alphabet.includes(char)) {
          alphabet.push(char);
        }
      }
    }
    // Fallback if empty
    if (alphabet.length === 0) {
      alphabet.push("Φ", "Σ", "Κ");
    }

    const items: FloatingSymbol[] = [];
    for (let i = 0; i < 20; i++) {
      const type = Math.random() > 0.35 ? "text" : "crest";
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
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
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
