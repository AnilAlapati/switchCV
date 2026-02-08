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
    // Initial check
    const currentConsent = localStorage.getItem(CONSENT_KEY);
    setConsent(currentConsent);

    // Listen for consent changes (when user clicks Accept)
    const handleStorage = () => {
      const newConsent = localStorage.getItem(CONSENT_KEY);
      setConsent(newConsent);
    };

    window.addEventListener("storage", handleStorage);

    // Also listen for manual updates (same tab)
    const interval = setInterval(() => {
      const current = localStorage.getItem(CONSENT_KEY);
      if (current !== consent) {
        setConsent(current);
      }
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [consent]);

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
