// src/app/api/resume/enhance/route.test.ts
/**
 * Test suite for Resume Enhancement API
 * Tests ATS scoring, optimization tips, and keyword analysis functionality
 */

import { NextRequest } from "next/server";
import { POST } from "./route";

// Mock the resumeEnhancer module
jest.mock("@/lib/resumeEnhancer", () => ({
  generateResumeEnhancement: jest.fn(),
}));

// Mock the logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock api-helpers to properly handle handleApiError
jest.mock("@/lib/utils/api-helpers", () => {
  const { NextResponse } = require("next/server");
  return {
    handleApiError: jest.fn(
      (error, message = "Internal server error", status = 500) => {
        return NextResponse.json(
          {
            error: message,
            details:
              error instanceof Error
                ? error.message
                : error
                  ? String(error)
                  : undefined,
          },
          { status },
        );
      },
    ),
    getAuthenticatedUserId: jest.fn().mockResolvedValue({ userId: "user-123" }),
    safeParseBody: jest.fn(async (req) => {
      return await req.json();
    }),
  };
});

// Mock rateLimit
jest.mock("@/lib/utils/rateLimit", () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true }),
}));

// Mock distributedRateLimit (route uses this instead of in-memory rateLimit)
jest.mock("@/lib/utils/distributedRateLimit", () => ({
  checkDistributedRateLimit: jest
    .fn()
    .mockResolvedValue({ allowed: true, remaining: 10 }),
}));

import { generateResumeEnhancement } from "@/lib/resumeEnhancer";
import { logger } from "@/lib/logger";

const mockGenerateResumeEnhancement =
  generateResumeEnhancement as jest.MockedFunction<
    typeof generateResumeEnhancement
  >;

describe("POST /api/resume/enhance", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock request
    mockRequest = {
      json: jest.fn(),
      headers: new Headers(),
      ip: "127.0.0.1",
    } as unknown as NextRequest;
  });

  describe("Input Validation", () => {
    it("should return 400 when resume is missing", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        jobDescription: "Software Engineer position",
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid resume data");
    });

    it("should return 400 when resume is not an object", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        resume: "invalid-resume",
        jobDescription: "Software Engineer position",
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid resume data");
    });

    it("should return 400 when resume is null", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        resume: null,
        jobDescription: "Software Engineer position",
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid resume data");
    });
  });

  describe("Successful Enhancement", () => {
    const mockResume = {
      id: "resume-123",
      title: "Senior Software Engineer",
      summary:
        "Experienced software engineer with 5+ years of expertise in full-stack development",
      experience: [
        {
          company: "Tech Corp",
          role: "Software Engineer",
          duration: "3 years",
          startDate: "2020-01-01",
          endDate: "2023-12-31",
          description:
            "Developed and maintained web applications using React and Node.js",
        },
      ],
      education: [
        {
          institution: "University of Technology",
          degree: "Bachelor of Science in Computer Science",
          field: "Computer Science",
          year: 2019,
          graduationDate: "2019-05-15",
        },
      ],
      skills: ["JavaScript", "React", "Node.js", "Python", "SQL"],
      contact: {
        email: { value: "test@example.com" },
      },
    };

    const mockEnhancementResult = {
      atsScore: 85,
      atsReport: ["Resume looks good for ATS systems"],
      formattingAnalysis: {
        formatting: "Professional",
        suggestions: ["Consider using bullet points for better readability"],
      },
      optimizationTips: [
        "Add more quantifiable achievements",
        "Include relevant keywords from job description",
      ],
      keywordAnalysis: {
        currentKeywords: ["JavaScript", "React", "Node.js"],
        suggestedKeywords: ["TypeScript", "AWS", "Docker"],
        keywordScore: 75,
      },
      comparativeAnalysis: {
        strengths: ["Strong technical skills", "Good experience level"],
        weaknesses: ["Could add more certifications"],
        improvements: ["Add LinkedIn profile", "Include GitHub projects"],
      },
    };

    beforeEach(() => {
      mockGenerateResumeEnhancement.mockReturnValue(mockEnhancementResult);
    });

    it("should successfully enhance resume with valid data", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        resume: mockResume,
        jobDescription:
          "Senior Software Engineer position requiring React and Node.js experience",
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockEnhancementResult);
      expect(mockGenerateResumeEnhancement).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Senior Software Engineer" }),
        "Senior Software Engineer position requiring React and Node.js experience",
      );
    });

    it("should enhance resume without job description", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        resume: mockResume,
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockEnhancementResult);
      expect(mockGenerateResumeEnhancement).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Senior Software Engineer" }),
        undefined,
      );
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when generateResumeEnhancement throws an error", async () => {
      const mockResume = {
        id: "resume-123",
        title: "Software Engineer",
        summary: "Experienced developer",
        experience: [],
        education: [],
        skills: ["JavaScript"],
        contact: { email: { value: "test@example.com" } },
      };

      (mockRequest.json as jest.Mock).mockResolvedValue({
        resume: mockResume,
      });

      mockGenerateResumeEnhancement.mockImplementation(() => {
        throw new Error("Enhancement analysis failed");
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to enhance resume");
      expect(logger.error).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        "Error enhancing resume:",
      );
    });

    it("should return 500 when JSON parsing fails", async () => {
      (mockRequest.json as jest.Mock).mockRejectedValue(
        new SyntaxError("Invalid JSON"),
      );

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to enhance resume");
    });
  });
});
