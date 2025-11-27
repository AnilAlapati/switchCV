/**
 * Resume Comparison Tests
 */

import {
  compareResumes,
  calculateComparisonScore,
} from "@/lib/resumeComparison";
import { Resume } from "@/lib/resumeComparison.types";

const mockResume1: Resume = {
  id: "resume-1",
  title: "Senior Software Engineer",
  contact: {
    email: { value: "test1@example.com" },
    phone: { value: "123-456-7890" },
  },
  summary: "Experienced full-stack developer with 8 years",
  skills: ["javascript", "react", "typescript", "node.js", "sql", "docker"],
  experience: [
    {
      company: "Tech Corp",
      role: "Senior Engineer",
      duration: "3 years",
      description: "Led development team",
    },
  ],
  education: [
    {
      institution: "State University",
      degree: "Bachelor",
      field: "Computer Science",
      year: 2016,
    },
  ],
  languages: ["English", "Spanish"],
};

const mockResume2: Resume = {
  id: "resume-2",
  title: "Senior Software Engineer",
  contact: {
    email: { value: "test2@example.com" },
    phone: { value: "098-765-4321" },
  },
  summary: "Full-stack developer passionate about solutions",
  skills: ["javascript", "react", "node.js", "python", "sql", "kubernetes"],
  experience: [
    {
      company: "StartupXYZ",
      role: "Senior Engineer",
      duration: "2 years",
      description: "Built microservices",
    },
    {
      company: "Previous Corp",
      role: "Software Engineer",
      duration: "3 years",
      description: "Developed features",
    },
  ],
  education: [
    {
      institution: "State University",
      degree: "Bachelor",
      field: "Computer Science",
      year: 2016,
    },
    {
      institution: "Online Academy",
      degree: "Certification",
      field: "Data Science",
      year: 2023,
    },
  ],
  languages: ["English"],
};

describe("Resume Comparison Engine", () => {
  describe("compareResumes", () => {
    it("should return comparison result with correct structure", () => {
      const result = compareResumes(mockResume1, mockResume2);

      expect(result).toHaveProperty("resumeIds");
      expect(result).toHaveProperty("overallScore");
      expect(result).toHaveProperty("sections");
      expect(result).toHaveProperty("differences");
      expect(result).toHaveProperty("similarities");
      expect(result).toHaveProperty("recommendations");
    });

    it("should calculate overall score between 0 and 100", () => {
      const result = compareResumes(mockResume1, mockResume2);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it("should identify resume IDs correctly", () => {
      const result = compareResumes(mockResume1, mockResume2);

      expect(result.resumeIds).toEqual(["resume-1", "resume-2"]);
    });

    it("should include all sections in comparison", () => {
      const result = compareResumes(mockResume1, mockResume2);

      const sectionNames = result.sections.map((s) => s.section);
      expect(sectionNames).toContain("Basic Info");
      expect(sectionNames).toContain("Skills");
      expect(sectionNames).toContain("Experience");
      expect(sectionNames).toContain("Education");
    });

    it("should detect skill differences", () => {
      const result = compareResumes(mockResume1, mockResume2);

      expect(result.differences.length).toBeGreaterThan(0);
      const skillDiffs = result.differences.filter((d) => d.field === "Skill");
      expect(skillDiffs.length).toBeGreaterThan(0);
    });

    it("should generate recommendations", () => {
      const result = compareResumes(mockResume1, mockResume2);

      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should identify similarities", () => {
      const result = compareResumes(mockResume1, mockResume2);

      expect(result.similarities.length).toBeGreaterThan(0);
    });

    it("should score each section correctly", () => {
      const result = compareResumes(mockResume1, mockResume2);

      result.sections.forEach((section) => {
        expect(section.score1).toBeGreaterThanOrEqual(0);
        expect(section.score1).toBeLessThanOrEqual(100);
        expect(section.score2).toBeGreaterThanOrEqual(0);
        expect(section.score2).toBeLessThanOrEqual(100);
      });
    });

    it("should include details in each section", () => {
      const result = compareResumes(mockResume1, mockResume2);

      result.sections.forEach((section) => {
        expect(Array.isArray(section.details)).toBe(true);
        expect(section.details.length).toBeGreaterThan(0);
      });
    });

    it("should handle minimal resume data", () => {
      const minimalResume: Resume = {
        id: "minimal",
        title: "Developer",
        contact: {
          email: { value: "min@example.com" },
          phone: { value: "000-000-0000" },
        },
        skills: ["java"],
        experience: [],
        education: [],
      };

      const result = compareResumes(minimalResume, mockResume1);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it("should handle case-insensitive skill matching", () => {
      const caseVariedResume: Resume = {
        ...mockResume1,
        skills: ["JavaScript", "REACT", "TypeScript"],
      };

      const result = compareResumes(caseVariedResume, mockResume2);

      expect(result.similarities.length).toBeGreaterThan(0);
      expect(result.overallScore).toBeGreaterThan(50);
    });

    it("should detect experience count differences", () => {
      const result = compareResumes(mockResume1, mockResume2);

      const expDiff = result.differences.find(
        (d) => d.field === "Experience Count"
      );
      expect(expDiff).toBeDefined();
      expect(expDiff?.type).toBe("modified");
    });

    it("should identify high impact differences", () => {
      const resume3: Resume = {
        ...mockResume1,
        title: "Junior Developer",
      };

      const result = compareResumes(resume3, mockResume2);

      const highImpact = result.differences.filter((d) => d.impact === "high");
      expect(highImpact.length).toBeGreaterThan(0);
    });

    it("should handle missing summary gracefully", () => {
      const noSummaryResume: Resume = {
        ...mockResume1,
        summary: undefined,
      };

      const result = compareResumes(noSummaryResume, mockResume2);

      expect(
        result.recommendations.some((r) => r.toLowerCase().includes("summary"))
      ).toBe(true);
    });
  });

  describe("calculateComparisonScore", () => {
    it("should return a number between 0 and 100", () => {
      const score = calculateComparisonScore(mockResume1, mockResume2);

      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should return high score for identical resumes", () => {
      const score = calculateComparisonScore(mockResume1, mockResume1);

      expect(score).toBeGreaterThan(80);
    });

    it("should return different scores for different resumes", () => {
      const score1 = calculateComparisonScore(mockResume1, mockResume2);
      const score2 = calculateComparisonScore(mockResume1, mockResume1);

      expect(score1).not.toBe(score2);
    });
  });

  describe("Difference Types", () => {
    it("should identify added differences", () => {
      const result = compareResumes(mockResume1, mockResume2);

      const addedDiffs = result.differences.filter((d) => d.type === "added");
      expect(addedDiffs.length).toBeGreaterThan(0);
    });

    it("should identify removed differences", () => {
      const result = compareResumes(mockResume1, mockResume2);

      const removedDiffs = result.differences.filter(
        (d) => d.type === "removed"
      );
      expect(removedDiffs.length).toBeGreaterThan(0);
    });

    it("should prioritize differences by impact", () => {
      const result = compareResumes(mockResume1, mockResume2);

      const allImpacts = result.differences.map((d) => d.impact);
      expect(
        allImpacts.every((i) => ["high", "medium", "low"].includes(i))
      ).toBe(true);
    });
  });

  describe("Similarity Detection", () => {
    it("should identify common degrees", () => {
      const result = compareResumes(mockResume1, mockResume2);

      const degreeSimilarity = result.similarities.find((s) =>
        s.toLowerCase().includes("degree")
      );
      expect(degreeSimilarity).toBeDefined();
    });

    it("should mention work experience", () => {
      const result = compareResumes(mockResume1, mockResume2);

      const expSimilarity = result.similarities.find((s) =>
        s.toLowerCase().includes("professional work experience")
      );
      expect(expSimilarity).toBeDefined();
    });
  });

  describe("Recommendations", () => {
    it("should suggest skill improvements", () => {
      const result = compareResumes(mockResume1, mockResume2);

      const skillRec = result.recommendations.find((r) =>
        r.toLowerCase().includes("adding")
      );
      expect(skillRec).toBeDefined();
    });

    it("should be actionable and specific", () => {
      const result = compareResumes(mockResume1, mockResume2);

      result.recommendations.forEach((rec) => {
        expect(rec.length).toBeGreaterThan(10);
        expect(rec).toBeTruthy();
      });
    });
  });
});
