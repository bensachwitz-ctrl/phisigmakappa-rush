import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── WCAG AA contrast floor for legally/operationally meaningful text ──────────
// Two specific on-white labels were rendered in `text-slate-400` (~2.6:1 on
// white — fails AA's 4.5:1 for normal text):
//   1. The ESIGN-Act digital-signature disclosure in the bid-response form. It
//      is the legally-binding consent line and MUST be readable.
//   2. The admin sparkline axis labels ("7d ago" / "today") in dashboard-insights.
// They were bumped to AA-passing tokens (text-slate-600 / text-muted-foreground)
// to match the adjacent consent copy. Pin BOTH so the faint token can't regress.

const ROOT = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("legal/operational text clears WCAG AA (no faint text-slate-400)", () => {
  it("bid-response ESIGN disclosure is not rendered in text-slate-400", () => {
    const src = read("components/site/bid-response-form.tsx");
    // The exact disclosure paragraph must not carry the failing token.
    const esignLine = src
      .split("\n")
      .find((l) => l.includes("legally binding digital signature"));
    expect(esignLine, "ESIGN disclosure line should still exist").toBeTruthy();
    // The disclosure is an adjacent <p className="...">; assert the className that
    // wraps it is the AA-passing one, not text-slate-400 / the 10px size.
    expect(src).toContain('<p className="text-xs text-slate-600 italic">');
    expect(src).not.toContain('text-[10px] text-slate-400 italic');
  });

  it("dashboard-insights sparkline axis is not rendered in text-slate-400", () => {
    const src = read("components/admin/dashboard-insights.tsx");
    expect(src).not.toContain("text-[9px] font-semibold text-slate-400");
    expect(src).toContain("text-[10px] font-semibold text-muted-foreground uppercase tracking-wider");
  });
});
