import { logger } from "@/lib/logger";
/**
 * Hook for tracking analytics events.
 * Sends events to PostHog when initialized (requires cookie consent).
 */

import { useCallback } from "react";
import posthog from "@/lib/posthog";

interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
}

export const useAnalyticsTracking = () => {
  const trackEvent = useCallback((event: AnalyticsEvent) => {
    logger.info(
      {
        event: event.eventName,
        properties: event.properties,
        timestamp: event.timestamp || new Date(),
      },
      "📊 Analytics Event:",
    );

    // Send to PostHog if initialized (client-side only; requires cookie consent)
    try {
      posthog.capture(event.eventName, {
        ...event.properties,
        timestamp: (event.timestamp || new Date()).toISOString(),
      });
    } catch {
      // PostHog may not be initialized (no consent granted, or SSR) — silently skip
    }
  }, []);

  const track = useCallback(
    (
      category: string,
      action: string,
      properties?: Record<string, unknown>,
    ) => {
      trackEvent({
        eventName: `${category}_${action}`,
        properties,
      });
    },
    [trackEvent],
  );

  const trackSearch = useCallback(
    (query: string, resultCount: number, filters?: Record<string, unknown>) => {
      trackEvent({
        eventName: "search_performed",
        properties: {
          query,
          resultCount,
          filters,
          timestamp: new Date(),
        },
      });
    },
    [trackEvent],
  );

  const trackProfileView = useCallback(
    (userId: string, profileData?: unknown) => {
      trackEvent({
        eventName: "profile_viewed",
        properties: {
          userId,
          profileData,
          timestamp: new Date(),
        },
      });
    },
    [trackEvent],
  );

  const trackAccessRequest = useCallback(
    (userId: string, resumeId: string) => {
      trackEvent({
        eventName: "access_requested",
        properties: {
          userId,
          resumeId,
          timestamp: new Date(),
        },
      });
    },
    [trackEvent],
  );

  return {
    track,
    trackEvent,
    trackSearch,
    trackProfileView,
    trackAccessRequest,
  };
};

// Alias for compatibility
export const useTrackAnalytics = useAnalyticsTracking;
