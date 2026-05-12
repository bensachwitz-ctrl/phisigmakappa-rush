import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { getSiteConfig } from "@/lib/site-config";

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
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://phisigmakappa.vercel.app"),
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

export const viewport: Viewport = {
  themeColor: "#C8102E",
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
  const themeStyle = `:root{--brand-primary:${brandPrimary};--brand-primary-dark:${brandPrimaryDark};--brand-primary-soft:${brandPrimarySoft};}`;

  // JSON-LD built per-request from current cfg so a chapter rename / school
  // change propagates to the Knowledge Panel record without a redeploy.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://phisigmakappa.vercel.app";
  const structuredData = buildStructuredData(cfg, siteUrl);

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
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
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
