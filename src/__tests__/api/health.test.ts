import { GET } from "@/app/api/health/route";
import { adminDb } from "@/lib/firebase-admin";

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn(),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe("Health API", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      HEALTHCHECK_RUN_FULL: "true",
      GEMINI_API_KEY: "test-api-key", // Dummy key for testing
    };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should return 200 when all services are healthy", async () => {
    (adminDb.collection("").get as jest.Mock).mockResolvedValue({
      empty: false,
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.services.firestore.status).toBe("ok");
    expect(data.services.ai.status).toBe("ok");
    expect(data.services.email).toBeUndefined();
  });

  it("should return 503 when a service is unhealthy", async () => {
    (adminDb.collection("").get as jest.Mock).mockRejectedValue(
      new Error("Firestore down"),
    );
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("degraded");
    expect(data.services.firestore.status).toBe("error");
  });

  it("should handle missing Gemini API key", async () => {
    delete process.env.GEMINI_API_KEY;
    (adminDb.collection("").get as jest.Mock).mockResolvedValue({
      empty: false,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.services.ai.status).toBe("error");
    // Error details are intentionally sanitized (CRITICAL-4 fix)
    expect(data.services.ai.error).toBeUndefined();
  });

  it("should handle Gemini API error response", async () => {
    (adminDb.collection("").get as jest.Mock).mockResolvedValue({
      empty: false,
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    const response = await GET();
    const data = await response.json();

    expect(data.services.ai.status).toBe("error");
    // Error details are intentionally sanitized (CRITICAL-4 fix)
    expect(data.services.ai.error).toBeUndefined();
  });

  it("should not include email in health check (emails sent via Cloud Functions)", async () => {
    (adminDb.collection("").get as jest.Mock).mockResolvedValue({
      empty: false,
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    const response = await GET();
    const data = await response.json();

    expect(data.services.email).toBeUndefined();
    expect(Object.keys(data.services)).toEqual(["firestore", "ai"]);
  });

  it("should bypass checks if HEALTHCHECK_RUN_FULL is not true", async () => {
    process.env.HEALTHCHECK_RUN_FULL = "false";

    const response = await GET();
    const data = await response.json();

    expect(data.status).toBe("ok");
    expect(adminDb.collection).not.toHaveBeenCalled();
  });
});
