import type { Metadata } from "next";
import "@/lib/env"; // Validates environment variables on startup
import { Geist, Geist_Mono, Merriweather } from "next/font/google"; // 1. Import Merriweather
import "./globals.css";
import { ConnectivityStatusProvider } from "@/context/ConnectivityStatusProvider";
import { IntlProvider } from "@/components/providers/IntlProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 2. Configure Merriweather
const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://switchcv.com"),
  title: "SwitchCV - The Autonomous Career Agent Platform",
  description:
    "Hire an AI agent to build, optimize, and track your living resume. Privacy-first career growth powered by agentic intelligence.",
};

import { headers } from "next/headers";

// ... existing imports ...

import { Suspense } from "react";
import { ConfigLoader } from "@/components/layout/ConfigLoader";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read nonce from headers (set by middleware)
  const nonce = (await headers()).get("x-nonce") || undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${merriweather.variable} antialiased`}
        suppressHydrationWarning
      >
        <IntlProvider>
          <ConnectivityStatusProvider>
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#FFFFF8]">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-black/10 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-emerald-900/60 font-medium animate-pulse">
                      SwitchCV is preparing...
                    </p>
                  </div>
                </div>
              }
            >
              <ConfigLoader nonce={nonce}>{children}</ConfigLoader>
            </Suspense>
          </ConnectivityStatusProvider>
        </IntlProvider>
      </body>
    </html>
  );
}
