import type { Metadata } from "next";
import "@/lib/env"; // Validates environment variables on startup
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { ConnectivityStatusProvider } from "@/context/ConnectivityStatusProvider";
import { SystemConfigProvider } from "@/context/SystemConfigProvider";
import { BlockingGuard } from "@/components/layout/BlockingGuard";
import { Footer } from "@/components/layout/Footer";
import { MaintenanceBanner } from "@/components/layout/MaintenanceBanner";
import { DevModeBanner } from "@/components/dev/DevModeBanner";
import { SWRProvider } from "@/components/providers/SWRProvider";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@next/third-parties/google";
import { BetaBadge } from "@/components/layout/BetaBadge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://switchcv.com"),
  title: "SwitchCV - Privacy-First Living Resume Platform",
  description:
    "Create and share your professional resume with privacy controls and AI-powered polishing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConnectivityStatusProvider>
          <SystemConfigProvider>
            <BlockingGuard>
              <AuthProvider>
                <SWRProvider>
                  <Toaster
                    position="top-right"
                    richColors
                    closeButton
                    theme="dark"
                  />
                  <MaintenanceBanner />
                  <div className="flex min-h-screen flex-col">
                    <div className="flex-1">{children}</div>
                    <Footer />
                  </div>
                  <DevModeBanner />
                  <BetaBadge />
                </SWRProvider>
              </AuthProvider>
            </BlockingGuard>
          </SystemConfigProvider>
        </ConnectivityStatusProvider>
      </body>
      {process.env.NODE_ENV === "production" &&
        process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
    </html>
  );
}
