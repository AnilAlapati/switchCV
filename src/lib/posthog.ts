import posthog from "posthog-js";

if (typeof window !== "undefined") {
  // Check if user has accepted analytics cookies
  const consent = localStorage.getItem("switchcv_cookie_consent");

  if (consent === "accepted") {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
      loaded: (posthog) => {
        if (process.env.NODE_ENV === "development") posthog.debug();
      },
    });
  }
}

export default posthog;
