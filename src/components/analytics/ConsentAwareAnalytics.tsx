"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

const CONSENT_KEY = "switchcv_cookie_consent";

/**
 * Conditionally loads Google Analytics only if user has accepted cookies.
 * Reads localStorage on mount to check consent before rendering GA.
 */
export function ConsentAwareAnalytics() {
  const [showGA, setShowGA] = useState(false);

  useEffect(() => {
    // Check localStorage on client-side only
    const consent = localStorage.getItem(CONSENT_KEY);
    setShowGA(consent === "accepted");

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
    !process.env.NEXT_PUBLIC_GA_ID ||
    !showGA
  ) {
    return null;
  }

  return <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />;
}
