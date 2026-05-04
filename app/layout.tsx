import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

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
 * JSON-LD Organization schema. Helps Google rich results, Knowledge Panel,
 * and parent-side trust signals (verified org card in search).
 */
const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "CollegeOrUniversity",
  "@id": "https://phisigmakappa.vercel.app/#organization",
  name: "Phi Sigma Kappa, Gamma Triton chapter",
  alternateName: "Phi Sig USC",
  url: "https://phisigmakappa.vercel.app",
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
  foundingDate: "1975",
  sameAs: [
    "https://www.instagram.com/phisig_usc/",
    "https://phisigmakappa.org",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Recruitment",
    email: "rush@phisig-usc.com",
    areaServed: "US",
    availableLanguage: "English",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
