import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import tabLogo from "@/images/tab-logo.png";
import socialPreview from "@/images/Light mode horizontal.png";

import "./globals.css";
import Providers from "./providers";
import Header from "./components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fallbackSiteUrl = "http://localhost:3000";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? fallbackSiteUrl;
const metadataBase = new URL(siteUrl);
const socialPreviewUrl = new URL(socialPreview.src, metadataBase).toString();

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "RedFlag | AI-Powered Sui Contract Risk Intelligence",
    template: "%s | RedFlag",
  },
  applicationName: "RedFlag",
  description:
    "RedFlag monitors Sui smart contracts with multi-agent LLM analysis, prioritizing risks before they hit production.",
  keywords: [
    "RedFlag",
    "Sui",
    "smart contract",
    "risk analysis",
    "LLM",
    "security",
    "Supabase",
    "Gemini",
  ],
  authors: [
    {
      name: "RedFlag Team",
      url: "https://github.com/mertkaradayi/redflag",
    },
  ],
  creator: "RedFlag",
  icons: {
    icon: [
      {
        url: tabLogo.src,
        type: "image/png",
      },
    ],
    shortcut: [
      {
        url: tabLogo.src,
        type: "image/png",
      },
    ],
    apple: [
      {
        url: tabLogo.src,
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title: "RedFlag | AI-Powered Sui Contract Risk Intelligence",
    description:
      "Proactively monitor Sui Move deployments with RedFlag's multi-agent Gemini pipeline, Supabase telemetry, and live dashboards.",
    siteName: "RedFlag",
    url: siteUrl,
    type: "website",
    images: [
      {
        url: socialPreviewUrl,
        width: socialPreview.width,
        height: socialPreview.height,
        alt: "RedFlag horizontal logo on a light background",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RedFlag | AI-Powered Sui Contract Risk Intelligence",
    description:
      "red flag sees every contract the moment it appears on Sui — automatic, hands-off, unstoppable. every deployment is instantly flagged and analyzed by ai agents that scan, interpret, and assess risk in real time. you deploy. it inspects. simple.",
    images: [socialPreviewUrl],
    creator: "@imertkaradayi",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center">
              <div className="pointer-events-auto mt-6 flex w-full max-w-6xl mx-auto px-4 sm:mt-8 sm:px-8 lg:mt-10 lg:px-16">
                <Header />
              </div>
            </div>
            <main className="flex-1 overflow-x-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))] pt-28 transition-colors duration-200 dark:bg-gradient-to-b dark:from-black dark:via-zinc-950 dark:to-black sm:pt-32 lg:pt-36">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
