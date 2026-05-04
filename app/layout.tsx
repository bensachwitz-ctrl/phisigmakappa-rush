import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Phi Sigma Kappa Gamma Triton — Rush at USC",
    template: "%s · Phi Sigma Kappa Gamma Triton",
  },
  description:
    "Phi Sigma Kappa Gamma Triton at the University of South Carolina. 60+ brothers, 3.45 chapter GPA, founded 1873 nationally. Get on the Fall 2026 rush interest list.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://phisigmakappa.vercel.app"),
  openGraph: {
    title: "Phi Sigma Kappa Gamma Triton — Rush at USC",
    description:
      "60+ brothers · 3.45 chapter GPA · Founded 1873. Get on the Fall '26 rush interest list — we'll text you when the schedule drops.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Phi Sigma Kappa Gamma Triton — Rush at USC",
    description: "60+ brothers · 3.45 GPA · Founded 1873. Get on the Fall '26 interest list.",
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
