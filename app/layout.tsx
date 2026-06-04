import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { getSiteConfig } from "@/lib/site-config";
import { ChapterIdentityProvider } from "@/components/brand/chapter-identity-context";
import { chapterIdentityFromCfg, APEX_IDENTITY } from "@/lib/chapter-identity";
import { getSubdomain } from "@/lib/prisma";

// Greekstack marketing-apex branding. Used by every metadata/viewport surface
// when the request has no subdomain (greeklifesystems.vercel.app, localhost,
// www) so NO chapter identity (Phi Sig / Gamma Triton / USC) ever leaks onto
// the apex marketing site.
const GREEKSTACK = {
  title: "Greekstack — chapter rush, roster & TCPA-compliant comms",
  short: "Greekstack",
  description:
    "Greekstack is the white-label platform for Greek-letter chapter rush, brotherhood management, and TCPA-compliant communications.",
  themeColor: "#0F172A",
};

/** Current request host (server-only). Null outside a request context. */
function requestHost(): string | null {
  try {
    const h = headers();
    return h.get("host") || h.get("x-forwarded-host") || null;
  } catch {
    return null;
  }
}

/**
 * Resolve metadataBase from the live request host so each tenant's OG/Twitter
 * URLs are absolute against THEIR domain, falling back to the configured site
 * URL and finally the apex. Never hardcodes the Phi Sig reference host.
 */
function resolveMetadataBase(host: string | null): URL {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_SITE_URL);
    } catch {
      /* fall through */
    }
  }
  if (host) {
    const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
    try {
      return new URL(`${proto}://${host}`);
    } catch {
      /* fall through */
    }
  }
  return new URL("https://greeklifesystems.vercel.app");
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Layout-level metadata is the global FALLBACK only (any non-homepage route
// that doesn't define its own). The homepage exports generateMetadata() in
// app/page.tsx that reads cfg so the description / OG / Twitter tags pull
// the LATEST admin-edited stats and headline copy. Keep these strings
// evergreen — no specific numbers — so admin edits to stats don't go stale here.
//
// generateMetadata() reads from the SiteConfig table so chapter-identity
// edits in /admin/settings → "Chapter identity" propagate to every page's
// <title>, social-share card, and iOS launcher caption WITHOUT a code deploy.
// Net-new chapter spinning up the platform fills out /admin/setup once and
// every <title> in the build re-brands to match.
export async function generateMetadata(): Promise<Metadata> {
  const host = requestHost();
  const metadataBase = resolveMetadataBase(host);

  // Apex (no subdomain) → generic Greekstack metadata, zero chapter identity.
  if (getSubdomain(host) === null) {
    return {
      title: {
        default: GREEKSTACK.title,
        template: `%s · ${GREEKSTACK.short}`,
      },
      description: GREEKSTACK.description,
      metadataBase,
      openGraph: { title: GREEKSTACK.title, description: GREEKSTACK.description, type: "website", url: "/" },
      twitter: { card: "summary_large_image", title: GREEKSTACK.title, description: GREEKSTACK.description },
      robots: { index: true, follow: true },
      appleWebApp: { capable: true, title: GREEKSTACK.short, statusBarStyle: "black-translucent" },
    };
  }

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const fraternityName = cfg["chapter.fraternityName"] || "Phi Sigma Kappa";
  const greekLetters = cfg["chapter.greekLetters"] || "Gamma Triton";
  const schoolShort = cfg["chapter.schoolShort"] || "USC";
  const schoolName = cfg["chapter.schoolName"] || "University of South Carolina";
  const appShortTitle = cfg["chapter.appShortTitle"] || "Phi Sig USC";
  const chapterFullName = `${fraternityName} ${greekLetters}`;
  const titleDefault = `${chapterFullName} — Rush at ${schoolShort}`;

  return {
    title: {
      default: titleDefault,
      template: `%s · ${chapterFullName}`,
    },
    description:
      `${chapterFullName} chapter at ${schoolName}. Get on the rush interest list — we'll text you when the schedule drops.`,
    metadataBase,
    openGraph: {
      title: titleDefault,
      description: `Get on the rush interest list at ${chapterFullName} — we'll text you when the schedule drops.`,
      type: "website",
      url: "/",
    },
    twitter: {
      card: "summary_large_image",
      title: titleDefault,
      description: `Rush ${chapterFullName} at ${schoolShort}.`,
    },
    robots: { index: true, follow: true },
    // iOS Safari "Add to Home Screen" — without these, a bookmarked icon
    // launches in-Safari with the URL bar visible instead of full-screen.
    // The manifest's display:standalone is honored only by Android; iOS uses
    // these legacy meta tags. Title is the launcher caption (≤12 chars
    // recommended) — admin-configurable so a re-brand updates the launcher.
    appleWebApp: {
      capable: true,
      title: appShortTitle,
      // "black-translucent" lets the brand theme color bleed under the iOS
      // status bar instead of leaving a stark white strip above the nav.
      statusBarStyle: "black-translucent",
    },
  };
}

// generateViewport (was a static export) so themeColor follows the tenant's
// brand color — and on the apex falls back to Greekstack navy, never Phi Sig
// cardinal red. iOS paints the status-bar/PWA chrome from this value.
export async function generateViewport(): Promise<Viewport> {
  const host = requestHost();
  let themeColor = GREEKSTACK.themeColor;
  if (getSubdomain(host) !== null) {
    const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
    themeColor = safeHex(cfg["brand.primaryHex"], "#C8102E");
  }
  return {
    themeColor,
    width: "device-width",
    initialScale: 1,
    // iOS Safari: when the on-screen keyboard slides up over a focused form
    // input, the visual viewport stays the same size so position:fixed
    // bottom-nav floats over the focused field. interactive-widget=
    // "resizes-content" tells iOS to actually shrink the layout viewport
    // under the keyboard, so the bottom nav scrolls with the content and
    // doesn't occlude the input the user is typing into.
    interactiveWidget: "resizes-content",
  };
}

/**
 * JSON-LD schema graph. Three nodes:
 *   1. Organization (CollegeOrUniversity) — chapter identity for parent
 *      Knowledge Panels and rich-result eligibility
 *   2. WebSite — site-wide search action so Google can offer in-result search
 *   3. PostalAddress — physical chapter house address linked from the org
 *
 * Every field reads from SiteConfig so a re-brand for another chapter (Beta
 * Sigma @ Maryland, etc.) updates the Knowledge Panel record without code
 * changes. Falls back to the USC reference values if a field is unset.
 *
 * Address fields are parsed from the visible contact.address / contact.cityState
 * so the JSON-LD pin and the rendered "Where we live" address always match
 * (a mismatch gets the chapter the wrong pin in Google's Knowledge Panel).
 */
function parseCityState(cityState: string): { city: string; region: string; postal: string } {
  // "Columbia, SC 29208" → { city: "Columbia", region: "SC", postal: "29208" }
  // Defensive — handles missing comma, missing zip, extra whitespace.
  const m = (cityState || "").trim().match(/^(.+?)\s*,\s*([A-Z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/);
  return {
    city: m?.[1] || cityState || "",
    region: m?.[2] || "",
    postal: m?.[3] || "",
  };
}

function buildStructuredData(cfg: Record<string, string>, siteUrl: string) {
  const fraternityName = cfg["chapter.fraternityName"] || "Phi Sigma Kappa";
  const fraternityShort = cfg["chapter.fraternityShort"] || "Phi Sig";
  const greekLetters = cfg["chapter.greekLetters"] || "Gamma Triton";
  const greekGlyphs = cfg["chapter.greekLettersGlyphs"] || "ΦΣΚ";
  const schoolName = cfg["chapter.schoolName"] || "University of South Carolina";
  const schoolShort = cfg["chapter.schoolShort"] || "USC";
  const schoolUrl = cfg["chapter.schoolUrl"] || "https://sc.edu";
  const charterYear = cfg["chapter.charterYear"] || "1975";
  const foundingYear = cfg["chapter.foundingYear"] || "1873";
  const nationalHqUrl = cfg["chapter.nationalHqUrl"] || "https://phisigmakappa.org";
  const cardinalPrinciples = cfg["chapter.cardinalPrinciples"] || "Brotherhood, Scholarship, Character";
  const rushEmail = cfg["contact.rushEmail"] || "rush@phisig-usc.com";
  const advisorEmail = cfg["contact.advisorEmail"] || "advisor@phisig-usc.com";
  const igUrl = cfg["contact.instagramUrl"] || "https://www.instagram.com/phisig_usc/";
  const antiHazingUrl = cfg["antiHazing.hotlineUrl"] || "https://hazingprevention.org/help/";

  const addr = parseCityState(cfg["contact.cityState"] || "Columbia, SC 29208");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollegeOrUniversity",
        "@id": `${siteUrl}/#organization`,
        name: `${fraternityName}, ${greekLetters} chapter`,
        alternateName: [`${fraternityShort} ${schoolShort}`, `${greekGlyphs} ${greekLetters}`],
        url: siteUrl,
        logo: `${siteUrl}/icon`,
        image: `${siteUrl}/opengraph-image`,
        description: `${fraternityName} ${greekLetters} chapter at ${schoolName} — fraternity rush, philanthropy, brotherhood, and ${cardinalPrinciples} since ${charterYear}.`,
        foundingDate: charterYear,
        foundingLocation: {
          "@type": "Place",
          name: `${schoolName}, ${addr.city} ${addr.region}`,
        },
        parentOrganization: {
          "@type": "Organization",
          name: fraternityName,
          url: nationalHqUrl,
          foundingDate: foundingYear,
        },
        memberOf: {
          "@type": "CollegeOrUniversity",
          name: schoolName,
          url: schoolUrl,
        },
        address: {
          "@type": "PostalAddress",
          streetAddress: cfg["contact.address"] || "1525 College Street",
          addressLocality: addr.city,
          addressRegion: addr.region,
          postalCode: addr.postal,
          addressCountry: "US",
        },
        sameAs: [igUrl, nationalHqUrl].filter(Boolean),
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "Recruitment",
            email: rushEmail,
            areaServed: "US",
            availableLanguage: "English",
          },
          {
            "@type": "ContactPoint",
            contactType: "Anti-hazing report",
            email: advisorEmail,
            url: antiHazingUrl,
            areaServed: "US",
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: `${fraternityName} ${greekLetters} — Rush at ${schoolShort}`,
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en-US",
      },
    ],
  };
}

/**
 * Validate a hex color string (#RGB or #RRGGBB). Defends against admin
 * pasting `red`, `https://...`, JS, or anything that would inject through
 * the inline <style> tag.
 */
function safeHex(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  const trimmed = input.trim();
  if (/^#([0-9a-fA-F]{3}){1,2}$/.test(trimmed)) return trimmed;
  return fallback;
}

/**
 * Convert a validated hex color (#RGB or #RRGGBB) to a space-separated HSL
 * triple ("351 76% 42%") for the shadcn-style `--primary` / `--ring` tokens.
 *
 * Tailwind's hsl(var(--primary)/<alpha>) tokens — and every shared-foundation
 * component that themes via `tone="brand"` (AnimatedBackground, IconChip) —
 * read --primary as a bare HSL triple, NOT a hex. The brand tokens
 * (--brand-primary*) are hex. Without this, --primary stayed the static
 * cardinal default while the chapter recolored only the hex tokens, so a
 * navy/gold chapter would have shown a cardinal-red aurora behind navy copy.
 * Deriving --primary from the SAME cfg hex keeps tone="brand" perfectly in
 * step with the chapter color, for any color. Input is always safeHex-validated.
 */
function hexToHslTriple(hex: string): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hue = 0;
  let sat = 0;
  const d = max - min;
  if (d !== 0) {
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        hue = (b - r) / d + 2;
        break;
      default:
        hue = (r - g) / d + 4;
    }
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(l * 100)}%`;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Per-chapter brand colors. Defaults match the reference Phi Sig Gamma Triton
  // build (cardinal red). Admin can override from /admin/settings → brand.
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const brandPrimary = safeHex(cfg["brand.primaryHex"], "#C8102E");
  const brandPrimaryDark = safeHex(cfg["brand.primaryDarkHex"], "#A20D26");
  const brandPrimarySoft = safeHex(cfg["brand.primarySoftHex"], "#FCEFF1");

  // Inline CSS override binds the cfg-supplied colors to the same Tailwind
  // tokens (--phisig-red et al) used throughout the build. No client JS,
  // no FOUC, no rebuild needed when admin saves.
  // Also re-derive the shadcn HSL tokens (--primary / --ring) from the SAME
  // chapter hex so the shared-foundation components themed via tone="brand"
  // (AnimatedBackground aurora, IconChip) track the chapter color instead of
  // the static cardinal default. --primary-foreground stays white (all brand
  // ramps are dark enough for white text on the gradient CTA / stats strip).
  const brandPrimaryHsl = hexToHslTriple(brandPrimary);
  const themeStyle = `:root{--brand-primary:${brandPrimary};--brand-primary-dark:${brandPrimaryDark};--brand-primary-soft:${brandPrimarySoft};--primary:${brandPrimaryHsl};--ring:${brandPrimaryHsl};}`;

  // JSON-LD built per-request from current cfg so a chapter rename / school
  // change propagates to the Knowledge Panel record without a redeploy. siteUrl
  // resolves from the live request host (never the hardcoded Phi Sig reference
  // host). On the apex we emit a generic Greekstack Organization node instead
  // of the chapter CollegeOrUniversity graph so no chapter identity leaks.
  const host = requestHost();
  const siteUrl = resolveMetadataBase(host).origin;
  const structuredData =
    getSubdomain(host) === null
      ? {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${siteUrl}/#organization`,
              name: GREEKSTACK.short,
              url: siteUrl,
              description: GREEKSTACK.description,
            },
            {
              "@type": "WebSite",
              "@id": `${siteUrl}/#website`,
              url: siteUrl,
              name: GREEKSTACK.title,
              publisher: { "@id": `${siteUrl}/#organization` },
              inLanguage: "en-US",
            },
          ],
        }
      : buildStructuredData(cfg, siteUrl);

  // Serialize + escape <, >, & so a cfg value containing "</script>" cannot break
  // out of the ld+json <script> tag (stored XSS — e.g. an admin saving a chapter
  // name of "Foo</script><script>…"). The \u00xx escapes are valid JSON and parse
  // back to the identical string for search crawlers.
  const structuredDataJson = JSON.stringify(structuredData)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredDataJson }}
        />
        <link rel="manifest" href="/manifest.webmanifest" />
        {/* Preconnect to Instagram CDN — every IG photo on the homepage proxies
            through /api/photo/[slug] which ultimately fetches from these
            origins. Pre-warming the TLS handshake on initial paint trims a few
            hundred ms off the first IG tile's TTFB. */}
        <link rel="preconnect" href="https://www.instagram.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://scontent.cdninstagram.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://scontent.cdninstagram.com" />
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      </head>
      <body>
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <ToastProvider>
          <ChapterIdentityProvider value={getSubdomain(host) === null ? APEX_IDENTITY : chapterIdentityFromCfg(cfg)}>
            {children}
          </ChapterIdentityProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
