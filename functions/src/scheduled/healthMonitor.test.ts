/**
 * Tests for Health Monitor scheduled Cloud Function
 */

// Firestore mock
const mockGet = jest.fn();
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockAdd = jest.fn().mockResolvedValue(undefined);

const mockDoc = {
  get: mockGet,
  set: mockSet,
  collection: jest.fn(),
};

const mockCollection = {
  doc: jest.fn(() => mockDoc),
  add: mockAdd,
  limit: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
};

mockDoc.collection.mockReturnValue(mockCollection);

const mockFirestoreInstance = {
  collection: jest.fn(() => mockCollection),
  doc: jest.fn(() => mockDoc),
};

const createMockTimestamp = (date: Date | string) => {
  const resolvedDate = date instanceof Date ? date : new Date(date);
  return {
    toDate: () => resolvedDate,
  };
};

const createMockFetchResponse = (
  ok: boolean,
  status: number,
  text: string = "",
) => ({
  ok,
  status,
  text: jest.fn().mockResolvedValue(text),
});

// Mock Firebase Admin
jest.mock("firebase-admin", () => ({
  firestore: Object.assign(
    jest.fn(() => mockFirestoreInstance),
    {
      FieldValue: {
        serverTimestamp: jest.fn(() => "MOCK_TIMESTAMP"),
        arrayUnion: jest.fn((...args: unknown[]) => args),
      },
      Timestamp: {
        fromDate: jest.fn((date: Date) => createMockTimestamp(date)),
      },
    },
  ),
}));

// Mock firebase-functions
jest.mock("firebase-functions/v1", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock alertManager
const mockSendAlert = jest.fn().mockResolvedValue(undefined);
jest.mock("../utils/monitoring", () => ({
  alertManager: {
    sendAlert: mockSendAlert,
  },
  AlertSeverity: {
    INFO: "info",
    WARNING: "warning",
    ERROR: "error",
    CRITICAL: "critical",
  },
}));

// Mock emailService
const mockVerifyConnection = jest.fn();
jest.mock("../services/emailService", () => ({
  emailService: {
    verifyConnection: mockVerifyConnection,
  },
}));

// Mock global fetch for Gemini API check
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { healthMonitorHandler } from "./healthMonitor";

describe("healthMonitorHandler", () => {
  const mockContext = {
    eventId: "test-event",
    timestamp: "2026-02-09T00:00:00Z",
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-02-09T03:00:00Z"));
    process.env.GEMINI_API_KEY = "test-api-key";

    // Default: all services healthy
    mockFetch.mockResolvedValue(createMockFetchResponse(true, 200));
    mockVerifyConnection.mockResolvedValue(true);

    // Default health state: previously healthy
    mockDoc.get.mockResolvedValue({
      exists: true,
      data: () => ({
        consecutiveFailures: 0,
        lastStatus: "ok",
        lastChecked: null,
        failureStartedAt: null,
        failingServices: [],
        lastAlertSent: null,
      }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return ok when all services are healthy", async () => {
    const result = await healthMonitorHandler(mockContext);

    expect(result.status).toBe("ok");
    expect(result.checked).toBe(true);
    expect(result.services).toHaveLength(3);
    expect(result.services.every((s) => s.status === "ok")).toBe(true);
    expect(mockSendAlert).not.toHaveBeenCalled();
  });

  it("should detect Firestore failure", async () => {
    // Make the Firestore check fail — first collection call is for monitoring.limit(1).get()
    mockFirestoreInstance.collection.mockReturnValueOnce({
      limit: jest.fn().mockReturnValue({
        get: jest
          .fn()
          .mockRejectedValue(new Error("Firestore connection refused")),
      }),
    } as any);

    const result = await healthMonitorHandler(mockContext);

    expect(result.status).toBe("degraded");
    const firestoreResult = result.services.find((s) => s.name === "firestore");
    expect(firestoreResult?.status).toBe("error");
  });

  it("should detect Gemini AI failure", async () => {
    mockFetch.mockResolvedValue(
      createMockFetchResponse(false, 500, '{"error":{"message":"Internal error"}}'),
    );

    const result = await healthMonitorHandler(mockContext);

    expect(result.status).toBe("degraded");
    const geminiResult = result.services.find((s) => s.name === "gemini_ai");
    expect(geminiResult?.status).toBe("error");
    expect(geminiResult?.error).toContain("API returned 500");
  });

  it("should detect SMTP failure", async () => {
    mockVerifyConnection.mockRejectedValue(
      new Error("SMTP connection timeout"),
    );

    const result = await healthMonitorHandler(mockContext);

    expect(result.status).toBe("degraded");
    const emailResult = result.services.find((s) => s.name === "email_smtp");
    expect(emailResult?.status).toBe("error");
  });

  it("should detect SMTP verification returning false", async () => {
    mockVerifyConnection.mockResolvedValue(false);

    const result = await healthMonitorHandler(mockContext);

    expect(result.status).toBe("degraded");
    const emailResult = result.services.find((s) => s.name === "email_smtp");
    expect(emailResult?.status).toBe("error");
    expect(emailResult?.error).toContain("SMTP verification failed");
  });

  it("should send WARNING when 1 service fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    await healthMonitorHandler(mockContext);

    expect(mockSendAlert).toHaveBeenCalledWith(
      "warning",
      expect.stringContaining("gemini_ai"),
      expect.any(String),
      expect.objectContaining({
        failingServices: ["gemini_ai"],
        consecutiveFailures: 1,
      }),
    );
  });

  it("should send CRITICAL when 2+ services fail", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    mockVerifyConnection.mockRejectedValue(new Error("SMTP down"));

    await healthMonitorHandler(mockContext);

    expect(mockSendAlert).toHaveBeenCalledWith(
      "critical",
      expect.stringContaining("gemini_ai"),
      expect.any(String),
      expect.objectContaining({
        consecutiveFailures: 1,
      }),
    );
  });

  it("should send recovery notification when services come back", async () => {
    // Previously degraded
    mockDoc.get.mockResolvedValue({
      exists: true,
      data: () => ({
        consecutiveFailures: 3,
        lastStatus: "degraded",
        lastChecked: null,
        failureStartedAt: createMockTimestamp("2026-02-09T02:00:00Z"),
        failingServices: ["gemini_ai"],
        lastAlertSent: null,
      }),
    });

    // Now all healthy
    const result = await healthMonitorHandler(mockContext);

    expect(result.status).toBe("ok");
    expect(mockSendAlert).toHaveBeenCalledWith(
      "info",
      expect.stringContaining("recovered"),
      expect.stringContaining("gemini_ai"),
      expect.objectContaining({
        downtime: "60 minutes (approx)",
        recoveredServices: ["gemini_ai"],
      }),
    );
  });

  it("should not spam alerts — only every 3rd consecutive failure after first", async () => {
    // Set consecutive failures to 2 (not first, not on 3rd boundary)
    mockDoc.get.mockResolvedValue({
      exists: true,
      data: () => ({
        consecutiveFailures: 1, // Will become 2 — not a trigger
        lastStatus: "degraded",
        lastChecked: null,
        failureStartedAt: createMockTimestamp("2026-02-09T02:30:00Z"),
        failingServices: ["gemini_ai"],
        lastAlertSent: null,
      }),
    });

    mockFetch.mockRejectedValue(new Error("Still down"));

    await healthMonitorHandler(mockContext);

    // Consecutive failures = 2 — should NOT alert (only on 1, 3, 6, 9...)
    expect(mockSendAlert).not.toHaveBeenCalled();
  });

  it("should handle missing GEMINI_API_KEY", async () => {
    delete process.env.GEMINI_API_KEY;

    const result = await healthMonitorHandler(mockContext);

    expect(result.status).toBe("degraded");
    const geminiResult = result.services.find((s) => s.name === "gemini_ai");
    expect(geminiResult?.status).toBe("error");
    expect(geminiResult?.error).toContain("not configured");
  });

  it("should persist health state to Firestore", async () => {
    mockFetch.mockRejectedValue(new Error("Down"));

    await healthMonitorHandler(mockContext);

    // Should save degraded state
    expect(mockDoc.set).toHaveBeenCalledWith(
      expect.objectContaining({
        consecutiveFailures: 1,
        failureStartedAt: expect.any(Object),
        lastStatus: "degraded",
        failingServices: ["gemini_ai"],
      }),
      { merge: true },
    );
  });
});
