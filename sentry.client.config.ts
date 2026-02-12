// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Check if user has consented to analytics/tracking
const CONSENT_KEY = "switchcv_cookie_consent";
const hasConsent =
  typeof window !== "undefined" &&
  localStorage.getItem(CONSENT_KEY) === "accepted";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV === "production" ? "production" : "development",
  release: process.env.NEXT_PUBLIC_APP_VERSION || "dev",

  // Sample 10% of traces in production to control Sentry costs
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Only enable session replay if user has consented
  replaysOnErrorSampleRate: hasConsent ? 1.0 : 0,
  replaysSessionSampleRate: hasConsent ? 0.1 : 0,

  // Only include replay integration if user has consented
  integrations: hasConsent
    ? [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ]
    : [],
});
