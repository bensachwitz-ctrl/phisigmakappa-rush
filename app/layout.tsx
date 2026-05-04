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
export const metadata: Metadata = {
  title: {
    default: "Phi Sigma Kappa Gamma Triton — Rush at USC",
    template: "%s · Phi Sigma Kappa Gamma Triton",
  },
  description:
    "Phi Sigma Kappa Gamma Triton chapter at the University of South Carolina. Get on the Fall 2026 rush interest list — we'll text you when the schedule drops.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://phisigmakappa.vercel.app"),
  openGraph: {
    title: "Phi Sigma Kappa Gamma Triton — Rush at USC",
    description:
      "Get on the Fall '26 rush interest list — we'll text you when the schedule drops.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Phi Sigma Kappa Gamma Triton — Rush at USC",
    description: "Get on the Fall '26 interest list.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#C8102E",
  width: "device-width",
  initialScale: 1,
};

/**
 * JSON-LD schema graph. Three nodes:
 *   1. Organization (CollegeOrUniversity) — chapter identity for parent
 *      Knowledge Panels and rich-result eligibility
 *   2. WebSite — site-wide search action so Google can offer in-result search
 *   3. PostalAddress — physical chapter house address linked from the org
 *
 * Round-12 holistic critic suggested adding `address`, `logo`, and `WebSite`;
 * R14 ships all three plus expands `sameAs` and adds `foundingLocation`.
 */
const SITE_URL = "https://phisigmakappa.vercel.app";
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollegeOrUniversity",
      "@id": `${SITE_URL}/#organization`,
      name: "Phi Sigma Kappa, Gamma Triton chapter",
      alternateName: ["Phi Sig USC", "ΦΣΚ Gamma Triton"],
      url: SITE_URL,
      logo: `${SITE_URL}/icon`,
      image: `${SITE_URL}/opengraph-image`,
      description:
        "Phi Sigma Kappa Gamma Triton chapter at the University of South Carolina — fraternity rush, philanthropy, brotherhood, and the Three Cardinal Principles since 1975.",
      foundingDate: "1975",
      foundingLocation: {
        "@type": "Place",
        name: "University of South Carolina, Columbia SC",
      },
      parentOrganization: {
        "@type": "Organization",
        name: "Phi Sigma Kappa",
        url: "https://phisigmakappa.org",
        foundingDate: "1873",
      },
      memberOf: {
        "@type": "CollegeOrUniversity",
        name: "University of South Carolina",
        url: "https://sc.edu",
      },
      address: {
        "@type": "PostalAddress",
        streetAddress: "800 Lincoln Street",
        addressLocality: "Columbia",
        addressRegion: "SC",
        postalCode: "29201",
        addressCountry: "US",
      },
      sameAs: [
        "https://www.instagram.com/phisig_usc/",
        "https://phisigmakappa.org",
      ],
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "Recruitment",
          email: "rush@phisig-usc.com",
          areaServed: "US",
          availableLanguage: "English",
        },
        {
          "@type": "ContactPoint",
          contactType: "Anti-hazing report",
          email: "advisor@phisig-usc.com",
          url: "https://hazingprevention.org/help/",
          areaServed: "US",
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Phi Sigma Kappa Gamma Triton — Rush at USC",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    },
  ],
};

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

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        <link rel="manifest" href="/manifest.webmanifest" />
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
