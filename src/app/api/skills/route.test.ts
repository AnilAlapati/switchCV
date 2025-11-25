// src/app/api/skills/route.test.ts
/**
 * Test suite for Skills API
 * Tests skill inventory management, gap analysis, and job comparison functionality
 */

import { NextRequest } from "next/server";
import { POST } from "./route";

// Mock the skill inventory functions
jest.mock("@/lib/skillInventory", () => ({
  createSkill: jest.fn(),
  initializeSkillInventory: jest.fn(),
  addSkillToInventory: jest.fn(),
}));

// Mock the gap analysis functions
jest.mock("@/lib/gapAnalysis", () => ({
  performGapAnalysis: jest.fn(),
  compareJobFit: jest.fn(),
}));

import {
  createSkill,
  initializeSkillInventory,
  addSkillToInventory,
} from "@/lib/skillInventory";
import { performGapAnalysis, compareJobFit } from "@/lib/gapAnalysis";
import {
  SkillInventory,
  JobPosting,
  ProficiencyLevel,
  SkillCategory,
} from "@/lib/skillMatrix.types";

const mockCreateSkill = createSkill as jest.MockedFunction<typeof createSkill>;
const mockInitializeSkillInventory =
  initializeSkillInventory as jest.MockedFunction<
    typeof initializeSkillInventory
  >;
const mockAddSkillToInventory = addSkillToInventory as jest.MockedFunction<
  typeof addSkillToInventory
>;
const mockPerformGapAnalysis = performGapAnalysis as jest.MockedFunction<
  typeof performGapAnalysis
>;
const mockCompareJobFit = compareJobFit as jest.MockedFunction<
  typeof compareJobFit
>;

describe("POST /api/skills", () => {
  let mockRequest: NextRequest;

  const mockInventory: SkillInventory = {
    id: "inv_123",
    userId: "user_123",
    skills: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJobPosting: JobPosting = {
    id: "job_123",
    title: "Senior Developer",
    description: "Looking for experienced developer",
    requirements: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      json: jest.fn(),
    } as unknown as NextRequest;
  });

  describe("create-inventory action", () => {
    it("should create skill inventory successfully", async () => {
      mockInitializeSkillInventory.mockReturnValue(mockInventory);

      (mockRequest.json as jest.Mock).mockResolvedValue({
        action: "create-inventory",
        userId: "user_123",
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe("inv_123");
      expect(data.userId).toBe("user_123");
      expect(data.skills).toEqual([]);
      expect(mockInitializeSkillInventory).toHaveBeenCalledWith("user_123");
    });

    it("should return 400 when userId is missing", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        action: "create-inventory",
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("userId is required");
    });
  });

  describe("add-skill action", () => {
    it("should add skill successfully", async () => {
      const mockSkill = {
        id: "skill_123",
        name: "JavaScript",
        category: SkillCategory.TECHNICAL,
        proficiencyLevel: ProficiencyLevel.ADVANCED,
      };

      mockCreateSkill.mockReturnValue(mockSkill);
      mockAddSkillToInventory.mockReturnValue({
        ...mockInventory,
        skills: [mockSkill],
      });

      (mockRequest.json as jest.Mock).mockResolvedValue({
        action: "add-skill",
        inventory: mockInventory,
        name: "JavaScript",
        category: "technical",
        proficiencyLevel: "advanced",
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockCreateSkill).toHaveBeenCalledWith(
        "JavaScript",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.ADVANCED,
        undefined,
        undefined
      );
    });

    it("should return 400 when required fields are missing", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        action: "add-skill",
        inventory: mockInventory,
        name: "JavaScript",
        category: "technical",
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "inventory, name, category, and proficiencyLevel are required"
      );
    });
  });

  describe("analyze-gap action", () => {
    it("should analyze skill gaps successfully", async () => {
      const mockReport = {
        id: "report_123",
        userId: "user_123",
        jobPostingId: "job_123",
        jobTitle: "Senior Developer",
        analyzedAt: new Date(),
        overallReadiness: 85,
        skillGaps: [],
        matchPercentage: 85,
        criticalGapsCount: 0,
        strengths: [],
        recommendations: [],
        estimatedTimeToReady: 30,
      };

      mockPerformGapAnalysis.mockReturnValue(mockReport);

      (mockRequest.json as jest.Mock).mockResolvedValue({
        action: "analyze-gap",
        inventory: mockInventory,
        jobPosting: mockJobPosting,
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockPerformGapAnalysis).toHaveBeenCalledWith(
        mockInventory,
        mockJobPosting
      );
    });

    it("should return 400 when required fields are missing", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        action: "analyze-gap",
        inventory: mockInventory,
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("inventory and jobPosting are required");
    });
  });

  describe("compare-jobs action", () => {
    it("should compare jobs successfully", async () => {
      const mockComparisons = [
        {
          job: mockJobPosting,
          report: {
            id: "report_1",
            userId: "user_123",
            jobPostingId: "job_123",
            jobTitle: "Senior Developer",
            analyzedAt: new Date(),
            overallReadiness: 90,
            skillGaps: [],
            matchPercentage: 90,
            criticalGapsCount: 0,
            strengths: [],
            recommendations: [],
            estimatedTimeToReady: 15,
          },
        },
      ];

      mockCompareJobFit.mockReturnValue(mockComparisons);

      (mockRequest.json as jest.Mock).mockResolvedValue({
        action: "compare-jobs",
        inventory: mockInventory,
        jobs: [mockJobPosting],
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockCompareJobFit).toHaveBeenCalledWith(mockInventory, [
        mockJobPosting,
      ]);
    });

    it("should return 400 when required fields are missing", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        action: "compare-jobs",
        inventory: mockInventory,
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("inventory and jobs array are required");
    });
  });

  describe("invalid action", () => {
    it("should return 400 for invalid action", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        action: "invalid-action",
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Unknown action");
    });
  });
});
