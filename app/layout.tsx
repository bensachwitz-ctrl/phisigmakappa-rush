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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
