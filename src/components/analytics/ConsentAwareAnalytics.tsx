"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const CONSENT_KEY = "switchcv_cookie_consent";

interface ConsentAwareAnalyticsProps {
  nonce?: string;
}

/**
 * Conditionally loads Google Analytics only if user has accepted cookies.
 * Reads localStorage on mount to check consent before rendering GA.
 */
export function ConsentAwareAnalytics({ nonce }: ConsentAwareAnalyticsProps) {
  const [showGA, setShowGA] = useState(false);
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  useEffect(() => {
    // Check localStorage on client-side only
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === "accepted") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowGA((prev) => (prev ? prev : true));
    }

    // Listen for consent changes (when user clicks Accept)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_KEY) {
        setShowGA(e.newValue === "accepted");
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Only render GA if user accepted and we have a GA ID
  if (
    process.env.NODE_ENV !== "production" ||
    !gaId ||
    !showGA
  ) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="google-analytics" strategy="afterInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
