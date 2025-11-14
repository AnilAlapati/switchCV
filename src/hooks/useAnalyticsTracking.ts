// src/hooks/useAnalyticsTracking.ts
/**
 * Hook for tracking profile views and interactions
 * Automatically tracks when a profile is viewed
 */

import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";

interface TrackingOptions {
  resumeId?: string;
  eventType?: "view" | "request" | "approval" | "click" | "share";
  source?: "search" | "direct" | "link" | "recruiter" | "other";
  metadata?: Record<string, any>;
  enabled?: boolean;
}

export function useAnalyticsTracking(options: TrackingOptions) {
  const { user } = useAuth();
  const sessionStartRef = useRef<number>(Date.now());
  const trackedRef = useRef<boolean>(false);

  const {
    resumeId,
    eventType = "view",
    source = "direct",
    metadata = {},
    enabled = true,
  } = options;

  useEffect(() => {
    if (!enabled || !resumeId || !user || trackedRef.current) {
      return;
    }

    // Calculate session duration
    const sessionDuration = Math.round(
      (Date.now() - sessionStartRef.current) / 1000
    );

    // Track the view
    const trackView = async () => {
      try {
        const response = await fetch("/api/profiles/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeId,
            userId: user.uid,
            eventType,
            metadata: {
              viewedBy: user.uid,
              viewerName: user.displayName,
              source,
              referrer: document.referrer,
              sessionDuration:
                eventType === "view" ? sessionDuration : undefined,
              ...metadata,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`📊 Tracked ${eventType} event for resume ${resumeId}`);
        } else {
          console.warn("Failed to track analytics");
        }
      } catch (error) {
        console.error("Analytics tracking error:", error);
      }
    };

    // Track after a delay to avoid tracking brief visits
    const timer = setTimeout(() => {
      trackView();
      trackedRef.current = true;
    }, 2000); // Track after 2 seconds of viewing

    return () => clearTimeout(timer);
  }, [resumeId, user, eventType, source, metadata, enabled]);

  return {
    sessionStartTime: sessionStartRef.current,
  };
}

/**
 * Hook for manual analytics tracking
 */
export function useTrackAnalytics() {
  const { user } = useAuth();

  const track = async (
    resumeId: string,
    eventType: "view" | "request" | "approval" | "click" | "share",
    metadata?: Record<string, any>
  ) => {
    if (!user) {
      console.warn("Cannot track analytics: user not authenticated");
      return;
    }

    try {
      const response = await fetch("/api/profiles/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId,
          userId: user.uid,
          eventType,
          metadata: {
            viewedBy: user.uid,
            viewerName: user.displayName,
            ...metadata,
          },
        }),
      });

      if (!response.ok) {
        console.warn("Failed to track analytics event");
        return;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error tracking analytics:", error);
    }
  };

  return { track };
}
