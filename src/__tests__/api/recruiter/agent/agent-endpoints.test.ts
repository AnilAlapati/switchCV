import { POST as outreachRoute } from "@/app/api/recruiter/agent/outreach/route";
import { POST as analyzeRoute } from "@/app/api/recruiter/agent/analyze/route";
import { POST as screenRoute } from "@/app/api/recruiter/agent/screen/route";
import { POST as interviewPrepRoute } from "@/app/api/recruiter/agent/interview-prep/route";
import { POST as pipelineSuggestRoute } from "@/app/api/recruiter/agent/pipeline-suggest/route";
import { POST as enhanceJobRoute } from "@/app/api/recruiter/agent/enhance-job/route";
import { RecruiterAgentService } from "@/lib/services/recruiterAgentService";
import { NextRequest } from "next/server";

// Mock the service
jest.mock("@/lib/services/recruiterAgentService", () => ({
  RecruiterAgentService: {
    generateOutreachMessage: jest.fn(),
    analyzeMatch: jest.fn(),
    screenCandidate: jest.fn(),
    generateInterviewPrep: jest.fn(),
    suggestPipelineAction: jest.fn(),
    enhanceJobDescription: jest.fn(),
  },
}));

jest.mock("@/lib/services/userService", () => ({
  getUserRole: jest.fn().mockResolvedValue("recruiter"),
}));

// Mock auth helper
jest.mock("@/lib/utils/api-helpers", () => {
  const { NextResponse } = require("next/server");
  return {
    getAuthenticatedUserId: jest
      .fn()
      .mockResolvedValue({ userId: "test-user", error: null }),
    handleApiError: jest.fn((err, msg, status) =>
      NextResponse.json(
        { error: msg || "Internal Server Error" },
        { status: status || 500 }
      )
    ),
  };
});

describe("Recruiter Agent Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Outreach Agent", () => {
    it("should return generated message", async () => {
      (
        RecruiterAgentService.generateOutreachMessage as jest.Mock
      ).mockResolvedValue("Hello candidate!");

      const req = new NextRequest(
        "http://localhost/api/recruiter/agent/outreach",
        {
          method: "POST",
          body: JSON.stringify({
            candidate: { name: "John" },
            job: { title: "Dev" },
          }),
        },
      );

      const res = await outreachRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe("Hello candidate!");
      expect(RecruiterAgentService.generateOutreachMessage).toHaveBeenCalled();
    });

    it("should return 400 for missing data", async () => {
      const req = new NextRequest(
        "http://localhost/api/recruiter/agent/outreach",
        {
          method: "POST",
          body: JSON.stringify({ candidate: { name: "John" } }), // Missing job
        },
      );

      const res = await outreachRoute(req);
      expect(res.status).toBe(400);
    });
  });

  describe("Analyze Agent", () => {
    it("should return analysis", async () => {
      (RecruiterAgentService.analyzeMatch as jest.Mock).mockResolvedValue(
        "- Good match",
      );

      const req = new NextRequest(
        "http://localhost/api/recruiter/agent/analyze",
        {
          method: "POST",
          body: JSON.stringify({
            candidate: { name: "John" },
            job: { title: "Dev" },
          }),
        },
      );

      const res = await analyzeRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.analysis).toBe("- Good match");
      expect(RecruiterAgentService.analyzeMatch).toHaveBeenCalled();
    });
  });

  describe("Screen Agent", () => {
    it("should return screening results", async () => {
      const mockResult = {
        score: 85,
        summary: "Strong candidate",
        flags: ["No remote experience"],
        highlights: ["10 years React"],
      };
      (RecruiterAgentService.screenCandidate as jest.Mock).mockResolvedValue(
        mockResult,
      );

      const req = new NextRequest(
        "http://localhost/api/recruiter/agent/screen",
        {
          method: "POST",
          body: JSON.stringify({
            candidate: { name: "John", skills: ["React", "Node.js"] },
            criteria: { mustHave: ["React"], niceToHave: ["TypeScript"] },
          }),
        },
      );

      const res = await screenRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.score).toBe(85);
      expect(data.highlights).toContain("10 years React");
      expect(RecruiterAgentService.screenCandidate).toHaveBeenCalled();
    });

    it("should return 400 for missing mustHave criteria", async () => {
      const req = new NextRequest(
        "http://localhost/api/recruiter/agent/screen",
        {
          method: "POST",
          body: JSON.stringify({
            candidate: { name: "John" },
            criteria: { niceToHave: ["TypeScript"] }, // Missing mustHave
          }),
        },
      );

      const res = await screenRoute(req);
      expect(res.status).toBe(400);
    });
  });

  describe("Interview Prep Agent", () => {
    it("should return interview prep materials", async () => {
      const mockResult = {
        questions: ["Tell me about yourself", "Why this role?"],
        brief: "Strong technical candidate with 5 years experience",
        areasToProbe: ["Gap in employment 2020-2021"],
      };
      (
        RecruiterAgentService.generateInterviewPrep as jest.Mock
      ).mockResolvedValue(mockResult);

      const req = new NextRequest(
        "http://localhost/api/recruiter/agent/interview-prep",
        {
          method: "POST",
          body: JSON.stringify({
            candidate: { name: "John", title: "Senior Engineer" },
            job: { title: "Tech Lead" },
            interviewType: "technical",
          }),
        },
      );

      const res = await interviewPrepRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.questions).toHaveLength(2);
      expect(data.brief).toContain("Strong technical candidate");
      expect(RecruiterAgentService.generateInterviewPrep).toHaveBeenCalledWith(
        expect.objectContaining({ interviewType: "technical" }),
      );
    });
  });

  describe("Pipeline Suggest Agent", () => {
    it("should return pipeline suggestion", async () => {
      const mockResult = {
        suggestedAction: "Schedule technical interview",
        reasoning: "Candidate passed phone screen with strong results",
        priority: "high",
      };
      (
        RecruiterAgentService.suggestPipelineAction as jest.Mock
      ).mockResolvedValue(mockResult);

      const req = new NextRequest(
        "http://localhost/api/recruiter/agent/pipeline-suggest",
        {
          method: "POST",
          body: JSON.stringify({
            candidate: { name: "John" },
            currentStage: "Phone Screen Complete",
            interactionHistory: "Phone screen on Jan 15, positive feedback",
          }),
        },
      );

      const res = await pipelineSuggestRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.suggestedAction).toBe("Schedule technical interview");
      expect(data.priority).toBe("high");
      expect(RecruiterAgentService.suggestPipelineAction).toHaveBeenCalled();
    });

    it("should return 400 for missing currentStage", async () => {
      const req = new NextRequest(
        "http://localhost/api/recruiter/agent/pipeline-suggest",
        {
          method: "POST",
          body: JSON.stringify({
            candidate: { name: "John" },
            // Missing currentStage
          }),
        },
      );

      const res = await pipelineSuggestRoute(req);
      expect(res.status).toBe(400);
    });
  });

  describe("Enhance Job Agent", () => {
    it("should return enhanced job description", async () => {
      const mockResult = {
        enhancedDescription:
          "We're looking for a talented Software Engineer...",
        suggestedRequirements: ["5+ years experience", "React expertise"],
        searchKeywords: ["software engineer", "react", "frontend"],
      };
      (
        RecruiterAgentService.enhanceJobDescription as jest.Mock
      ).mockResolvedValue(mockResult);

      const req = new NextRequest(
        "http://localhost/api/recruiter/agent/enhance-job",
        {
          method: "POST",
          body: JSON.stringify({
            job: {
              title: "Software Engineer",
              description: "Looking for an engineer",
            },
          }),
        },
      );

      const res = await enhanceJobRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.enhancedDescription).toContain("talented Software Engineer");
      expect(data.searchKeywords).toContain("react");
      expect(RecruiterAgentService.enhanceJobDescription).toHaveBeenCalled();
    });

    it("should return 400 for missing job title", async () => {
      const req = new NextRequest(
        "http://localhost/api/recruiter/agent/enhance-job",
        {
          method: "POST",
          body: JSON.stringify({
            job: { description: "Some description" }, // Missing title
          }),
        },
      );

      const res = await enhanceJobRoute(req);
      expect(res.status).toBe(400);
    });
  });
});
