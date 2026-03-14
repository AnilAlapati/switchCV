jest.mock("firebase-admin", () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(),
    batch: jest.fn(() => ({
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    })),
  })),
}));

jest.mock("firebase-functions/v1", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("./emailService", () => ({
  emailService: {
    sendCustomEmail: jest.fn().mockResolvedValue({
      success: true,
    }),
  },
}));

import {
  buildDailyMetrics,
  detectActiveIncidents,
  type AIFailureEventDoc,
  type AIRequestSummaryDoc,
} from "./aiMonitoringService";

describe("functions aiMonitoringService", () => {
  it("builds daily metrics from summaries and failure events", () => {
    const summaries: AIRequestSummaryDoc[] = [
      {
        requestId: "req-1",
        entrypoint: "resume_generate",
        status: "success",
        userVisibleFailure: false,
        failureCount: 0,
        fallbackCount: 0,
        stages: {
          extraction: { latencyMs: 120 },
          generation: { latencyMs: 450 },
        },
      },
      {
        requestId: "req-2",
        entrypoint: "resume_generate",
        status: "degraded",
        userVisibleFailure: false,
        failureCount: 2,
        fallbackCount: 2,
        stages: {
          extraction: { latencyMs: 130 },
          generation: { latencyMs: 470 },
        },
      },
    ];
    const failures: AIFailureEventDoc[] = [
      {
        requestId: "req-2",
        stage: "generation",
        failureCode: "AI_TIMEOUT",
        errorMessage: "timed out",
        provider: "google",
        model: "gemini-2.5-flash",
      },
    ];

    const metrics = buildDailyMetrics(summaries, failures, new Date());

    expect(metrics.totalRequests).toBe(2);
    expect(metrics.degradedRequests).toBe(1);
    expect(metrics.failureCountsByCode.AI_TIMEOUT).toBe(1);
    expect(metrics.avgLatencyByStage.generation).toBe(460);
  });

  it("detects critical incidents for secret failures and failure rate spikes", () => {
    const failures: AIFailureEventDoc[] = [
      {
        requestId: "req-1",
        stage: "generation",
        failureCode: "AI_SECRET_MISSING",
        errorMessage: "secret missing",
      },
      {
        requestId: "req-2",
        stage: "generation",
        failureCode: "AI_ALL_MODELS_FAILED",
        errorMessage: "all models failed",
      },
      {
        requestId: "req-3",
        stage: "generation",
        failureCode: "AI_ALL_MODELS_FAILED",
        errorMessage: "all models failed",
      },
      {
        requestId: "req-4",
        stage: "generation",
        failureCode: "AI_ALL_MODELS_FAILED",
        errorMessage: "all models failed",
      },
    ];
    const summaries: AIRequestSummaryDoc[] = [
      {
        requestId: "req-1",
        entrypoint: "resume_generate",
        status: "failed",
        userVisibleFailure: true,
        failureCount: 1,
        fallbackCount: 0,
      },
      {
        requestId: "req-2",
        entrypoint: "resume_generate",
        status: "failed",
        userVisibleFailure: true,
        failureCount: 1,
        fallbackCount: 0,
      },
      {
        requestId: "req-3",
        entrypoint: "resume_generate",
        status: "failed",
        userVisibleFailure: true,
        failureCount: 1,
        fallbackCount: 0,
      },
      {
        requestId: "req-4",
        entrypoint: "resume_generate",
        status: "failed",
        userVisibleFailure: true,
        failureCount: 1,
        fallbackCount: 0,
      },
      {
        requestId: "req-5",
        entrypoint: "resume_generate",
        status: "success",
        userVisibleFailure: false,
        failureCount: 0,
        fallbackCount: 0,
      },
    ];

    const incidents = detectActiveIncidents({
      failures15m: failures,
      summaries15m: summaries,
      summaries60m: summaries,
    });

    expect(incidents.some((incident) => incident.key === "AI_SECRET_MISSING")).toBe(
      true,
    );
    expect(
      incidents.some((incident) => incident.key === "FAILED_REQUEST_RATE_15M"),
    ).toBe(true);
    expect(
      incidents.some(
        (incident) => incident.key === "AI_ALL_MODELS_FAILED_SPIKE",
      ),
    ).toBe(true);
  });
});
