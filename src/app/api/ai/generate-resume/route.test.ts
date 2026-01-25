import { POST } from "./route";
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/services/aiGenerationService";
import { BillingService } from "@/lib/services/billingService";
import { runAgenticWorkflow } from "@/lib/services/agentOrchestrator";
import { getUserTier } from "@/lib/services/userService";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { validateCorsRequest } from "@/lib/utils/api-helpers";

// Mock dependencies
jest.mock("@/lib/services/aiGenerationService", () => ({
    generateText: jest.fn(),
}));

jest.mock("@/lib/services/billingService", () => ({
    BillingService: {
        checkBudget: jest.fn(),
        trackUsage: jest.fn(),
    },
}));

jest.mock("@/lib/services/agentOrchestrator", () => ({
    runAgenticWorkflow: jest.fn(),
}));

jest.mock("@/lib/services/userService", () => ({
    getUserTier: jest.fn(),
}));

jest.mock("@/lib/utils/distributedRateLimit", () => ({
    checkDistributedRateLimit: jest.fn(),
}));

jest.mock("@/lib/utils/api-helpers", () => ({
    handleApiError: jest.fn((error, message, status) => {
        return Response.json({ error: message, details: error?.message }, { status: status || 500 });
    }),
    getAuthenticatedUserId: jest.fn(),
    validateCorsRequest: jest.fn(),
}));

jest.mock("@/lib/utils/cors", () => ({
    createCorsHeaders: jest.fn(() => ({})),
    handleCorsPreflightRequest: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe("POST /api/ai/generate-resume", () => {
    const mockResumeData = {
        personalInfo: { name: "Test User", email: "test@example.com" },
        summary: "Original summary",
        skills: ["React"],
        experience: [],
        education: [],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (validateCorsRequest as jest.Mock).mockReturnValue(null);
        (getUserTier as jest.Mock).mockResolvedValue("premium");
        (checkDistributedRateLimit as jest.Mock).mockResolvedValue({ allowed: true });
        (BillingService.checkBudget as jest.Mock).mockResolvedValue(true);
    });

    const buildRequest = (body: any) =>
        new NextRequest("http://localhost/api/ai/generate-resume", {
            method: "POST",
            body: JSON.stringify(body),
        });

    it("returns 401 if unauthorized", async () => {
        const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
        getAuthenticatedUserId.mockResolvedValueOnce({ userId: null });

        const response = await POST(buildRequest({ resumeData: mockResumeData }));
        expect(response.status).toBe(401);
    });

    it("returns 429 if rate limited", async () => {
        const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
        getAuthenticatedUserId.mockResolvedValueOnce({ userId: "user-123" });
        (checkDistributedRateLimit as jest.Mock).mockResolvedValueOnce({ allowed: false });

        const response = await POST(buildRequest({ resumeData: mockResumeData }));
        expect(response.status).toBe(429);
    });

    it("returns 402 if budget exceeded", async () => {
        const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
        getAuthenticatedUserId.mockResolvedValueOnce({ userId: "user-123" });
        (BillingService.checkBudget as jest.Mock).mockResolvedValueOnce(false);

        const response = await POST(buildRequest({ resumeData: mockResumeData }));
        expect(response.status).toBe(402);
    });

    it("returns 400 for invalid JSON", async () => {
        const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
        getAuthenticatedUserId.mockResolvedValueOnce({ userId: "user-123" });

        const request = new NextRequest("http://localhost/api/ai/generate-resume", {
            method: "POST",
            body: "invalid",
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it("returns 400 if resumeData is missing", async () => {
        const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
        getAuthenticatedUserId.mockResolvedValueOnce({ userId: "user-123" });

        const response = await POST(buildRequest({}));
        expect(response.status).toBe(400);
    });

    it("uses agentic workflow if successful", async () => {
        const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
        getAuthenticatedUserId.mockResolvedValueOnce({ userId: "user-123" });
        (runAgenticWorkflow as jest.Mock).mockResolvedValueOnce(JSON.stringify({
            enhancedSummary: "Agentic Summary",
            enhancedExperience: [],
            skillSuggestions: [],
            improvementTips: []
        }));

        const response = await POST(buildRequest({ resumeData: mockResumeData }));
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.model).toBe("agentic-workflow");
        expect(data.data.enhancedSummary).toBe("Agentic Summary");
    });

    it("falls back to standard flow if agentic workflow fails", async () => {
        const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
        getAuthenticatedUserId.mockResolvedValueOnce({ userId: "user-123" });
        (runAgenticWorkflow as jest.Mock).mockResolvedValueOnce(null);
        (generateText as jest.Mock).mockResolvedValueOnce({
            text: JSON.stringify({
                enhancedSummary: "Standard Summary",
                enhancedExperience: [],
                skillSuggestions: [],
                improvementTips: []
            }),
            model: "gpt-4",
            provider: "openai"
        });

        const response = await POST(buildRequest({ resumeData: mockResumeData }));
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.model).toBe("gpt-4");
        expect(data.data.enhancedSummary).toBe("Standard Summary");
    });

    it("uses fallback enhancement if AI response is malformed", async () => {
        const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
        getAuthenticatedUserId.mockResolvedValueOnce({ userId: "user-123" });
        (runAgenticWorkflow as jest.Mock).mockResolvedValueOnce("not json");

        const response = await POST(buildRequest({ resumeData: mockResumeData }));
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.data.enhancedSummary).toContain("Results-driven");
    });

    it("handles catch block errors", async () => {
        const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
        getAuthenticatedUserId.mockResolvedValueOnce({ userId: "user-123" });
        (runAgenticWorkflow as jest.Mock).mockRejectedValue(new Error("Global Crash"));

        const response = await POST(buildRequest({ resumeData: mockResumeData }));
        expect(response.status).toBe(500);
    });
});
