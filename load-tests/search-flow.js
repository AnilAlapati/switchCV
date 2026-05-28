import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ---------- Configuration ----------
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";

const errorRate = new Rate("errors");
const keywordLatency = new Trend("keyword_search_latency", true);
const aiSearchLatency = new Trend("ai_search_latency", true);
const profileLatency = new Trend("profile_view_latency", true);

export const options = {
  // AI search is expensive — keep VU count moderate
  stages: [
    { duration: "10s", target: 3 },
    { duration: "45s", target: 8 },
    { duration: "30s", target: 8 },
    { duration: "15s", target: 0 },
  ],
  thresholds: {
    errors: ["rate<0.15"],
    keyword_search_latency: ["p(95)<3000"],
    ai_search_latency: ["p(95)<10000"],
    profile_view_latency: ["p(95)<2000"],
    http_req_duration: ["p(99)<15000"],
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

// Rotate through different search queries to simulate realistic usage
const SEARCH_QUERIES = [
  "react developer with 3 years experience",
  "python machine learning engineer",
  "full stack typescript node",
  "senior java spring boot microservices",
  "data analyst SQL tableau",
  "devops kubernetes aws",
  "frontend engineer CSS accessibility",
  "backend golang distributed systems",
];

const SKILL_QUERIES = [
  "JavaScript",
  "Python",
  "React",
  "Node.js",
  "TypeScript",
  "AWS",
  "Docker",
  "SQL",
];

function randomQuery() {
  return SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
}

function randomSkill() {
  return SKILL_QUERIES[Math.floor(Math.random() * SKILL_QUERIES.length)];
}

// ---------- Scenarios ----------

export default function searchFlowLoadTest() {
  if (!AUTH_TOKEN) {
    // eslint-disable-next-line no-console
    console.warn(
      "AUTH_TOKEN not set — skipping authenticated search tests. " +
        "Run with: k6 run -e AUTH_TOKEN=<jwt> load-tests/search-flow.js",
    );
    sleep(5);
    return;
  }

  group("Keyword search", () => {
    const query = randomSkill();
    const res = http.get(
      `${BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=10`,
      authHeaders(),
    );
    check(res, {
      "keyword search: status 200 or 429": (r) =>
        r.status === 200 || r.status === 429,
    });
    keywordLatency.add(res.timings.duration);
    errorRate.add(res.status >= 500);

    sleep(0.5);
  });

  group("AI-powered recruiter search", () => {
    const query = randomQuery();
    const payload = JSON.stringify({
      query,
      useAI: true,
      limit: 10,
    });

    const res = http.post(
      `${BASE_URL}/api/recruiter/search`,
      payload,
      authHeaders(),
    );
    check(res, {
      "AI search: status 200 or 429 or 403": (r) =>
        r.status === 200 || r.status === 429 || r.status === 403,
      "AI search: has body": (r) => r.body && r.body.length > 0,
    });
    aiSearchLatency.add(res.timings.duration);
    errorRate.add(res.status >= 500);

    // If we got results, try viewing a profile
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        const results = body.results || body.data || [];
        if (results.length > 0 && results[0].userId) {
          group("Profile view", () => {
            const profileRes = http.get(
              `${BASE_URL}/api/profiles/${results[0].userId}`,
              authHeaders(),
            );
            check(profileRes, {
              "profile view: not 500": (r) => r.status < 500,
            });
            profileLatency.add(profileRes.timings.duration);
            errorRate.add(profileRes.status >= 500);
          });
        }
      } catch {
        // Parse failure is non-critical
      }
    }

    sleep(1);
  });

  group("JD-based search", () => {
    const jdPayload = JSON.stringify({
      jdText:
        "We are looking for a Senior React Developer with experience in " +
        "TypeScript, Node.js, and cloud services (AWS or GCP). " +
        "Must have 5+ years of experience and strong communication skills.",
      useAI: true,
      limit: 5,
    });

    const res = http.post(
      `${BASE_URL}/api/recruiter/search`,
      jdPayload,
      authHeaders(),
    );
    check(res, {
      "JD search: status 200 or 429 or 403": (r) =>
        r.status === 200 || r.status === 429 || r.status === 403,
    });
    aiSearchLatency.add(res.timings.duration);
    errorRate.add(res.status >= 500);

    sleep(1);
  });

  group("Skills endpoint", () => {
    const res = http.get(
      `${BASE_URL}/api/skills`,
      authHeaders(),
    );
    check(res, {
      "skills: status 200": (r) => r.status === 200,
    });
    keywordLatency.add(res.timings.duration);
    errorRate.add(res.status >= 500);

    sleep(0.3);
  });

  sleep(1);
}
