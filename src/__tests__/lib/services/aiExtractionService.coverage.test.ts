/**
 * aiExtractionService.coverage.test.ts
 *
 * Tests for uncovered paths in aiExtractionService:
 * - Failure tracker + admin alert flow
 * - observationContext monitoring branches
 * - safeParseJSON markdown fence parsing
 * - extractWithStructuredOutput edge cases
 */

// ── Mocks (hoisted) ───────────────────────────────────────────────────

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockDocSetFn = jest.fn().mockResolvedValue(undefined);
const mockDocGetFn = jest.fn().mockResolvedValue({ exists: false });

jest.mock("@/lib/firebase-admin", () => {
  return {
    adminDb: {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          set: (...args: unknown[]) => mockDocSetFn(...args),
          get: (...args: unknown[]) => mockDocGetFn(...args),
        }),
      }),
    },
  };
});

jest.mock("@/lib/services/cacheService", () => ({
  cacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockClassifyAIFailure = jest.fn().mockReturnValue({
  failureCode: "AI_EMPTY_RESPONSE",
  errorMessage: "Test classification",
  providerErrorClass: "empty_response",
});
const mockMarkAIStageFailed = jest.fn();
const mockPersistAIFailureEvent = jest.fn().mockResolvedValue("event-id");

jest.mock("@/lib/services/aiMonitoringService", () => ({
  classifyAIFailure: (...args: unknown[]) => mockClassifyAIFailure(...args),
  markAIStageFailed: (...args: unknown[]) => mockMarkAIStageFailed(...args),
  persistAIFailureEvent: (...args: unknown[]) =>
    mockPersistAIFailureEvent(...args),
}));

const mockGenerateTextWithTier = jest.fn();
jest.mock("@/server/services/aiProviderService", () => ({
  generateTextWithTier: (...args: unknown[]) =>
    mockGenerateTextWithTier(...args),
}));

// ── Imports ────────────────────────────────────────────────────────────

import {
  extractWithStructuredOutput,
  getFailureTrackerState,
  resetFailureTracker,
} from "@/lib/services/aiExtractionService";
import { logger } from "@/lib/logger";

// ── Helpers ────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  resetFailureTracker();
});

const VALID_EXTRACTION = {
  name: "John Doe",
  email: "john@example.com",
  phone: "555-0100",
  location: "New York, NY",
  summary: "Experienced developer",
  experience: [
    {
      title: "Software Engineer",
      company: "Acme Corp",
      duration: "2020-2023",
      description: "Built things",
      achievements: ["Led team of 5"],
    },
  ],
  education: [
    {
      degree: "B.S. Computer Science",
      institution: "MIT",
      year: "2020",
    },
  ],
  skills: ["JavaScript", "TypeScript", "React"],
};

const mockObservationContext = {
  requestId: "req-123",
  sessionId: "session-789",
  userIdHash: "hash-456",
  userTier: "enterprise" as const,
  entrypoint: "resume_extract",
  deployVersion: "test-build",
  environment: "test",
  conversationTurn: 1,
  startedAt: new Date("2026-01-01T00:00:00Z"),
  stages: {},
  failureCount: 0,
  fallbackCount: 0,
};

// ── extractWithStructuredOutput ────────────────────────────────────────

describe("extractWithStructuredOutput", () => {
  it("returns success=false with method=fallback when skipAI is true", async () => {
    const result = await extractWithStructuredOutput("some resume text", {
      skipAI: true,
    });
    expect(result.success).toBe(false);
    expect(result.method).toBe("fallback");
    expect(result.error).toBe("AI extraction skipped");
    expect(mockGenerateTextWithTier).not.toHaveBeenCalled();
  });

  it("returns success=false when input text is too short", async () => {
    const result = await extractWithStructuredOutput("hi");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Input text too short for extraction");
  });

  it("returns success=false when input text is empty", async () => {
    const result = await extractWithStructuredOutput("");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Input text too short for extraction");
  });

  it("extracts data successfully with valid AI response", async () => {
    mockGenerateTextWithTier.mockResolvedValueOnce({
      text: JSON.stringify(VALID_EXTRACTION),
      model: "gemini-2.5-pro",
      provider: "gemini",
    });

    const result = await extractWithStructuredOutput(
      "My name is John Doe and I am a software engineer at Acme Corp. " +
        "I have a BS in Computer Science from MIT.",
    );

    expect(result.success).toBe(true);
    expect(result.method).toBe("ai");
    expect(result.model).toBe("gemini-2.5-pro");
    expect(result.data?.name).toBe("John Doe");
    expect(result.data?.skills).toEqual(["JavaScript", "TypeScript", "React"]);
  });

  it("logs warning when model is not gemini-2.5-pro (fallback model used)", async () => {
    mockGenerateTextWithTier.mockResolvedValueOnce({
      text: JSON.stringify(VALID_EXTRACTION),
      model: "gemini-2.0-flash",
      provider: "gemini",
    });

    const result = await extractWithStructuredOutput(
      "A valid resume text that is long enough",
    );

    expect(result.success).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedModel: "gemini-2.5-pro",
        actualModel: "gemini-2.0-flash",
      }),
      expect.any(String),
    );
  });

  // ── Empty AI response + observation context ──

  it("records monitoring event when AI returns empty response with observationContext", async () => {
    mockGenerateTextWithTier.mockResolvedValueOnce({
      text: "",
      model: "gemini-2.5-pro",
      provider: "gemini",
    });

    const result = await extractWithStructuredOutput(
      "A valid resume text that is long enough for extraction processing",
      { observationContext: mockObservationContext },
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("AI returned empty response");
    expect(mockClassifyAIFailure).toHaveBeenCalledWith(
      expect.objectContaining({ emptyResponse: true }),
    );
    expect(mockPersistAIFailureEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        context: mockObservationContext,
        stage: "extraction",
        failureCode: "AI_EMPTY_RESPONSE",
      }),
    );
    expect(mockMarkAIStageFailed).toHaveBeenCalledWith(
      mockObservationContext,
      "extraction",
      expect.any(Object),
    );
  });

  // ── Invalid JSON + observation context ──

  it("records monitoring event when AI returns invalid JSON with observationContext", async () => {
    mockGenerateTextWithTier.mockResolvedValueOnce({
      text: "This is not valid JSON at all",
      model: "gemini-2.5-pro",
      provider: "gemini",
    });

    const result = await extractWithStructuredOutput(
      "A valid resume text that is long enough for extraction processing",
      { observationContext: mockObservationContext },
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("AI response was not valid JSON");
    expect(mockClassifyAIFailure).toHaveBeenCalledWith(
      expect.objectContaining({ invalidJson: true }),
    );
    expect(mockPersistAIFailureEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "extraction",
        responsePreview: "This is not valid JSON at all",
      }),
    );
  });

  // ── Schema validation failure + observation context ──

  it("records monitoring event when AI response fails schema validation with observationContext", async () => {
    // Return valid JSON but wrong structure (missing required fields in a way Zod rejects)
    mockGenerateTextWithTier.mockResolvedValueOnce({
      text: JSON.stringify({ invalid: "structure", name: 12345 }),
      model: "gemini-2.5-pro",
      provider: "gemini",
    });

    mockClassifyAIFailure.mockReturnValueOnce({
      failureCode: "AI_SCHEMA_VALIDATION_FAILED",
      errorMessage: "schema failed",
      providerErrorClass: "schema_error",
    });

    const result = await extractWithStructuredOutput(
      "A valid resume text that is long enough for extraction processing",
      { observationContext: mockObservationContext },
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("AI response failed schema validation");
    expect(mockClassifyAIFailure).toHaveBeenCalledWith(
      expect.objectContaining({ schemaValidationFailed: true }),
    );
    expect(mockPersistAIFailureEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "extraction",
        failureCode: "AI_SCHEMA_VALIDATION_FAILED",
      }),
    );
  });

  // ── AI call throws ──

  it("handles AI call exception gracefully", async () => {
    mockGenerateTextWithTier.mockRejectedValueOnce(
      new Error("Gemini API rate limit"),
    );

    const result = await extractWithStructuredOutput(
      "A valid resume text that is long enough for extraction processing",
    );

    expect(result.success).toBe(false);
    expect(result.method).toBe("fallback");
    expect(result.error).toBe("Gemini API rate limit");
  });

  it("handles non-Error thrown objects in catch", async () => {
    mockGenerateTextWithTier.mockRejectedValueOnce("string error");

    const result = await extractWithStructuredOutput(
      "A valid resume text that is long enough for extraction processing",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("AI extraction call failed");
  });

  // ── safeParseJSON: markdown fenced JSON ──

  it("parses JSON from markdown code fences", async () => {
    const fencedJSON = "```json\n" + JSON.stringify(VALID_EXTRACTION) + "\n```";
    mockGenerateTextWithTier.mockResolvedValueOnce({
      text: fencedJSON,
      model: "gemini-2.5-pro",
      provider: "gemini",
    });

    const result = await extractWithStructuredOutput(
      "A valid resume text that is long enough for extraction processing",
    );

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("John Doe");
  });

  it("parses JSON from markdown fences without language tag", async () => {
    const fencedJSON = "```\n" + JSON.stringify(VALID_EXTRACTION) + "\n```";
    mockGenerateTextWithTier.mockResolvedValueOnce({
      text: fencedJSON,
      model: "gemini-2.5-pro",
      provider: "gemini",
    });

    const result = await extractWithStructuredOutput(
      "A valid resume text that is long enough for extraction processing",
    );

    expect(result.success).toBe(true);
  });
});

// ── Failure tracker + admin alert ──────────────────────────────────────

describe("failure tracker and admin alert", () => {
  it("tracks consecutive failures", async () => {
    mockGenerateTextWithTier.mockResolvedValue({
      text: "",
      model: "gemini-2.5-pro",
      provider: "gemini",
    });

    await extractWithStructuredOutput(
      "some valid text that is long enough for test",
    );
    expect(getFailureTrackerState().consecutiveFailures).toBe(1);

    await extractWithStructuredOutput(
      "some valid text that is long enough for test",
    );
    expect(getFailureTrackerState().consecutiveFailures).toBe(2);
  });

  it("resets tracker on success", async () => {
    // First cause a failure
    mockGenerateTextWithTier.mockResolvedValueOnce({
      text: "",
      model: "gemini-2.5-pro",
      provider: "gemini",
    });
    await extractWithStructuredOutput(
      "some valid text that is long enough for test",
    );
    expect(getFailureTrackerState().consecutiveFailures).toBe(1);

    // Then succeed
    mockGenerateTextWithTier.mockResolvedValueOnce({
      text: JSON.stringify(VALID_EXTRACTION),
      model: "gemini-2.5-pro",
      provider: "gemini",
    });
    await extractWithStructuredOutput(
      "some valid text that is long enough for test",
    );
    expect(getFailureTrackerState().consecutiveFailures).toBe(0);
    expect(getFailureTrackerState().firstFailureAt).toBeNull();
  });

  it("sends admin alert email after threshold exceeded", async () => {
    // Manually set up first failure in the past (>1 hour ago)
    mockGenerateTextWithTier.mockResolvedValue({
      text: "",
      model: "gemini-2.5-pro",
      provider: "gemini",
    });

    // Cause first failure
    await extractWithStructuredOutput(
      "some valid text that is long enough for test",
    );
    const state = getFailureTrackerState();
    expect(state.consecutiveFailures).toBe(1);
    expect(state.adminAlertSent).toBe(false);

    // Simulate time passing by manipulating Date.now
    const originalDateNow = Date.now;
    const twoHoursLater = Date.now() + 2 * 60 * 60 * 1000;
    Date.now = jest.fn(() => twoHoursLater);

    try {
      // Cause another failure — should trigger admin alert
      await extractWithStructuredOutput(
        "some valid text that is long enough for test",
      );
      const newState = getFailureTrackerState();
      expect(newState.adminAlertSent).toBe(true);
      expect(newState.consecutiveFailures).toBe(2);

      // Verify admin email was queued
      expect(mockDocSetFn).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "support@switchcv.com",
          message: expect.objectContaining({
            subject: expect.stringContaining("[SWITCHCV ALERT]"),
            html: expect.stringContaining("AI Extraction Service Alert"),
          }),
        }),
      );
    } finally {
      Date.now = originalDateNow;
    }
  });

  it("does not send duplicate admin alerts", async () => {
    mockGenerateTextWithTier.mockResolvedValue({
      text: "",
      model: "gemini-2.5-pro",
      provider: "gemini",
    });

    // First failure
    await extractWithStructuredOutput(
      "some valid text that is long enough for test",
    );

    // Fast-forward time
    const originalDateNow = Date.now;
    Date.now = jest.fn(() => originalDateNow() + 2 * 60 * 60 * 1000);

    try {
      // Second failure triggers alert
      await extractWithStructuredOutput(
        "some valid text that is long enough for test",
      );
      expect(getFailureTrackerState().adminAlertSent).toBe(true);
      const firstCallCount = mockDocSetFn.mock.calls.length;

      // Third failure should NOT send another alert
      await extractWithStructuredOutput(
        "some valid text that is long enough for test",
      );
      expect(mockDocSetFn.mock.calls.length).toBe(firstCallCount);
    } finally {
      Date.now = originalDateNow;
    }
  });

  it("resets after resetFailureTracker is called", () => {
    resetFailureTracker();
    const state = getFailureTrackerState();
    expect(state.firstFailureAt).toBeNull();
    expect(state.adminAlertSent).toBe(false);
    expect(state.consecutiveFailures).toBe(0);
  });
});
