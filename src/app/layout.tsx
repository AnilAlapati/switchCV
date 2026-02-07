import type { Metadata } from "next";
import "@/lib/env"; // Validates environment variables on startup
import { Geist, Geist_Mono, Merriweather } from "next/font/google"; // 1. Import Merriweather
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { ConnectivityStatusProvider } from "@/context/ConnectivityStatusProvider";
import { SystemConfigProvider } from "@/context/SystemConfigProvider";
import { BlockingGuard } from "@/components/layout/BlockingGuard";
import { Footer } from "@/components/layout/Footer";
import { MaintenanceBanner } from "@/components/layout/MaintenanceBanner";
import { DevModeBanner } from "@/components/dev/DevModeBanner";
import { SWRProvider } from "@/components/providers/SWRProvider";
import { IntlProvider } from "@/components/providers/IntlProvider";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@next/third-parties/google";
import { BetaBadge } from "@/components/layout/BetaBadge";
import { MobileNotice } from "@/components/layout/MobileNotice";
import { getSystemConfig } from "@/lib/getSystemConfig";
import { MaintenancePage } from "@/components/layout/MaintenancePage";

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
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL("https://switchcv.com"),
  title: "SwitchCV - The Autonomous Career Agent Platform",
  description:
    "Hire an AI agent to build, optimize, and track your living resume. Privacy-first career growth powered by agentic intelligence.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getSystemConfig();
  const isMaintenance = config.maintenance.isActive && config.maintenance.blocking;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${merriweather.variable} antialiased`}
        suppressHydrationWarning
      >
        <IntlProvider>
          <ConnectivityStatusProvider>
            <SystemConfigProvider initialConfig={config}>
              {isMaintenance ? (
                <MaintenancePage />
              ) : (
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
                      <MobileNotice />
                    </SWRProvider>
                  </AuthProvider>
                </BlockingGuard>
              )}
            </SystemConfigProvider>
          </ConnectivityStatusProvider>
        </IntlProvider>
      </body>
      {process.env.NODE_ENV === "production" &&
        process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
    </html>
  );
}
