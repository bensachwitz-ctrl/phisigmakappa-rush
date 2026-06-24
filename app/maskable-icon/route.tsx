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
  // The canonical elevated temple (capitals + bases + gold cornice/medallion/
  // architrave/floor + stepped stylobate) reversed in a warm gold disc, centered
  // inside the maskable safe zone. SAME geometry as brand/greekstack-seal.svg,
  // <GreekstackLogo>, app/icon.png, and the mobile-shell crest — one mark.
  if (onApex) {
    const NAVY = "#0F2350"; // brand deep navy ink (temple)
    const GOLD = "#E8B53A"; // brand gold (restrained accents)
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
              background: `linear-gradient(150deg, #FBBF24 0%, #F59E0B 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* canonical elevated temple, drawn on the 100-unit grid (the seal
                geometry) and centered in the disc. Navy temple + gold accents;
                the medallion/cornice/floor gold reads against the navy. */}
            <svg width="248" height="248" viewBox="0 0 100 100" fill="none">
              <g fill={NAVY}>
                {/* pediment */}
                <path d="M16 44 L50 22 L84 44 Z" />
                {/* entablature */}
                <rect x="14" y="46.5" width="72" height="5" rx="1" />
                {/* four columns — capital + shaft + base */}
                <rect x="21.5" y="52.5" width="9" height="2.2" rx="0.6" />
                <rect x="23" y="54.7" width="6" height="15" />
                <rect x="21.5" y="69.7" width="9" height="2.3" rx="0.6" />
                <rect x="37.5" y="52.5" width="9" height="2.2" rx="0.6" />
                <rect x="39" y="54.7" width="6" height="15" />
                <rect x="37.5" y="69.7" width="9" height="2.3" rx="0.6" />
                <rect x="53.5" y="52.5" width="9" height="2.2" rx="0.6" />
                <rect x="55" y="54.7" width="6" height="15" />
                <rect x="53.5" y="69.7" width="9" height="2.3" rx="0.6" />
                <rect x="69.5" y="52.5" width="9" height="2.2" rx="0.6" />
                <rect x="71" y="54.7" width="6" height="15" />
                <rect x="69.5" y="69.7" width="9" height="2.3" rx="0.6" />
                {/* stepped stylobate (2 steps) */}
                <rect x="18" y="72.5" width="64" height="3.2" rx="0.8" />
                <rect x="13" y="76.2" width="74" height="3.4" rx="0.8" />
              </g>
              <g fill={GOLD}>
                {/* gold cornice under the pediment */}
                <rect x="14" y="43.4" width="72" height="2" rx="1" />
                {/* gold medallion (oculus) in the tympanum */}
                <circle cx="50" cy="36" r="3" />
                {/* gold architrave line on the entablature */}
                <rect x="16" y="51" width="68" height="1" />
                {/* gold floor line under the stylobate */}
                <rect x="13" y="79.9" width="74" height="1.1" />
              </g>
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
