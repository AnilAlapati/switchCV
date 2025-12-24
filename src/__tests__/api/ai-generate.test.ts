import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/ai/generate/route";
import { adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";
import { generateText } from "@/lib/services/aiGenerationService";
import {
  getAuthenticatedUserId,
  handleApiError,
  safeParseBody,
} from "@/lib/utils/api-helpers";

jest.mock("@/lib/firebase-admin", () => {
  class MockTimestamp {
    ms: number;
    constructor(ms: number) {
      this.ms = ms;
    }
    toMillis() {
      return this.ms;
    }
    static fromMillis(ms: number) {
      return new MockTimestamp(ms);
    }
  }
  const mockDoc = {
    get: jest.fn(),
    set: jest.fn(),
    data: jest.fn(),
    exists: false,
  };
  const mockCollection = {
    doc: jest.fn(() => mockDoc),
    add: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      firestore: {
        Timestamp: MockTimestamp,
        FieldValue: {
          serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP"),
        },
      },
    },
    adminDb: {
      collection: jest.fn(() => mockCollection),
      runTransaction: jest.fn(),
    },
  };
});

jest.mock("@/lib/services/aiGenerationService");
jest.mock("@/lib/logger");
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) =>
    require("next/server").NextResponse.json(
      { error: msg || "Internal Server Error", success: false },
      { status: status || 500 }
    )
  ),
  safeParseBody: jest.fn(),
}));

describe("AI Generate API", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
    });
  });

  it("should return 400 if validation fails", async () => {
    (safeParseBody as jest.Mock).mockResolvedValue({ prompt: "" });
    const req = new NextRequest("http://localhost", { method: "POST" });
    const response = await POST(req);
    expect(response.status).toBe(400);
    expect(handleApiError).toHaveBeenCalledWith(
      null,
      expect.stringContaining("Prompt is required"),
      400
    );
  });

  it("should return 403 if user has basic plan", async () => {
    (safeParseBody as jest.Mock).mockResolvedValue({ prompt: "test" });
    const mockDoc = {
      exists: true,
      data: () => ({ subscriptionTier: "basic" }),
    };
    (adminDb.collection("users").doc as jest.Mock).mockReturnValue({
      get: jest.fn().mockResolvedValue(mockDoc),
    });

    const req = new NextRequest("http://localhost", { method: "POST" });
    const response = await POST(req);
    expect(response.status).toBe(403);
    expect(handleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.stringContaining("requires a premium or enterprise plan"),
      403
    );
  });

  it("should return 429 if rate limited", async () => {
    (safeParseBody as jest.Mock).mockResolvedValue({ prompt: "test" });

    // Mock premium plan
    (adminDb.collection("users").doc as jest.Mock).mockReturnValue({
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ subscriptionTier: "premium" }),
      }),
    });

    // Mock transaction to throw RateLimitError
    (adminDb.runTransaction as jest.Mock).mockImplementation(async (cb) => {
      const tx = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            count: 100,
            windowStart: admin.firestore.Timestamp.fromMillis(Date.now()),
          }),
        }),
        set: jest.fn(),
      };
      return cb(tx);
    });

    const req = new NextRequest("http://localhost", { method: "POST" });
    const response = await POST(req);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeDefined();
  });

  it("should return generated text on success", async () => {
    (safeParseBody as jest.Mock).mockResolvedValue({ prompt: "test" });

    // Mock premium plan
    (adminDb.collection("users").doc as jest.Mock).mockReturnValue({
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ subscriptionTier: "premium" }),
      }),
    });

    // Mock transaction success
    (adminDb.runTransaction as jest.Mock).mockResolvedValue({
      remaining: 5,
      resetTime: Date.now() + 60000,
      limit: 10,
    });

    (generateText as jest.Mock).mockResolvedValue({
      text: "AI Response",
      model: "gemini-pro",
      provider: "google",
    });

    const req = new NextRequest("http://localhost", { method: "POST" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.text).toBe("AI Response");
    expect(response.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(adminDb.collection("aiUsageLogs").add).toHaveBeenCalled();
    expect(adminDb.collection("aiAuditLogs").add).toHaveBeenCalled();
  });

  it("should handle generic errors", async () => {
    (safeParseBody as jest.Mock).mockResolvedValue({ prompt: "test" });
    (adminDb.collection("users").doc as jest.Mock).mockImplementation(() => {
      throw new Error("Database down");
    });

    const req = new NextRequest("http://localhost", { method: "POST" });
    const response = await POST(req);
    expect(response.status).toBe(500);
    expect(handleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "AI text generation failed"
    );
  });
});
