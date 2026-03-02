/**
 * Server-Side Analytics — PostHog Capture
 *
 * Sends analytic events from server-side code (API routes, services) to
 * PostHog using its HTTP capture endpoint. No browser or posthog-node package
 * required — uses native fetch.
 *
 * Events are fire-and-forget: failures are logged but NEVER bubble up to callers.
 */

import { logger } from "@/lib/logger";

const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";

/**
 * Capture a server-side analytics event via PostHog's HTTP API.
 *
 * @param distinctId - User ID (or anonymous ID) for the event
 * @param event - Event name (e.g. "resume_generated")
 * @param properties - Additional event properties
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  if (!POSTHOG_KEY) {
    logger.debug(
      { event },
      "PostHog key not configured — skipping server analytics event",
    );
    return;
  }

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties: {
          ...properties,
          $lib: "switchcv-server",
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    // Analytics failure must NEVER break the main request flow
    logger.warn({ err, event, distinctId }, "Server analytics capture failed");
  }
}
