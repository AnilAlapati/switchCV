import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ---------- Configuration ----------
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";

const errorRate = new Rate("errors");
const generateLatency = new Trend("resume_generate_latency", true);
const createLatency = new Trend("resume_create_latency", true);

export const options = {
  // Resume generation is expensive — keep VU count low
  stages: [
    { duration: "10s", target: 2 },
    { duration: "1m", target: 5 },
    { duration: "30s", target: 5 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    errors: ["rate<0.15"],
    resume_generate_latency: ["p(95)<15000"], // AI generation can be slow
    resume_create_latency: ["p(95)<3000"],
    http_req_duration: ["p(99)<20000"],
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

// Minimal valid resume payload for testing
function sampleResumePayload() {
  const ts = Date.now();
  return JSON.stringify({
    resume: {
      title: `Load Test Resume ${ts}`,
      summary: "Experienced software engineer with 5 years of expertise.",
      name: "Load Test User",
      email: "loadtest@example.com",
      phone: "+1-555-0100",
      skills: ["JavaScript", "TypeScript", "React", "Node.js"],
      experience: [
        {
          company: "Test Corp",
          role: "Senior Engineer",
          duration: "2020 - Present",
          description: "Led development of microservices architecture.",
          achievements: [
            "Reduced latency by 40%",
            "Mentored 3 junior engineers",
          ],
        },
      ],
      education: [
        {
          institution: "State University",
          degree: "B.S. Computer Science",
          field: "Computer Science",
          year: 2018,
        },
      ],
    },
    isPublic: false, // Keep private to avoid polluting search index
  });
}

// Minimal chat message for resume generation endpoint
function sampleGeneratePayload(sessionId) {
  return JSON.stringify({
    sessionId: sessionId || `load-test-session-${Date.now()}`,
    message:
      "I am a software engineer with 5 years of experience in React and Node.js. " +
      "I worked at Acme Corp as a Senior Developer from 2020 to 2024.",
    isFirstMessage: true,
  });
}

// ---------- Scenarios ----------

export default function () {
  if (!AUTH_TOKEN) {
    // eslint-disable-next-line no-console
    console.warn(
      "AUTH_TOKEN not set — skipping authenticated resume tests. " +
        "Run with: k6 run -e AUTH_TOKEN=<jwt> load-tests/resume-pipeline.js",
    );
    sleep(5);
    return;
  }

  group("Resume list (baseline)", () => {
    const res = http.get(`${BASE_URL}/api/resumes`, authHeaders());
    check(res, {
      "resumes list: status 200": (r) => r.status === 200,
    });
    errorRate.add(res.status >= 500);
    sleep(0.5);
  });

  group("Resume generation (chat)", () => {
    const sessionId = `k6-${__VU}-${__ITER}-${Date.now()}`;
    const res = http.post(
      `${BASE_URL}/api/resume/generate`,
      sampleGeneratePayload(sessionId),
      authHeaders(),
    );
    check(res, {
      "generate: status 200 or 429": (r) =>
        r.status === 200 || r.status === 429,
      "generate: has response body": (r) => r.body && r.body.length > 0,
    });
    generateLatency.add(res.timings.duration);
    errorRate.add(res.status >= 500);

    // Rate limited is acceptable under load — not an error
    if (res.status === 429) {
      sleep(2);
      return;
    }

    sleep(1);
  });

  group("Resume create (save)", () => {
    const res = http.post(
      `${BASE_URL}/api/resumes/create`,
      sampleResumePayload(),
      authHeaders(),
    );
    check(res, {
      "create: status 200 or 201 or 429": (r) =>
        r.status === 200 || r.status === 201 || r.status === 429,
    });
    createLatency.add(res.timings.duration);
    errorRate.add(res.status >= 500);

    // If we got a resumeId back, try to clean up
    if (res.status === 200 || res.status === 201) {
      try {
        const body = JSON.parse(res.body);
        if (body.resumeId) {
          const del = http.del(
            `${BASE_URL}/api/resumes/${body.resumeId}`,
            null,
            authHeaders(),
          );
          check(del, {
            "cleanup delete: not 500": (r) => r.status < 500,
          });
        }
      } catch (_) {
        // Cleanup is best-effort
      }
    }

    sleep(1);
  });

  sleep(2);
}
