"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";

const CONSENT_KEY = "switchcv_cookie_consent";

function getConsentSnapshot(): string | null {
  return localStorage.getItem(CONSENT_KEY);
}

function getServerSnapshot(): string | null {
  return "loading"; // Server-side: treat as loading (don't render banner)
}

// Notification mechanism for useSyncExternalStore
let listeners: Array<() => void> = [];
function subscribe(callback: () => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}
function notifyListeners() {
  listeners.forEach((l) => l());
}

/**
 * Cookie consent banner — EU ePrivacy Directive compliance.
 * Controls analytics/tracking cookies (PostHog, GA, Sentry).
 * Essential cookies (auth) are always allowed.
 */
export function CookieConsentBanner() {
  const consent = useSyncExternalStore(
    subscribe,
    getConsentSnapshot,
    getServerSnapshot,
  );

  const handleAccept = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    notifyListeners();
  }, []);

  const handleDecline = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "declined");
    // Signal to PostHog/GA to stop tracking
    if (typeof window !== "undefined") {
      (window as Record<string, unknown>).__switchcv_tracking_disabled = true;
    }
    notifyListeners();
  }, []);

  // Don't render: server-side ("loading"), or user already responded
  if (
    consent === "loading" ||
    consent === "accepted" ||
    consent === "declined"
  ) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-black text-white border-t border-gray-800 shadow-2xl"
    >
      <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm leading-relaxed">
          <p>
            We use cookies for essential functionality (authentication) and
            optional analytics (PostHog, Google Analytics) to improve your
            experience. See our{" "}
            <Link
              href="/privacy"
              className="underline text-blue-300 hover:text-blue-200"
            >
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm font-mono border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            aria-label="Decline optional cookies"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm font-mono bg-white text-black hover:bg-gray-200 transition-colors font-semibold"
            aria-label="Accept all cookies"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper to check if analytics tracking is allowed.
 * Use this before initializing analytics SDKs.
 */
export function isTrackingAllowed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "accepted";
}
