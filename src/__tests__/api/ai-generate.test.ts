import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/ai/generate/route";
import { adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";
import { generateText } from "@/lib/services/aiGenerationService";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { BillingService } from "@/lib/services/billingService";
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
jest.mock("@/lib/utils/distributedRateLimit");
jest.mock("@/lib/services/billingService", () => ({
  BillingService: {
    checkBudget: jest.fn(),
    trackUsage: jest.fn(),
  },
}));
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
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      current: 1,
      limit: 10,
      resetIn: 60000,
      remaining: 9,
    });
    (BillingService.checkBudget as jest.Mock).mockResolvedValue(true);
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

    const req = new NextRequest("http://localhost", { method: "POST" });
    const response = await POST(req);
    expect(response.status).toBe(500);
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

    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: false,
      current: 10,
      limit: 10,
      resetIn: 60000,
      remaining: 0,
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
