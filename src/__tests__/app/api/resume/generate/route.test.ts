import { NextRequest } from "next/server";
import { POST } from "@/app/api/resume/generate/route";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { BillingService } from "@/lib/services/billingService";
import { getUserTier } from "@/lib/services/userService";
import { getResumeCount } from "@/lib/services/resumeService";
import { processSyncGeneration } from "@/lib/services/resumeGenerationOrchestrator";
import { RESUME_GENERATION_HARD_CAP } from "@/lib/config/rateLimits";

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn(),
}));

jest.mock("@/lib/utils/distributedRateLimit", () => ({
  checkDistributedRateLimit: jest.fn(),
}));

jest.mock("@/lib/services/billingService", () => ({
  BillingService: {
    checkBudget: jest.fn(),
  },
}));

jest.mock("@/lib/services/userService", () => ({
  getUserTier: jest.fn(),
}));

jest.mock("@/lib/services/resumeService", () => ({
  getResumeCount: jest.fn(),
}));

// Mock resumeQuotaService — route now uses checkResumeCreationQuota instead of getResumeCount
jest.mock("@/lib/services/resumeQuotaService", () => ({
  checkResumeCreationQuota: jest
    .fn()
    .mockResolvedValue({ allowed: true, current: 0, limit: 50 }),
}));

// Mock featureFlagService — route checks feature flag for v3 function-calling pipeline
jest.mock("@/lib/services/featureFlagService", () => ({
  isFeatureEnabled: jest.fn().mockResolvedValue(false),
}));

jest.mock("@/lib/services/resumeGenerationQueue", () => ({
  createGenerationJob: jest.fn(),
}));

jest.mock("@/lib/services/resumeGenerationOrchestrator", () => ({
  processSyncGeneration: jest.fn(),
  processFunctionCallingGeneration: jest.fn(),
}));

describe("POST /api/resume/generate", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (handleApiError as jest.Mock).mockImplementation(
      (error: unknown, message: string, status = 500) =>
        new Response(JSON.stringify({ error: message }), { status }),
    );

    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
      error: null,
    });

    (getUserTier as jest.Mock).mockResolvedValue("premium");
    (BillingService.checkBudget as jest.Mock).mockResolvedValue(true);
    (getResumeCount as jest.Mock).mockResolvedValue(0);

    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetIn: 60000,
    });
  });

  it("replays bulk-paste + frustration conversation and does not increment resume creation cap when no resume is created", async () => {
    const conversationHistory = [
      {
        content:
          "Hi, I'm Anil, email anil@test.com, targeting senior SWE roles",
        isUser: true,
      },
      {
        content: "Great! Tell me about your work experience.",
        isUser: false,
      },
      {
        content: `JPMC - Senior SWE (2020-Present)\nBuilt microservices, led team of 5\nTEKsystems - SWE (2018-2020)\nDeveloped REST APIs\nIBM - Junior Dev (2015-2018)\nMaintained Java apps`,
        isUser: true,
      },
      {
        content: "Great experience at JPMC! Tell me about your education.",
        isUser: false,
      },
      { content: "S.B.C.E, 2010-2014, ECE, 7.2 CGPA", isUser: true },
      { content: "What about your education details?", isUser: false },
    ];

    (processSyncGeneration as jest.Mock).mockResolvedValue({
      requestId: "req-123",
      created: false,
      progress: 72,
      response:
        "Sorry about that! I captured your education already. Want me to create the resume now?",
      needsClarification: false,
      sessionData: {
        name: "Anil",
        email: "anil@test.com",
      },
    });

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "req-123",
      },
      body: JSON.stringify({
        message: "Already mentioned right",
        conversationHistory,
        async: false,
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.created).toBe(false);
    expect(json.response).toContain("Sorry about that");

    expect(processSyncGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        message: "Already mentioned right",
        conversationHistory,
        requestId: "req-123",
        entrypoint: "resume_generate",
      }),
    );

    expect(checkDistributedRateLimit).toHaveBeenNthCalledWith(
      1,
      "user-123",
      expect.objectContaining({
        tier: "premium",
        scope: "conversation_turn",
      }),
    );

    expect(checkDistributedRateLimit).toHaveBeenNthCalledWith(
      2,
      "user-123",
      expect.objectContaining({
        limit: RESUME_GENERATION_HARD_CAP.limit,
        windowMs: RESUME_GENERATION_HARD_CAP.windowMs,
        scope: "resume_creation",
        dryRun: true,
      }),
    );

    // No post-create increment if a resume was not created
    expect(checkDistributedRateLimit).toHaveBeenCalledTimes(2);
  });

  it("increments resume creation cap only after successful creation", async () => {
    (processSyncGeneration as jest.Mock).mockResolvedValue({
      requestId: "req-created",
      created: true,
      resumeId: "resume-1",
      numericId: 1,
      progress: 100,
      response: "RESUME_COMPLETE",
    });

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "req-created",
      },
      body: JSON.stringify({
        message: "go ahead and build it",
        conversationHistory: [
          {
            content: "My name is Anil and my email is anil@test.com",
            isUser: true,
          },
        ],
        async: false,
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.created).toBe(true);
    expect(json.resumeId).toBe("resume-1");

    expect(checkDistributedRateLimit).toHaveBeenCalledTimes(3);
    expect(checkDistributedRateLimit).toHaveBeenNthCalledWith(
      3,
      "user-123",
      expect.objectContaining({
        limit: RESUME_GENERATION_HARD_CAP.limit,
        windowMs: RESUME_GENERATION_HARD_CAP.windowMs,
        scope: "resume_creation",
      }),
    );
  });

  it("returns 429 with preserved-progress message when conversation turn rate limit is exhausted", async () => {
    (checkDistributedRateLimit as jest.Mock).mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetIn: 125000, // 2.08 minutes -> should round up to 3
    });

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "req-rate-limit",
      },
      body: JSON.stringify({
        message: "Already mentioned right",
        conversationHistory: [
          {
            content:
              "Hi, I'm Anil, email anil@test.com, targeting senior SWE roles",
            isUser: true,
          },
        ],
        async: false,
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toContain("You're sending messages too quickly");
    expect(json.error).toContain("Please wait a few minutes");
    expect(json.error).toContain("Your conversation progress is saved");

    expect(checkDistributedRateLimit).toHaveBeenCalledTimes(1);
    expect(checkDistributedRateLimit).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({
        tier: "premium",
        scope: "conversation_turn",
      }),
    );

    // Should short-circuit before any resume-generation orchestration
    expect(processSyncGeneration).not.toHaveBeenCalled();
  });
});
