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
    default: "Phi Sigma Kappa @ USC — Rush",
    template: "%s · Phi Sigma Kappa USC",
  },
  description:
    "Rush Phi Sigma Kappa at the University of South Carolina. Sign up for events, meet the brothers, and find your home.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://phisigmakappa.vercel.app"),
  openGraph: {
    title: "Phi Sigma Kappa @ USC — Rush",
    description:
      "Sign up for rush events and meet the brothers of Phi Sigma Kappa at USC.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Phi Sigma Kappa @ USC — Rush",
    description: "Sign up for rush events and meet the brothers.",
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
