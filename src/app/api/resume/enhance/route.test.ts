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
  },
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
      expect(data.error).toBe("Invalid resume data");
    });

    it("should return 400 when resume is not an object", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        resume: "invalid-resume",
        jobDescription: "Software Engineer position",
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid resume data");
    });

    it("should return 400 when resume is null", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        resume: null,
        jobDescription: "Software Engineer position",
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid resume data");
    });

    it("should accept empty resume object and process it", async () => {
      const mockResult = {
        atsScore: 70,
        atsReport: ["Basic ATS compatibility"],
        formattingAnalysis: {
          formatting: "Basic",
          suggestions: ["Add more structure"],
        },
        optimizationTips: ["Add more details"],
        keywordAnalysis: {
          currentKeywords: [],
          suggestedKeywords: ["JavaScript", "React"],
          keywordScore: 30,
        },
        comparativeAnalysis: {
          strengths: [],
          weaknesses: ["No experience", "No skills"],
          improvements: ["Add experience", "Add skills"],
        },
      };

      mockGenerateResumeEnhancement.mockReturnValue(mockResult);

      (mockRequest.json as jest.Mock).mockResolvedValue({
        resume: {},
        jobDescription: "Software Engineer position",
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
    });
  });

  describe("Successful Enhancement", () => {
    const mockResume = {
      title: "Senior Software Engineer",
      summary:
        "Experienced software engineer with 5+ years of expertise in full-stack development",
      experience: [
        {
          company: "Tech Corp",
          position: "Software Engineer",
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
          graduationDate: "2019-05-15",
        },
      ],
      skills: ["JavaScript", "React", "Node.js", "Python", "SQL"],
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
        mockResume,
        "Senior Software Engineer position requiring React and Node.js experience"
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
        mockResume,
        undefined
      );
    });

    it("should handle resume with minimal data", async () => {
      const minimalResume = {
        title: "Developer",
        summary: "Software developer",
        experience: [],
        education: [],
        skills: ["JavaScript"],
      };

      (mockRequest.json as jest.Mock).mockResolvedValue({
        resume: minimalResume,
        jobDescription: "Frontend Developer",
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockGenerateResumeEnhancement).toHaveBeenCalledWith(
        minimalResume,
        "Frontend Developer"
      );
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when generateResumeEnhancement throws an error", async () => {
      const mockResume = {
        title: "Software Engineer",
        summary: "Experienced developer",
        experience: [],
        education: [],
        skills: ["JavaScript"],
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
        "Error enhancing resume:",
        expect.any(Error)
      );
    });

    it("should return 500 when JSON parsing fails", async () => {
      (mockRequest.json as jest.Mock).mockRejectedValue(
        new SyntaxError("Invalid JSON")
      );

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to enhance resume");
      expect(logger.error).toHaveBeenCalledWith(
        "Error enhancing resume:",
        expect.any(SyntaxError)
      );
    });

    it("should return 500 when request.json throws unexpected error", async () => {
      (mockRequest.json as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to enhance resume");
      expect(logger.error).toHaveBeenCalledWith(
        "Error enhancing resume:",
        expect.any(Error)
      );
    });

    it("should handle null error from generateResumeEnhancement", async () => {
      const mockResume = {
        title: "Software Engineer",
        summary: "Experienced developer",
        experience: [],
        education: [],
        skills: ["JavaScript"],
      };

      (mockRequest.json as jest.Mock).mockResolvedValue({
        resume: mockResume,
      });

      mockGenerateResumeEnhancement.mockImplementation(() => {
        throw null;
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to enhance resume");
      expect(logger.error).toHaveBeenCalledWith(
        "Error enhancing resume:",
        null
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty job description string", async () => {
      const mockResume = {
        title: "Software Engineer",
        summary: "Experienced developer",
        experience: [],
        education: [],
        skills: ["JavaScript"],
      };

      (mockRequest.json as jest.Mock).mockResolvedValue({
        resume: mockResume,
        jobDescription: "",
      });

      const mockResult = {
        atsScore: 70,
        atsReport: ["Basic ATS compatibility"],
        formattingAnalysis: {
          formatting: "Basic",
          suggestions: ["Add more structure"],
        },
        optimizationTips: ["Add more details"],
        keywordAnalysis: {
          currentKeywords: ["JavaScript"],
          suggestedKeywords: ["React", "Node.js"],
          keywordScore: 50,
        },
        comparativeAnalysis: {
          strengths: ["Basic skills"],
          weaknesses: ["Limited experience"],
          improvements: ["Add projects"],
        },
      };

      mockGenerateResumeEnhancement.mockReturnValue(mockResult);

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockGenerateResumeEnhancement).toHaveBeenCalledWith(
        mockResume,
        ""
      );
    });
  });
});
