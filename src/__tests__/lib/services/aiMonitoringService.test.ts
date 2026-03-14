const mockSet = jest.fn().mockResolvedValue(undefined);
const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

jest.mock("@/lib/firebase-admin", () => ({
  __esModule: true,
  default: {
    firestore: {
      FieldValue: {
        serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP"),
      },
    },
  },
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            set: mockSet,
          })),
        })),
      })),
    })),
    batch: jest.fn(() => ({
      set: mockBatchSet,
      commit: mockBatchCommit,
    })),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

import {
  classifyAIFailure,
  createAIObservationContext,
  deriveAIRequestStatus,
  redactMonitoringPreview,
} from "@/lib/services/aiMonitoringService";

describe("aiMonitoringService", () => {
  it("redacts sensitive values before storing previews", () => {
    const preview = redactMonitoringPreview(
      "Email me at jane@example.com, call +1 415-555-0199, see https://example.com, ref 123456789012345",
    );

    expect(preview).toContain("[EMAIL]");
    expect(preview).toContain("[PHONE]");
    expect(preview).toContain("[URL]");
    expect(preview).not.toContain("123456789012345");
  });

  it("classifies schema validation failures explicitly", () => {
    const classification = classifyAIFailure({
      errorMessage: "schema validation failed",
      schemaValidationFailed: true,
      schemaErrorCount: 4,
    });

    expect(classification.failureCode).toBe("AI_SCHEMA_VALIDATION_FAILED");
    expect(classification.schemaErrorCount).toBe(4);
  });

  it("derives degraded status when failures were recovered", () => {
    const context = createAIObservationContext({
      userId: "user-123",
      userTier: "premium",
      entrypoint: "resume_generate",
      requestId: "req-123",
      sessionId: "session-123",
    });
    context.failureCount = 2;
    context.fallbackCount = 2;

    expect(deriveAIRequestStatus(context, false)).toBe("degraded");
  });
});
