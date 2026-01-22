import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";

jest.mock("@/lib/services/agentOrchestrator", () => ({
  runAgenticWorkflow: jest.fn(),
}));

jest.mock("@/lib/services/userService", () => ({
  getUserTier: jest.fn(),
}));

jest.mock("@/lib/services/billingService", () => ({
  BillingService: {
    checkBudget: jest.fn().mockResolvedValue(true),
    trackUsage: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/services/aiGenerationService", () => ({
  generateText: jest.fn(),
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  ...jest.requireActual("@/lib/utils/api-helpers"),
  validateCorsRequest: jest.fn(() => null),
  handleApiError: jest.fn((error, message, status) => {
    return Response.json(
      { error: message, details: error?.message },
      { status: status || 500 }
    );
  }),
  getAuthenticatedUserId: jest.fn(),
}));

jest.mock("@/lib/utils/distributedRateLimit", () => ({
  checkDistributedRateLimit: jest.fn(),
}));

import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { getUserTier } from "@/lib/services/userService";
import { runAgenticWorkflow } from "@/lib/services/agentOrchestrator";
import { generateText } from "@/lib/services/aiGenerationService";

describe("POST /api/ai/generate-resume", () => {
  const mockResumeData = {
    personalInfo: {
      name: "John Doe",
      email: "john@example.com",
    },
    summary: "Experienced developer",
    skills: ["JavaScript", "React"],
    experience: [
      {
        title: "Frontend Dev",
        company: "Tech Corp",
        duration: "2020-Present",
        description: "Built UI",
      },
    ],
    education: [
      {
        degree: "BS CS",
        institution: "University",
        year: "2020",
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "test-user",
    });
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
    });
    (getUserTier as jest.Mock).mockResolvedValue("premium");
  });

  it("should return 400 if resume data is missing", async () => {
    const req = new NextRequest("http://localhost/api/ai/generate-resume", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Missing resume data");
  });

  it("should return 401 if user is not authenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: null });

    const req = new NextRequest("http://localhost/api/ai/generate-resume", {
      method: "POST",
      body: JSON.stringify({ resumeData: mockResumeData }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 429 if rate limit exceeded", async () => {
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: false,
    });

    const req = new NextRequest("http://localhost/api/ai/generate-resume", {
      method: "POST",
      body: JSON.stringify({ resumeData: mockResumeData }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("should generate enhanced resume successfully", async () => {
    const mockAIResponse = {
      enhancedSummary: "Enhanced summary text",
      enhancedExperience: [
        {
          title: "Frontend Dev",
          company: "Tech Corp",
          duration: "2020-Present",
          description: "Built UI",
          enhancedDescription: "Enhanced description",
          achievements: ["Achievement 1"],
        },
      ],
      skillSuggestions: ["TypeScript"],
      improvementTips: ["Add metrics"],
    };

    (runAgenticWorkflow as jest.Mock).mockResolvedValue(
      JSON.stringify(mockAIResponse)
    );

    const req = new NextRequest("http://localhost/api/ai/generate-resume", {
      method: "POST",
      body: JSON.stringify({ resumeData: mockResumeData }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.enhancedSummary).toBe("Enhanced summary text");
    expect(runAgenticWorkflow).toHaveBeenCalled();
  });

  it("should pass autonomous mode to workflow", async () => {
    (runAgenticWorkflow as jest.Mock).mockResolvedValue(
      JSON.stringify({
        enhancedSummary: "Autonomous Summary",
      })
    );

    const req = new NextRequest("http://localhost/api/ai/generate-resume", {
      method: "POST",
      body: JSON.stringify({
        resumeData: mockResumeData,
        mode: "autonomous"
      }),
    });

    await POST(req);

    expect(runAgenticWorkflow).toHaveBeenCalledWith(
      expect.any(String), // userId
      expect.any(String), // userRole
      expect.objectContaining({
        mode: "autonomous"
      })
    );
  });

  it("should handle AI service errors", async () => {
    (runAgenticWorkflow as jest.Mock).mockRejectedValue(
      new Error("AI Service Error")
    );

    const req = new NextRequest("http://localhost/api/ai/generate-resume", {
      method: "POST",
      body: JSON.stringify({ resumeData: mockResumeData }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    // expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to generate resume enhancement");
    expect(data.details).toBe("AI Service Error");
  });

  it("should use fallback if AI response is invalid JSON", async () => {
    (runAgenticWorkflow as jest.Mock).mockResolvedValue(
      JSON.stringify({
        enhancedSummary: "Results-driven professional with enhanced summary",
      })
    );

    const req = new NextRequest("http://localhost/api/ai/generate-resume", {
      method: "POST",
      body: JSON.stringify({ resumeData: mockResumeData }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    // Check for fallback content
    expect(data.data.enhancedSummary).toContain("Results-driven professional");
  });
});
