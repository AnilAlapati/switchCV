import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ---------- Configuration ----------
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";

const errorRate = new Rate("errors");
const publicLatency = new Trend("public_endpoint_latency", true);
const authedLatency = new Trend("authed_endpoint_latency", true);

export const options = {
  stages: [
    { duration: "15s", target: 5 },
    { duration: "30s", target: 15 },
    { duration: "1m", target: 15 },
    { duration: "15s", target: 0 },
  ],
  thresholds: {
    errors: ["rate<0.1"],
    public_endpoint_latency: ["p(95)<500"],
    authed_endpoint_latency: ["p(95)<2000"],
    http_req_duration: ["p(99)<5000"],
  },
};

function authHeaders() {
  return {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
  };
}

// ---------- Scenarios ----------

export default function apiEndpointsLoadTest() {
  group("Public endpoints", () => {
    // Health check
    const health = http.get(`${BASE_URL}/api/health`);
    check(health, {
      "health: status 200": (r) => r.status === 200,
    });
    publicLatency.add(health.timings.duration);
    errorRate.add(health.status !== 200);

    // System config (public)
    const config = http.get(`${BASE_URL}/api/system-config`);
    check(config, {
      "system-config: status 200": (r) => r.status === 200,
    });
    publicLatency.add(config.timings.duration);
    errorRate.add(config.status !== 200);

    sleep(0.5);
  });

  // Skip authenticated tests if no token provided
  if (!AUTH_TOKEN) return;

  group("User profile endpoints", () => {
    // GET user settings
    const settings = http.get(
      `${BASE_URL}/api/user/settings`,
      authHeaders(),
    );
    check(settings, {
      "user/settings: status 200": (r) => r.status === 200,
    });
    authedLatency.add(settings.timings.duration);
    errorRate.add(settings.status !== 200);

    sleep(0.3);

    // GET jobseeker profile
    const profile = http.get(
      `${BASE_URL}/api/jobseeker/profile`,
      authHeaders(),
    );
    check(profile, {
      "jobseeker/profile: status 200 or 404": (r) =>
        r.status === 200 || r.status === 404,
    });
    authedLatency.add(profile.timings.duration);
    errorRate.add(profile.status >= 500);

    sleep(0.3);
  });

  group("Resume endpoints", () => {
    // GET user's resumes list
    const resumes = http.get(
      `${BASE_URL}/api/resumes`,
      authHeaders(),
    );
    check(resumes, {
      "resumes list: status 200": (r) => r.status === 200,
    });
    authedLatency.add(resumes.timings.duration);
    errorRate.add(resumes.status >= 500);

    // GET drafts
    const drafts = http.get(
      `${BASE_URL}/api/drafts`,
      authHeaders(),
    );
    check(drafts, {
      "drafts: status 200 or 404": (r) =>
        r.status === 200 || r.status === 404,
    });
    authedLatency.add(drafts.timings.duration);
    errorRate.add(drafts.status >= 500);

    sleep(0.5);
  });

  group("Notification endpoints", () => {
    const notifications = http.get(
      `${BASE_URL}/api/notifications`,
      authHeaders(),
    );
    check(notifications, {
      "notifications: status 200": (r) => r.status === 200,
    });
    authedLatency.add(notifications.timings.duration);
    errorRate.add(notifications.status >= 500);

    sleep(0.3);
  });

  group("Analytics endpoint", () => {
    const analytics = http.get(
      `${BASE_URL}/api/analytics`,
      authHeaders(),
    );
    check(analytics, {
      "analytics: status 200 or 403": (r) =>
        r.status === 200 || r.status === 403,
    });
    authedLatency.add(analytics.timings.duration);
    errorRate.add(analytics.status >= 500);

    sleep(0.3);
  });

  sleep(1);
}
