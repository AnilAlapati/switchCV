import { NextRequest } from "next/server";

describe("POST /api/seed/generate", () => {
  let POST: any;
  let mockGenerateText: jest.Mock;
  let mockGenerateTemplateResume: jest.Mock;
  let mockCategorizeProfession: jest.Mock;
  let mockGetTemplateIdForCategory: jest.Mock;
  let mockConsumeQuota: jest.Mock;
  let mockGetAuthenticatedUserId: jest.Mock;
  let mockGetUserDoc: jest.Mock;
  let mockSeedLogAdd: jest.Mock;

  class MockQuotaExceededError extends Error {
    constructor(message: string, public resetTime?: number) {
      super(message);
      this.name = "QuotaExceededError";
    }
  }

  const createRequest = (body: any) =>
    new NextRequest("http://localhost:3000/api/seed/generate", {
      method: "POST",
      body: JSON.stringify(body),
    });

  const setupTest = async ({
    enableSeeding = true,
    tier = "basic",
    planOverrides = {},
  } = {}) => {
    jest.resetModules();

    mockGenerateText = jest.fn();
    mockGenerateTemplateResume = jest.fn(() => ({
      title: "Template Resume",
      templateId: "standard-v1",
    }));
    mockCategorizeProfession = jest.fn(() => "technical");
    mockGetTemplateIdForCategory = jest.fn(() => "standard-v1");
    mockConsumeQuota = jest.fn().mockResolvedValue({
      limit: 5,
      remaining: 4,
      resetTime: Date.now(),
      count: 1,
    });
    mockGetAuthenticatedUserId = jest
      .fn()
      .mockResolvedValue({ userId: "user-123" });
    mockSeedLogAdd = jest.fn().mockResolvedValue(undefined);
    mockGetUserDoc = jest.fn().mockResolvedValue({
      data: () => ({ subscriptionTier: tier }),
    });

    jest.doMock("@/lib/services/aiGenerationService", () => ({
      generateText: mockGenerateText,
    }));

    jest.doMock("@/lib/services/resumeSeedGenerator", () => ({
      generateTemplateResume: mockGenerateTemplateResume,
      categorizeProfession: mockCategorizeProfession,
      getTemplateIdForCategory: mockGetTemplateIdForCategory,
    }));

    jest.doMock("@/lib/services/quotaService", () => ({
      consumeQuota: mockConsumeQuota,
      QuotaExceededError: MockQuotaExceededError,
    }));

    jest.doMock("@/lib/utils/api-helpers", () => {
      const actual = jest.requireActual("@/lib/utils/api-helpers");
      return {
        ...actual,
        getAuthenticatedUserId: mockGetAuthenticatedUserId,
      };
    });

    jest.doMock("@/lib/firebase-admin", () => {
      const usersCollection = {
        doc: jest.fn(() => ({ get: mockGetUserDoc })),
      };
      const seedLogsCollection = {
        add: mockSeedLogAdd,
      };
      const defaultCollection = {
        doc: jest.fn(() => ({ get: jest.fn() })),
        add: jest.fn(),
      };

      const collection = jest.fn((name: string) => {
        if (name === "users") return usersCollection;
        if (name === "seedGenerationLogs") return seedLogsCollection;
        return defaultCollection;
      });

      const firestore = {
        FieldValue: { serverTimestamp: jest.fn(() => "ts") },
        Timestamp: {
          fromMillis: jest.fn((ms: number) => ({
            toMillis: () => ms,
          })),
        },
      };

      return {
        __esModule: true,
        adminDb: { collection },
        admin: { firestore },
        default: { firestore },
      };
    });

    jest.doMock("@/lib/config", () => ({
      ENABLE_SEEDING_AND_DEBUG_LISTS: enableSeeding,
      GLOBAL_LIVE_SEED_MONTHLY_LIMIT: 100,
      SEEDING_PLAN_LIMITS: {
        basic: { monthlyWrites: 5, strategy: "template" },
        premium: { monthlyWrites: 50, strategy: "live" },
        enterprise: { monthlyWrites: 100, strategy: "live" },
        ...planOverrides,
      },
    }));

    const routeModule = await import("./route");
    POST = routeModule.POST;
  };

  it("returns 403 when seeding disabled", async () => {
    await setupTest({ enableSeeding: false });
    const req = createRequest({ profession: "Designer" });
    const response = await POST(req);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toBe("Seeding functionality is currently disabled");
  });

  it("requires authenticated user", async () => {
    await setupTest();
    const helpers = jest.requireActual("@/lib/utils/api-helpers");
    mockGetAuthenticatedUserId.mockResolvedValueOnce({
      error: helpers.handleApiError(null, "Unauthorized", 401),
    });

    const req = createRequest({ profession: "Designer" });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("blocks missing profession with Zod validation", async () => {
    await setupTest();
    const req = createRequest({});
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    // Zod validation message for missing required field
    expect(body.error).toContain("Invalid input");
  });

  it("serves template resume for basic tier", async () => {
    await setupTest({ tier: "basic" });
    const req = createRequest({ profession: "Designer" });
    const response = await POST(req);
    await response.json();

    expect(mockGenerateTemplateResume).toHaveBeenCalledWith("Designer");
    expect(mockGenerateText).not.toHaveBeenCalled();
    expect(mockConsumeQuota).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
  });

  it("invokes LLM for premium tier", async () => {
    await setupTest({ tier: "premium" });
    mockGenerateTemplateResume.mockClear();
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify({ title: "LLM Resume" }),
      model: "gemini",
      provider: "google",
    });
    mockConsumeQuota
      .mockResolvedValueOnce({
        limit: 50,
        remaining: 40,
        resetTime: Date.now(),
        count: 10,
      })
      .mockResolvedValueOnce({
        limit: 100,
        remaining: 99,
        resetTime: Date.now(),
        count: 1,
      });

    const req = createRequest({ profession: "Engineer" });
    const response = await POST(req);
    await response.json();

    expect(mockGenerateTemplateResume).not.toHaveBeenCalled();
    expect(mockGenerateText).toHaveBeenCalled();
    expect(mockConsumeQuota).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
  });

  it("propagates quota errors", async () => {
    await setupTest();
    const resetTime = Date.now() + 5000;
    mockConsumeQuota.mockRejectedValueOnce(
      new MockQuotaExceededError("Limit reached", resetTime)
    );

    const req = createRequest({ profession: "Designer" });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("Limit reached");
    expect(response.headers.get("Retry-After")).toBeDefined();
  });
});
