import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { getSiteConfig } from "@/lib/site-config";
import { ChapterIdentityProvider } from "@/components/brand/chapter-identity-context";
import { chapterIdentityFromCfg, APEX_IDENTITY } from "@/lib/chapter-identity";
import { getSubdomain } from "@/lib/prisma";
import TelemetryBootstrap from "@/components/site/telemetry-bootstrap";
import { ChatwootWidget } from "@/components/site/chatwoot-widget";
import { GreekLetterField } from "@/components/site/greek-letter-field";

const ALL_FRAT_GLYPHS = [
  "Φ", "Σ", "Κ", "Χ", "Α", "Ω", "Ε", "Β", "Θ", "Π",
  "ΦΣΚ", "ΣΧ", "ΚΣ", "ΑΤΩ", "ΣΑΕ", "ΒΘΠ",
];

// Greekstack marketing-apex branding. Used by every metadata/viewport surface
// when the request has no subdomain (greekstack.vercel.app, localhost,
// www) so NO chapter identity (Phi Sig / Gamma Triton / USC) ever leaks onto
// the apex marketing site.
const GREEKSTACK = {
  title: "Greekstack — chapter rush, roster & TCPA-compliant comms",
  short: "Greekstack",
  description:
    "Greekstack is the white-label platform for Greek-letter chapter recruitment, member management, and TCPA-compliant communications.",
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
  return new URL("https://greekstack.vercel.app");
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
      // Modern cross-browser equivalent of apple-mobile-web-app-capable.
      // Chrome/Android deprecated reading the apple-prefixed tag and warn in the
      // console unless this standard form is also present; iOS still needs the
      // apple- one (emitted by appleWebApp above), so we ship both.
      other: { "mobile-web-app-capable": "yes" },
    };
  }

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const fraternityName = cfg["chapter.fraternityName"] || "Your Chapter";
  const greekLetters = cfg["chapter.greekLetters"] || "";
  const schoolShort = cfg["chapter.schoolShort"] || "";
  const schoolName = cfg["chapter.schoolName"] || "";
  const appShortTitle = cfg["chapter.appShortTitle"] || "Greekstack";
  const chapterFullName = [fraternityName, greekLetters].filter(Boolean).join(" ");
  const titleDefault = schoolShort ? `${chapterFullName} — Rush at ${schoolShort}` : chapterFullName;

  return {
    title: {
      default: titleDefault,
      template: `%s · ${chapterFullName}`,
    },
    description:
      `${chapterFullName}${schoolName ? ` chapter at ${schoolName}` : ""}. Get on the rush interest list — we'll text you when the schedule drops.`,
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
      description: schoolShort ? `Rush ${chapterFullName} at ${schoolShort}.` : `Rush ${chapterFullName}.`,
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
    // Modern cross-browser equivalent of apple-mobile-web-app-capable (see the
    // apex branch above) — silences the Chrome/Android deprecation warning while
    // iOS keeps the apple- tag.
    other: { "mobile-web-app-capable": "yes" },
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
    themeColor = safeHex(cfg["brand.primaryHex"], "#2563eb");
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
  // Neutral fallbacks only — a chapter that hasn't run /admin/setup yet must
  // never emit the reference Phi Sig identity into its JSON-LD. Optional fields
  // are omitted entirely when their cfg value is blank rather than guessed.
  const fraternityName = cfg["chapter.fraternityName"] || "Your Chapter";
  const fraternityShort = cfg["chapter.fraternityShort"] || fraternityName;
  const greekLetters = cfg["chapter.greekLetters"] || "";
  const greekGlyphs = cfg["chapter.greekLettersGlyphs"] || "";
  const schoolName = cfg["chapter.schoolName"] || "";
  const schoolShort = cfg["chapter.schoolShort"] || "";
  const schoolUrl = cfg["chapter.schoolUrl"] || "";
  const charterYear = cfg["chapter.charterYear"] || "";
  const foundingYear = cfg["chapter.foundingYear"] || "";
  const nationalHqUrl = cfg["chapter.nationalHqUrl"] || "";
  // Term-aware identity: motto fallback (Sisterhood/Membership/…) AND member-noun
  // vocabulary so the JSON-LD description re-genders per orgType, never fixed
  // "fraternity / brotherhood".
  const ldIdentity = chapterIdentityFromCfg(cfg);
  const cardinalPrinciples = ldIdentity.cardinalPrinciples;
  const terms = ldIdentity.terms;
  const rushEmail = cfg["contact.rushEmail"] || "";
  const advisorEmail = cfg["contact.advisorEmail"] || "";
  const igUrl = cfg["contact.instagramUrl"] || "";
  const antiHazingUrl = cfg["antiHazing.hotlineUrl"] || "https://hazingprevention.org/help/";

  const addr = parseCityState(cfg["contact.cityState"] || "");

  const chapterFullName = [fraternityName, greekLetters].filter(Boolean).join(" ");
  const descSince = charterYear ? ` since ${charterYear}` : "";
  const descSchool = schoolName ? ` at ${schoolName}` : "";

  const parentOrganization: Record<string, unknown> = {
    "@type": "Organization",
    name: fraternityName,
  };
  if (nationalHqUrl) parentOrganization.url = nationalHqUrl;
  if (foundingYear) parentOrganization.foundingDate = foundingYear;

  const contactPoint: Record<string, unknown>[] = [];
  if (rushEmail) {
    contactPoint.push({
      "@type": "ContactPoint",
      contactType: "Recruitment",
      email: rushEmail,
      areaServed: "US",
      availableLanguage: "English",
    });
  }
  if (advisorEmail) {
    contactPoint.push({
      "@type": "ContactPoint",
      contactType: "Anti-hazing report",
      email: advisorEmail,
      url: antiHazingUrl,
      areaServed: "US",
    });
  }

  const organization: Record<string, unknown> = {
    "@type": "CollegeOrUniversity",
    "@id": `${siteUrl}/#organization`,
    name: greekLetters ? `${fraternityName}, ${greekLetters} chapter` : fraternityName,
    alternateName: [
      [fraternityShort, schoolShort].filter(Boolean).join(" "),
      [greekGlyphs, greekLetters].filter(Boolean).join(" "),
    ].filter(Boolean),
    url: siteUrl,
    logo: `${siteUrl}/icon`,
    image: `${siteUrl}/opengraph-image`,
    description: `${chapterFullName} chapter${descSchool} — ${terms.recruit.toLowerCase()}, philanthropy, ${terms.collective.toLowerCase()}, and ${cardinalPrinciples}${descSince}.`,
    parentOrganization,
    sameAs: [igUrl, nationalHqUrl].filter(Boolean),
    contactPoint,
  };
  if (charterYear) organization.foundingDate = charterYear;
  if (schoolName || addr.city) {
    organization.foundingLocation = {
      "@type": "Place",
      name: [schoolName, [addr.city, addr.region].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    };
  }
  if (schoolName) {
    organization.memberOf = {
      "@type": "CollegeOrUniversity",
      name: schoolName,
      ...(schoolUrl ? { url: schoolUrl } : {}),
    };
  }
  if (cfg["contact.address"] || addr.city) {
    organization.address = {
      "@type": "PostalAddress",
      ...(cfg["contact.address"] ? { streetAddress: cfg["contact.address"] } : {}),
      addressLocality: addr.city,
      addressRegion: addr.region,
      postalCode: addr.postal,
      addressCountry: "US",
    };
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: schoolShort ? `${chapterFullName} — Rush at ${schoolShort}` : chapterFullName,
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
 * Validate an analytics domain (Plausible `data-domain`). Accepts a bare
 * hostname — letters/digits/hyphens in each label, dot-separated, optional
 * port. Strips a pasted scheme/path so "https://x.com/" → "x.com". Returns ""
 * for anything that isn't hostname-shaped, so a malformed or hostile cfg value
 * never reaches the rendered <Script> attributes (defense-in-depth: the value
 * is admin-set, but it lands in HTML).
 */
function safeDomain(input: string | undefined): string {
  if (!input) return "";
  let s = input.trim();
  // Drop a pasted scheme + any path/query the admin may have copied in.
  s = s.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim();
  if (!s) return "";
  // hostname[:port] — each dot-separated label is alphanumeric + internal hyphens.
  if (/^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d{2,5})?$/.test(s)) {
    return s;
  }
  return "";
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
  // Per-chapter brand colors. The DEFAULT is the Greekstack platform royal-blue
  // so the apex + any not-yet-branded chapter stays on-brand (never the old Phi
  // Sig cardinal red, which clashed with the blue marketing site). A real chapter
  // overrides these from /admin/settings → brand.
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const brandPrimary = safeHex(cfg["brand.primaryHex"], "#2563eb");
  const brandPrimaryDark = safeHex(cfg["brand.primaryDarkHex"], "#1e40af");
  const brandPrimarySoft = safeHex(cfg["brand.primarySoftHex"], "#eff6ff");

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

  // OPTIONAL Plausible analytics — INERT by default. Only renders the
  // (cookieless, <1KB) script when the chapter has set a domain in
  // /admin/settings → "analytics.plausibleDomain". safeDomain() rejects
  // anything that isn't a bare hostname so a malformed/hostile cfg value can't
  // inject into the data-domain attribute or the script src. Empty/invalid →
  // no <Script>, no network call, output identical to before.
  const plausibleDomain = safeDomain(cfg["analytics.plausibleDomain"]);

  // JSON-LD built per-request from current cfg so a chapter rename / school
  // change propagates to the Knowledge Panel record without a redeploy. siteUrl
  // resolves from the live request host (never the hardcoded Phi Sig reference
  // host). On the apex we emit a generic Greekstack Organization node instead
  // of the chapter CollegeOrUniversity graph so no chapter identity leaks.
  const host = requestHost();
  const subdomain = getSubdomain(host);
  const isApex = subdomain === null;

  // Resolve global glyphs for GreekLetterField
  let globalGlyphs: string[] | undefined = undefined;
  if (isApex) {
    globalGlyphs = ALL_FRAT_GLYPHS;
  } else {
    const fraternityLetters = cfg["chapter.fraternityLetters"] || "";
    const greekLettersGlyphs = cfg["chapter.greekLettersGlyphs"] || "";
    const singleGlyphs = Array.from(
      new Set(
        `${fraternityLetters}${greekLettersGlyphs}`
          .split("")
          .filter((c) => c.trim()),
      ),
    );
    const monogramGlyphs = Array.from(
      new Set(
        [fraternityLetters, greekLettersGlyphs]
          .map((s) => (s || "").trim())
          .filter((s) => s.length > 1),
      ),
    );
    const chapterGlyphs = [...singleGlyphs, ...monogramGlyphs];
    globalGlyphs = chapterGlyphs.length ? chapterGlyphs : undefined;
  }

  const siteUrl = resolveMetadataBase(host).origin;
  const structuredData =
    isApex
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

  // The full document tree. Auth is the app's own tenant-bound sessions only
  // (admin via lib/auth.ts, member portals via lib/portal-auth.ts) — there is no
  // third-party / social sign-in provider to wrap the tree in.
  const tree = (
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
        {/* OPTIONAL cookieless analytics — only when a chapter configured a
            Plausible domain. Inert (not rendered) by default. */}
        {plausibleDomain && (
          <Script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body>
        <TelemetryBootstrap />
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <ToastProvider>
          <ChapterIdentityProvider value={isApex ? APEX_IDENTITY : chapterIdentityFromCfg(cfg)}>
            <GreekLetterField
              glyphs={globalGlyphs}
              color={isApex ? undefined : "hsl(var(--primary))"}
              calm={!isApex}
              count={isApex ? 44 : 30}
              seed={isApex ? 0x51ed270b : 0x3a7c91d5}
            />
            <main id="main-content">
              {children}
            </main>
          </ChapterIdentityProvider>
        </ToastProvider>
        {/* OPTIONAL Chatwoot live-chat support — a free, self-hostable support
            desk for recruits + members. INERT by default: renders nothing
            unless CHATWOOT_BASE_URL + CHATWOOT_WEBSITE_TOKEN are configured.
            The floating launcher is tinted to the chapter's brand color. */}
        <ChatwootWidget launcherColor={brandPrimary} />
      </body>
    </html>
  );

  return tree;
}
