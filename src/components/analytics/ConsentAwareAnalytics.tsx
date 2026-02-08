"use client";

import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

const CONSENT_KEY = "switchcv_cookie_consent";

/**
 * Conditionally loads Google Analytics only if user has accepted cookies.
 * Re-checks when consent changes (user clicks Accept in the banner).
 */
export function ConsentAwareAnalytics() {
  const [consent, setConsent] = useState<string | null>(null);

  useEffect(() => {
    // Set initial consent value from localStorage
    const initialConsent = localStorage.getItem(CONSENT_KEY);
    setConsent(initialConsent);

    // Listen for consent changes (when user clicks Accept in another tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_KEY) {
        setConsent(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);
  // Only render GA if user accepted and we have a GA ID
  if (
    process.env.NODE_ENV !== "production" ||
    !process.env.NEXT_PUBLIC_GA_ID ||
    consent !== "accepted"
  ) {
    return null;
  }

  return <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />;
}
