import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { ConnectivityStatusProvider } from "@/context/ConnectivityStatusProvider";
import { Footer } from "@/components/layout/Footer";
import { DevModeBanner } from "@/components/dev/DevModeBanner";

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
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <div className="flex-1">{children}</div>
              <Footer />
            </div>
            <DevModeBanner />
          </AuthProvider>
        </ConnectivityStatusProvider>
      </body>
    </html>
  );
}
