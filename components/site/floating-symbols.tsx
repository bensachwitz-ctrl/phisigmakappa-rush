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

export function FloatingSymbols({
  greekLettersGlyphs = "",
  fraternityLetters = "",
  schoolNames = [],
  className = "z-[-10]",
}: {
  /** The chapter's chapter-designation glyphs, e.g. "ΓΤ" (Gamma Triton). */
  greekLettersGlyphs?: string;
  /** The chapter's national-org letters, e.g. "ΦΣΚ" / "ΚΔ". */
  fraternityLetters?: string;
  /**
   * WHITE-LABEL SAFETY: the ONLY school names ever rendered in the ambient field.
   * Callers pass THIS chapter's own school (e.g. ["USC"]) — never a hardcoded list
   * of other universities, which would leak competitor brands onto a per-tenant
   * rush hero / login. When empty (the per-tenant portal logins pass nothing),
   * NO school-name node is drawn at all; the field falls back to letters + crest.
   */
  schoolNames?: string[];
  className?: string;
}) {
  const [symbols, setSymbols] = useState<FloatingSymbol[]>([]);
  // Stable primitive dep for the effect (arrays are referentially unstable).
  const schoolsKey = (schoolNames || []).join("|");

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

    // The chapter's OWN school(s), de-duped + trimmed. Never a hardcoded list.
    const schools = (schoolNames || []).map((s) => (s || "").trim()).filter(Boolean);
    const hasSchools = schools.length > 0;

    const items: FloatingSymbol[] = [];
    // 12 nodes (down from 25) — a calmer ambient field that also halves the
    // number of compositor layers behind the hero.
    for (let i = 0; i < 12; i++) {
      // A "school" node is only ever chosen when the chapter actually gave us its
      // own school to show — otherwise we never render one (no competitor leak).
      let type: "text" | "crest" | "school" = "crest";
      const r = Math.random();
      if (hasLetters && hasSchools) {
        type = r < 0.5 ? "text" : r < 0.75 ? "school" : "crest";
      } else if (hasLetters) {
        type = r < 0.65 ? "text" : "crest";
      } else if (hasSchools) {
        type = r > 0.5 ? "school" : "crest";
      } else {
        type = "crest";
      }

      let content: string | undefined;
      let rotate = Math.random() * 180 + 90; // degrees rotation
      let size = 20;

      if (type === "text") {
        content = alphabet[Math.floor(Math.random() * alphabet.length)];
        size = Math.floor(Math.random() * 28) + 20;
      } else if (type === "school") {
        content = schools[Math.floor(Math.random() * schools.length)];
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
  }, [greekLettersGlyphs, fraternityLetters, schoolsKey]);

  if (symbols.length === 0) return null;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      <style dangerouslySetInnerHTML={{ __html: `
        /* TRANSFORM-ONLY float — never animates the layout-triggering \`top\`
           property. The item is parked at top:0 and the entire vertical journey
           (from just below the viewport up past the top) is driven by a single
           composited translate3d on the Y axis, combined with the horizontal
           drift + rotation. Animating only transform/opacity keeps this off the
           main thread (no layout/paint per frame), which is the whole point. */
        @keyframes float-up {
          0% {
            transform: translate3d(0, 115vh, 0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.35;
          }
          90% {
            opacity: 0.35;
          }
          100% {
            transform: translate3d(var(--drift), -15vh, 0) rotate(var(--rotate));
            opacity: 0;
          }
        }
        .floating-item {
          position: absolute;
          top: 0;
          animation: float-up var(--duration) linear infinite;
          animation-delay: var(--delay);
          will-change: transform, opacity;
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
