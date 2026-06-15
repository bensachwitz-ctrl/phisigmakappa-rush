import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { getSubdomain } from "@/lib/prisma";

// NODE runtime: the maskable icon is now per-tenant and reads getSiteConfig()
// through the tenant-aware Prisma proxy, which needs nodejs (edge can't).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeHex(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  const t = input.trim();
  return /^#([0-9a-fA-F]{3}){1,2}$/.test(t) ? t : fallback;
}

/**
 * Maskable PWA icon — 512×512 with extra padding so Android's adaptive-icon
 * launchers can clip into circles, squares, squircles, or teardrops without
 * cutting off the mark. The "safe zone" per https://web.dev/maskable-icon/ is
 * the central 80% (≈410px circle), so the glyph is sized to sit comfortably
 * within that radius.
 *
 * PER-TENANT, like the manifest + OG card:
 *   • On the Greekstack marketing APEX (no subdomain) it renders the neutral,
 *     bespoke GreekStack mark — a navy Greek temple/pediment reversed in a warm
 *     gold disc — so no chapter identity leaks onto the apex install.
 *   • On a CHAPTER tenant it renders that chapter's Greek letters in that
 *     chapter's own brand color, so the installed PWA matches the chapter the
 *     member actually signed into.
 *
 * Previously this route hard-coded "ΦΣΚ" on a cardinal-red gradient, which
 * leaked one specific chapter's identity onto the apex AND onto every other
 * chapter's tenant — a white-label break for a product whose flagship promise
 * is "re-skins to your chapter in seconds."
 */
export async function GET() {
  let host = "";
  try {
    host = headers().get("host") || headers().get("x-forwarded-host") || "";
  } catch {}
  const onApex = getSubdomain(host) === null;

  // ── APEX: the neutral bespoke GreekStack temple mark ────────────────────────
  // Navy pediment + four columns (the canonical GreekStack glyph) reversed in a
  // warm gold disc, centered inside the maskable safe zone.
  if (onApex) {
    const NAVY = "#0F2350"; // brand deep navy ink
    const GOLD = "#F59E0B"; // brand gold
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(140deg, #122A63 0%, #0A1838 100%)",
          }}
        >
          {/* gold disc within the safe zone */}
          <div
            style={{
              width: 360,
              height: 360,
              borderRadius: 360,
              background: `linear-gradient(150deg, #FBBF24 0%, ${GOLD} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* bespoke GreekStack temple: pediment + four columns + base */}
            <svg width="210" height="210" viewBox="0 0 24 24" fill="none">
              {/* pediment */}
              <path d="M2.6 8.6 12 3.2l9.4 5.4H2.6Z" fill={NAVY} />
              {/* entablature */}
              <rect x="3.4" y="9.4" width="17.2" height="1.7" rx="0.5" fill={NAVY} />
              {/* four columns */}
              <rect x="4.6" y="11.4" width="1.9" height="6.2" rx="0.4" fill={NAVY} />
              <rect x="8.4" y="11.4" width="1.9" height="6.2" rx="0.4" fill={NAVY} />
              <rect x="13.7" y="11.4" width="1.9" height="6.2" rx="0.4" fill={NAVY} />
              <rect x="17.5" y="11.4" width="1.9" height="6.2" rx="0.4" fill={NAVY} />
              {/* stylobate / base */}
              <rect x="3.4" y="17.9" width="17.2" height="1.9" rx="0.6" fill={NAVY} />
            </svg>
          </div>
        </div>
      ),
      { width: 512, height: 512 }
    );
  }

  // ── CHAPTER tenant: the chapter's letters in the chapter's brand color ──────
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const id = chapterIdentityFromCfg(cfg);
  // Prefer the compact fraternity glyphs (e.g. "ΦΣΚ"); fall back to chapter
  // glyphs, then to the platform "GS" so we never render an empty disc.
  const glyphs =
    (id.fraternityLetters && id.fraternityLetters.trim()) ||
    (id.greekLettersGlyphs && id.greekLettersGlyphs.trim()) ||
    "GS";
  const primary = safeHex(cfg["brand.primaryHex"], "#2563EB");
  const primaryDark = safeHex(cfg["brand.primaryDarkHex"], primary);
  // Scale type down a touch as the glyph string gets longer so 4-letter marks
  // still fit inside the safe zone.
  const fontSize = glyphs.length >= 4 ? 150 : glyphs.length === 3 ? 178 : 210;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`,
          color: "white",
          fontFamily: "Georgia, serif",
          fontWeight: 700,
          fontSize,
          letterSpacing: -4,
        }}
      >
        {glyphs}
      </div>
    ),
    { width: 512, height: 512 }
  );
}
