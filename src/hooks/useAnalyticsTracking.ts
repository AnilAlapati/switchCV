import { logger } from "@/lib/logger";
/**
 * Hook for tracking analytics events
 */

import { useCallback } from "react";

interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

export const useAnalyticsTracking = () => {
  const trackEvent = useCallback((event: AnalyticsEvent) => {
    logger.info({
      event: event.eventName,
      properties: event.properties,
      timestamp: event.timestamp || new Date(),
    }, "📊 Analytics Event:");
    // In production, this would send to analytics service
  }, []);

  const track = useCallback(
    (category: string, action: string, properties?: Record<string, any>) => {
      trackEvent({
        eventName: `${category}_${action}`,
        properties,
      });
    },
    [trackEvent]
  );

  const trackSearch = useCallback(
    (query: string, resultCount: number, filters?: Record<string, any>) => {
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
    [trackEvent]
  );

  const trackProfileView = useCallback(
    (userId: string, profileData?: any) => {
      trackEvent({
        eventName: "profile_viewed",
        properties: {
          userId,
          profileData,
          timestamp: new Date(),
        },
      });
    },
    [trackEvent]
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
    [trackEvent]
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
