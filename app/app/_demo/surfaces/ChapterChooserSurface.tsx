import React from "react";
import { Search, ChevronRight, AlertCircle, Palette, ArrowRight, Wand2, Sparkles, Rocket } from "lucide-react";
import { BrandGlyphIcon } from "@/components/site/brand-glyph";
import {
  FRATERNITY_BRANDS,
  BRAND_PALETTE,
  brandSecondary,
  glyphsFromBrand,
  makeCustomBrand,
  normalizeLetters,
} from "../mock-data";
import type { DemoContext } from "../context";

/**
 * ChapterChooser — the spectacular "choose ANY chapter" surface (feature 1).
 *
 * Two modes:
 *   • Pick   — a brand-swatched grid of preset orgs (and any live DB chapters).
 *   • Create — enter ANY org: Greek letters + name + primary/secondary color
 *              (palette + raw hex) + school, with a LIVE preview card that
 *              re-brands as you type. Tapping "Launch this chapter" re-skins the
 *              ENTIRE demo to it instantly.
 *
 * Renders both as the initial onboarding picker (no tenant yet) and as a
 * re-openable overlay over the running demo (so a visitor can swap chapters
 * without signing out). Stateless: all form state lives in `ctx`.
 */
export function renderChapterChooser(ctx: DemoContext, opts?: { overlay?: boolean }) {
  const {
    filteredChapters,
    handleSelectTenant,
    searchQuery,
    setSearchQuery,
    chooserMode,
    setChooserMode,
    customName,
    setCustomName,
    customLetters,
    setCustomLetters,
    customSchool,
    setCustomSchool,
    customPrimary,
    setCustomPrimary,
    customSecondary,
    setCustomSecondary,
    applyCustomChapter,
    applyBrandToDemo,
    setShowChapterChooser,
  } = ctx;

  const overlay = opts?.overlay;

  // Live preview brand built from the in-flight create form.
  const previewLetters = normalizeLetters(customLetters) || "ΦΣΚ";
  const previewBrand = makeCustomBrand({
    name: customName,
    letters: previewLetters,
    primaryColor: customPrimary,
    secondaryColor: customSecondary,
  });
  const previewGlyphs = glyphsFromBrand(previewBrand.letters);

  // When used as an overlay, picking a preset must re-skin live (applyBrandToDemo)
  // rather than route through the login flow.
  const choosePreset = (brand: typeof FRATERNITY_BRANDS[number], name: string, school: string) => {
    if (overlay) applyBrandToDemo(brand, { name, school });
  };

  return (
    <div className="gs-chooser-scope flex flex-1 flex-col overflow-hidden bg-white text-left">
      {/* Header */}
      <div className="relative shrink-0 overflow-hidden px-6 pt-6 pb-5">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background: `radial-gradient(120% 90% at 80% -10%, ${customPrimary}1f, transparent 60%)`,
          }}
        />
        <div className="relative flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: customPrimary + "12", borderColor: customPrimary + "2a", color: customPrimary }}
          >
            <BrandGlyphIcon name="branding" className="h-3.5 w-3.5" /> {overlay ? "Switch Chapter" : "Choose Chapter"}
          </span>
          {overlay && (
            <button
              onClick={() => setShowChapterChooser(false)}
              aria-label="Close chapter switcher"
              className="press min-h-[44px] rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 motion-reduce:transition-none"
            >
              Close
            </button>
          )}
        </div>
        <h1 className="relative mt-3 text-[22px] font-extrabold tracking-tight text-slate-900">
          {overlay ? "Make it your chapter" : "See it as your chapter"}
        </h1>
        <p className="relative mt-1 text-[13px] leading-snug text-slate-500">
          Pick your school's chapter or build your own: letters, colors, name.
          <span className="font-semibold text-slate-700"> The entire app instantly re-skins to YOUR chapter</span> so you can see exactly how it's tailored to you.
        </p>

        {/* Mode toggle — segmented control with a sliding active pill */}
        <div className="relative mt-4 grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100 p-1">
          <span
            aria-hidden="true"
            className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-xl bg-white shadow-sm transition-transform duration-300 ease-gs-spring"
            style={{ transform: chooserMode === "create" ? "translateX(calc(100% + 0.5rem))" : "translateX(0)" }}
          />
          <button
            onClick={() => setChooserMode("pick")}
            aria-pressed={chooserMode === "pick"}
            className={`relative z-10 flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 motion-reduce:transition-none ${
              chooserMode === "pick" ? "text-slate-900" : "text-slate-500"
            }`}
          >
            <Search className="h-4 w-4" aria-hidden="true" /> Pick one
          </button>
          <button
            onClick={() => setChooserMode("create")}
            aria-pressed={chooserMode === "create"}
            className={`relative z-10 flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 motion-reduce:transition-none ${
              chooserMode === "create" ? "text-slate-900" : "text-slate-500"
            }`}
          >
            <Wand2 className="h-4 w-4" aria-hidden="true" /> Create yours
          </button>
        </div>
      </div>

      {/* ── PICK MODE ─────────────────────────────────────────────────────── */}
      {chooserMode === "pick" && (
        <div className="flex flex-1 flex-col overflow-hidden px-5 pb-5">
          {/* Big, tappable brand swatches — the front-and-center "pick your org"
              moment. Tapping any one re-skins the WHOLE app to that brand's
              letters + colors instantly. */}
          <div className="mb-3 shrink-0">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tap your organization
            </span>
            <div className="grid grid-cols-3 gap-2">
              {FRATERNITY_BRANDS.map((b) => {
                const sec = brandSecondary(b);
                return (
                  <button
                    key={b.id}
                    aria-label={`Preview ${b.name} (${b.letters})`}
                    onClick={() => {
                      if (overlay) {
                        applyBrandToDemo(b, { name: b.name, school: "University of South Carolina" });
                      } else {
                        const t = filteredChapters.find((c) => c.brandId === b.id && c.id.startsWith("demo-"));
                        if (t) handleSelectTenant(t);
                        else applyBrandToDemo(b, { name: b.name, school: "University of South Carolina" });
                      }
                    }}
                    className="press group flex min-h-[44px] flex-col items-center gap-1.5 rounded-2xl border border-slate-100 bg-white p-2.5 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-[16px] font-extrabold text-white shadow-sm overflow-hidden"
                      style={{ background: b.crestUrl ? "transparent" : `linear-gradient(140deg, ${b.primaryColor}, ${sec})` }}
                    >
                      {b.crestUrl ? (
                        <img src={b.crestUrl} alt="" className="w-full h-full object-contain" />
                      ) : (
                        b.letters
                      )}
                    </span>
                    <span className="line-clamp-2 text-[11px] font-bold leading-tight text-slate-700">{b.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative mb-2.5 shrink-0">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Or search any chapter or school..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="brand-focus w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400"
            />
          </div>

          <div className="-mr-1 flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredChapters.length > 0 ? (
              filteredChapters.map((t) => {
                const br = FRATERNITY_BRANDS.find((b) => b.id === t.brandId) || FRATERNITY_BRANDS[0];
                const isDemoItem = t.id.startsWith("demo-");
                const sec = brandSecondary(br);
                return (
                  <button
                    key={t.id}
                    aria-label={`${isDemoItem ? "Preview demo chapter " : "Open "}${t.name || br.name}${t.school ? ` at ${t.school}` : ""}`}
                    onClick={() => (overlay ? choosePreset(br, t.name || br.name, t.school || "University of South Carolina") : handleSelectTenant(t))}
                    className="press group flex w-full min-h-[60px] items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-[15px] font-bold shadow-inner"
                        style={{
                          background: `linear-gradient(140deg, ${br.primaryColor}14, ${sec}14)`,
                          borderColor: br.primaryColor + "26",
                          color: br.primaryColor,
                        }}
                      >
                        {br.letters}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="truncate text-[14px] font-bold text-slate-800 transition-colors group-hover:text-slate-900">
                            {t.name}
                          </h4>
                          {isDemoItem && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[12px] font-bold text-amber-600 ring-1 ring-amber-100">
                              Demo
                            </span>
                          )}
                        </div>
                        <span className="block truncate text-[12px] text-slate-500">
                          {t.school || "Greekstack Chapter"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
                  </button>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400">
                <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-[13px]">No chapters match. Try “Create yours”.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE MODE ───────────────────────────────────────────────────── */}
      {chooserMode === "create" && (
        <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
          {/* PREVIEW-ONLY notice — unambiguously labels this branch as a
              non-authenticated demo so a "Create yours" chapter is never mistaken
              for a real, signed-in tenant. The chapter you build here only
              re-skins the local demo; it is never persisted as a real session.
              The path to a REAL chapter is the /onboard CTA below. */}
          <div
            role="note"
            className="flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50 p-3"
          >
            <span
              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600"
              aria-hidden="true"
            >
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-blue-900">Preview only — not a real login</p>
              <p className="mt-0.5 text-[11px] leading-snug text-blue-800/90">
                Building a chapter here instantly re-skins this demo so you can see
                it as yours. It doesn&apos;t create an account or sign you in. Ready
                to launch your real chapter?{" "}
                <a
                  href="/onboard"
                  className="font-bold text-blue-700 underline underline-offset-2 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                >
                  Start onboarding
                </a>
                .
              </p>
            </div>
          </div>

          {/* Live preview card — re-brands as you type */}
          <div
            className="relative overflow-hidden rounded-2xl border p-4 transition-colors"
            style={{
              borderColor: customPrimary + "33",
              background: `linear-gradient(150deg, ${customPrimary}10, ${customSecondary}0d)`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[19px] font-extrabold text-white shadow-md"
                style={{ background: `linear-gradient(140deg, ${customPrimary}, ${customSecondary})` }}
              >
                {previewLetters}
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: customPrimary }}>
                  <BrandGlyphIcon name="branding" className="h-3 w-3" /> Tailored for you
                </span>
                <h3 className="mt-0.5 truncate text-[16px] font-extrabold text-slate-900">{customName.trim() || "Your Chapter"}</h3>
                <p className="truncate text-[12px] text-slate-500">{customSchool.trim() || "Your University"}</p>
              </div>
            </div>
            {/* drifting preview glyphs */}
            <div className="pointer-events-none absolute -right-2 -top-2 select-none text-[64px] font-serif font-black leading-none opacity-[0.06]" style={{ color: customPrimary }}>
              {previewGlyphs[0]}
            </div>
          </div>

          <Field label="Chapter name">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Kappa Delta, Beta Chapter"
              className="brand-focus w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400"
            />
          </Field>

          <Field label="Greek letters" hint="Type names (“Kappa Delta”) or glyphs (“ΚΔ”).">
            <input
              value={customLetters}
              onChange={(e) => setCustomLetters(e.target.value)}
              placeholder="Kappa Delta"
              className="brand-focus w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Φ", "Σ", "Κ", "Α", "Δ", "Θ", "Π", "Ω", "Χ", "Λ"].map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-label={`Add Greek letter ${g}`}
                  onClick={() => setCustomLetters((customLetters || "") + g)}
                  className="press flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[15px] font-serif font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 motion-reduce:transition-none"
                >
                  {g}
                </button>
              ))}
            </div>
          </Field>

          <Field label="School / university">
            <input
              value={customSchool}
              onChange={(e) => setCustomSchool(e.target.value)}
              placeholder="University of South Carolina"
              className="brand-focus w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400"
            />
          </Field>

          <ColorField label="Primary color" value={customPrimary} onChange={setCustomPrimary} />
          <ColorField label="Secondary color" value={customSecondary} onChange={setCustomSecondary} />

          <button
            onClick={applyCustomChapter}
            aria-label="Preview this chapter in the demo (does not sign you in)"
            className="press flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl text-[14px] font-bold text-white shadow-lg transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900 motion-reduce:transition-none motion-reduce:active:scale-100"
            style={{ background: `linear-gradient(135deg, ${customPrimary}, ${customSecondary})` }}
          >
            <Palette className="h-4 w-4" aria-hidden="true" /> Preview this chapter{" "}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Explicit path to a REAL chapter — distinct from the preview above so
              the demo and the production onboarding are never conflated. */}
          <a
            href="/onboard"
            className="press flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 motion-reduce:transition-none"
          >
            <Rocket className="h-4 w-4 text-blue-600" aria-hidden="true" /> Launch my real chapter
          </a>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <label
          className="relative h-11 w-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.04]"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={/^#([0-9a-fA-F]{6})$/.test(value) ? value : "#512888"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`${label} picker`}
          />
        </label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#512888"
          className="brand-focus w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {BRAND_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Use color ${c}`}
            aria-pressed={value.toLowerCase() === c.toLowerCase()}
            className={`h-8 w-8 rounded-lg border shadow-sm transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-500 motion-reduce:transition-none motion-reduce:hover:scale-100 ${
              value.toLowerCase() === c.toLowerCase() ? "ring-2 ring-offset-1 ring-slate-900" : "border-black/10"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </Field>
  );
}
