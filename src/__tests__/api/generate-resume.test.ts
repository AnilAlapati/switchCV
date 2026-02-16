import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/ai/generate-resume/route";
import { generateText } from "@/lib/services/aiGenerationService";
import { runAgenticWorkflow } from "@/lib/services/agentOrchestrator";

jest.mock("@/lib/services/aiGenerationService");
jest.mock("@/lib/services/agentOrchestrator");
jest.mock("@/lib/logger");

jest.mock("@/lib/services/billingService", () => ({
  BillingService: {
    checkBudget: jest.fn(() => Promise.resolve(true)),
    trackUsage: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("@/lib/services/userService", () => ({
  getTierForRole: jest.fn(() => Promise.resolve("premium")),
}));

jest.mock("@/lib/utils/cors", () => ({
  createCorsHeaders: jest.fn(() => new Headers()),
  handleCorsPreflightRequest: jest.fn(),
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  handleApiError: jest.fn((err, msg, status) =>
    require("next/server").NextResponse.json(
      { error: msg || "Internal Server Error", success: false },
      { status: status || 500 }
    )
  ),
  getAuthenticatedUserId: jest.fn(),
  validateCorsRequest: jest.fn(() => null),
}));

jest.mock("@/lib/utils/distributedRateLimit", () => ({
  checkDistributedRateLimit: jest.fn(),
}));

import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";

describe("Generate Resume API", () => {
  const mockResumeData = {
    personalInfo: { name: "John Doe", email: "john@example.com" },
    summary: "Old summary",
    skills: ["React"],
    experience: [
      { title: "Dev", company: "Co", duration: "1y", description: "desc" },
    ],
    education: [{ degree: "BS", institution: "Uni", year: "2020" }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "test-user",
    });
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
    });
  });

  it("should return 400 if resumeData is missing", async () => {
    const req = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
    expect(handleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Validation failed for request body",
      400,
      expect.any(NextRequest)
    );
  });

  it("should return enhanced resume on success", async () => {
    (runAgenticWorkflow as jest.Mock).mockResolvedValue({
      resumeMarkdown: JSON.stringify({
        enhancedSummary: "New summary",
        enhancedExperience: [
          {
            title: "Dev",
            company: "Co",
            duration: "1y",
            description: "desc",
            enhancedDescription: "better desc",
            achievements: ["A1"],
          },
        ],
        skillSuggestions: ["Node"],
        improvementTips: ["Tip"],
      }),
      templateId: undefined,
      reasoning: undefined
    });

    const req = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ resumeData: mockResumeData }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.enhancedSummary).toBe("New summary");
    expect(data.model).toBe("agentic-workflow");
  });

  it("should use fallback if AI response is invalid JSON", async () => {
    (runAgenticWorkflow as jest.Mock).mockResolvedValue(null);
    (generateText as jest.Mock).mockResolvedValue({
      text: "Not JSON",
      model: "gemini-pro",
      provider: "google",
    });

    const req = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ resumeData: mockResumeData }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.enhancedSummary).toContain("Results-driven professional");
  });

  it("should handle AI service errors", async () => {
    (runAgenticWorkflow as jest.Mock).mockResolvedValue(null);
    (generateText as jest.Mock).mockRejectedValue(new Error("AI Failed"));

    const req = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ resumeData: mockResumeData }),
    });
    const response = await POST(req);
    expect(response.status).toBe(500);
    expect(handleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Failed to generate resume enhancement",
      500,
      expect.any(NextRequest)
    );
  });
});
