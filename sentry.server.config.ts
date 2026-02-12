// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV === "production" ? "production" : "development",
  release: process.env.NEXT_PUBLIC_APP_VERSION || "dev",

  // Sample 10% of traces in production to control Sentry costs
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Profiling sample rate is relative to tracesSampleRate
  profilesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
