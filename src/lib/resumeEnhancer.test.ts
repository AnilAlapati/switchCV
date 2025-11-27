// src/lib/resumeEnhancer.test.ts
import {
  analyzeATS,
  analyzeFormatting,
  generateOptimizationTips,
  analyzeKeywords,
  generateResumeEnhancement,
  getFormattingRecommendations,
} from "@/lib/resumeEnhancer";
import type { Resume } from "@/lib/resumeComparison.types";

// Mock resume for testing
const mockResume: Resume = {
  id: "test-resume",
  title: "Senior Software Engineer",
  summary:
    "Experienced software engineer with 10+ years of experience in full-stack development",
  skills: ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL"],
  experience: [
    {
      company: "Tech Company",
      role: "Senior Engineer",
      duration: "2020-Present",
      startDate: "2020-01-01",
      description:
        "Led development of microservices. Managed team of 5 engineers.",
    },
    {
      company: "Another Corp",
      role: "Software Engineer",
      duration: "2018-2020",
      startDate: "2018-01-01",
      description: "Developed REST APIs and increased performance by 40%.",
    },
  ],
  education: [
    {
      institution: "State University",
      degree: "BS",
      field: "Computer Science",
      year: 2010,
    },
  ],
  contact: {
    email: { value: "test@example.com" },
    phone: { value: "555-1234" },
  },
};

describe("resumeEnhancer", () => {
  describe("analyzeATS", () => {
    it("should return score and report for valid resume", () => {
      const result = analyzeATS(mockResume);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.report)).toBe(true);
    });

    it("should penalize missing email", () => {
      const resumeNoEmail = {
        ...mockResume,
        contact: {
          ...mockResume.contact,
          email: { value: "" },
        },
      };
      const result = analyzeATS(resumeNoEmail);
      expect(result.score).toBeLessThanOrEqual(80);
      expect(result.report.some((r) => r.includes("Email"))).toBe(true);
    });

    it("should penalize missing experience", () => {
      const resumeNoExp = { ...mockResume, experience: [] };
      const result = analyzeATS(resumeNoExp);
      expect(result.score).toBeLessThan(85);
      expect(result.report.some((r) => r.includes("experience"))).toBe(true);
    });

    it("should penalize few skills", () => {
      const resumeFewSkills = {
        ...mockResume,
        skills: mockResume.skills.slice(0, 2),
      };
      const result = analyzeATS(resumeFewSkills);
      expect(result.report.some((r) => r.includes("Too few skills"))).toBe(
        true
      );
    });
  });

  describe("analyzeFormatting", () => {
    it("should detect well-structured formatting", () => {
      const formatting = analyzeFormatting(mockResume);
      expect(formatting).toMatch(/Standard|Well-Structured/);
    });

    it("should handle resume with bullet points", () => {
      const resumeWithBullets = {
        ...mockResume,
        experience: [
          {
            ...mockResume.experience[0],
            description: "• Led development\n• Managed team",
          },
        ],
      };
      const formatting = analyzeFormatting(resumeWithBullets);
      expect(formatting).toBeTruthy();
    });
  });

  describe("generateOptimizationTips", () => {
    it("should return array of tips", () => {
      const tips = generateOptimizationTips(mockResume);
      expect(Array.isArray(tips)).toBe(true);
      expect(tips.length).toBeGreaterThan(0);
    });

    it("should suggest keyword usage", () => {
      const tips = generateOptimizationTips(mockResume);
      expect(tips.some((t) => t.includes("keyword"))).toBe(true);
    });

    it("should suggest simplifying format", () => {
      const tips = generateOptimizationTips(mockResume);
      expect(tips.some((t) => t.includes("simple"))).toBe(true);
    });

    it("should suggest metrics", () => {
      const tips = generateOptimizationTips(mockResume);
      expect(tips.some((t) => t.includes("metric"))).toBe(true);
    });

    it("should suggest expanding skills if few", () => {
      const resumeFewSkills = {
        ...mockResume,
        skills: mockResume.skills.slice(0, 3),
      };
      const tips = generateOptimizationTips(resumeFewSkills);
      expect(tips.some((t) => t.includes("Expand skills"))).toBe(true);
    });
  });

  describe("analyzeKeywords", () => {
    it("should extract current keywords from skills", () => {
      const result = analyzeKeywords(mockResume);
      expect(Array.isArray(result.currentKeywords)).toBe(true);
      expect(result.currentKeywords.length).toBeGreaterThan(0);
      expect(result.currentKeywords).toContain("javascript");
    });

    it("should suggest technical keywords", () => {
      const result = analyzeKeywords(mockResume);
      expect(Array.isArray(result.suggestedKeywords)).toBe(true);
      expect(result.suggestedKeywords.length).toBeGreaterThan(0);
    });

    it("should calculate keyword score", () => {
      const result = analyzeKeywords(mockResume);
      expect(result.keywordScore).toBeGreaterThanOrEqual(0);
      expect(result.keywordScore).toBeLessThanOrEqual(100);
    });

    it("should match job description keywords", () => {
      const jobDescription = "JavaScript React TypeScript developer needed";
      const result = analyzeKeywords(mockResume, jobDescription);
      expect(result.keywordScore).toBeGreaterThan(30);
    });

    it("should handle poor job description match", () => {
      const jobDescription = "COBOL Fortran ALGOL programmer wanted";
      const result = analyzeKeywords(mockResume, jobDescription);
      expect(result.keywordScore).toBeLessThan(50);
    });
  });

  describe("generateResumeEnhancement", () => {
    it("should return comprehensive enhancement result", () => {
      const result = generateResumeEnhancement(mockResume);
      expect(result.atsScore).toBeDefined();
      expect(Array.isArray(result.atsReport)).toBe(true);
      expect(result.formattingAnalysis).toBeDefined();
      expect(Array.isArray(result.optimizationTips)).toBe(true);
      expect(result.keywordAnalysis).toBeDefined();
      expect(result.comparativeAnalysis).toBeDefined();
    });

    it("should include strengths in comparative analysis", () => {
      const result = generateResumeEnhancement(mockResume);
      expect(Array.isArray(result.comparativeAnalysis.strengths)).toBe(true);
      expect(result.comparativeAnalysis.strengths.length).toBeGreaterThan(0);
    });

    it("should include weaknesses or improvements", () => {
      const result = generateResumeEnhancement(mockResume);
      const hasWeaknesses = result.comparativeAnalysis.weaknesses.length > 0;
      const hasImprovements =
        result.comparativeAnalysis.improvements.length > 0;
      expect(hasWeaknesses || hasImprovements).toBe(true);
    });

    it("should work with job description", () => {
      const jobDescription = "React TypeScript Node.js developer";
      const result = generateResumeEnhancement(mockResume, jobDescription);
      expect(result.keywordAnalysis.keywordScore).toBeGreaterThan(40);
    });
  });

  describe("getFormattingRecommendations", () => {
    it("should return array of recommendations", () => {
      const recommendations = getFormattingRecommendations(mockResume);
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it("should suggest action verbs when missing", () => {
      const resumeNoActions = {
        ...mockResume,
        experience: [
          {
            ...mockResume.experience[0],
            description: "worked on stuff that was done",
          },
        ],
      };
      const recommendations = getFormattingRecommendations(resumeNoActions);
      expect(recommendations.some((r) => r.includes("action verb"))).toBe(true);
    });

    it("should suggest metrics when missing", () => {
      const resumeNoMetrics = {
        ...mockResume,
        experience: [
          {
            ...mockResume.experience[0],
            description: "Led development of systems",
          },
        ],
      };
      const recommendations = getFormattingRecommendations(resumeNoMetrics);
      expect(recommendations.some((r) => r.includes("metric"))).toBe(true);
    });

    it("should not recommend title if present", () => {
      const recommendations = getFormattingRecommendations(mockResume);
      expect(
        recommendations.some((r) => r.includes("professional title"))
      ).toBe(false);
    });

    it("should suggest title if missing", () => {
      const resumeNoTitle = { ...mockResume, title: "" };
      const recommendations = getFormattingRecommendations(resumeNoTitle);
      expect(
        recommendations.some((r) => r.includes("professional title"))
      ).toBe(true);
    });
  });
});
