/**
 * Tests for mockAIResume.ts
 * Tests the mock AI resume enhancement functionality
 */

import {
  generateMockEnhancedResume,
  MockEnhancedResumeContent,
} from "@/lib/mockAIResume";

describe("Mock AI Resume Generator", () => {
  describe("generateMockEnhancedResume", () => {
    const mockName = "John Doe";
    const mockRole = "Software Engineer";
    const mockCompany = "Tech Corp";
    const mockSkills = ["JavaScript", "React", "Node.js"];

    let result: MockEnhancedResumeContent;

    beforeEach(() => {
      // Reset Math.random for consistent testing
      jest.spyOn(Math, "random").mockReturnValue(0);
      result = generateMockEnhancedResume(
        mockName,
        mockRole,
        mockCompany,
        mockSkills
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should return a valid MockEnhancedResumeContent object", () => {
      expect(result).toHaveProperty("enhancedSummary");
      expect(result).toHaveProperty("enhancedExperience");
      expect(result).toHaveProperty("skillSuggestions");
      expect(result).toHaveProperty("improvementTips");

      expect(typeof result.enhancedSummary).toBe("string");
      expect(Array.isArray(result.enhancedExperience)).toBe(true);
      expect(Array.isArray(result.skillSuggestions)).toBe(true);
      expect(Array.isArray(result.improvementTips)).toBe(true);
    });

    it("should generate enhanced summary with provided role and skills", () => {
      expect(result.enhancedSummary).toContain(mockRole);
      expect(result.enhancedSummary).toContain(mockSkills[0]);
      expect(result.enhancedSummary).toContain(mockSkills[1]);
      expect(result.enhancedSummary).toContain("7+");
      expect(result.enhancedSummary).toContain("technology and innovation");
    });

    it("should handle empty skills array", () => {
      const resultWithEmptySkills = generateMockEnhancedResume(
        mockName,
        mockRole,
        mockCompany,
        []
      );
      expect(resultWithEmptySkills.enhancedSummary).toContain("leadership");
      expect(resultWithEmptySkills.enhancedSummary).toContain(
        "problem-solving"
      );
    });

    it("should handle empty role and company", () => {
      const resultWithEmptyFields = generateMockEnhancedResume(
        mockName,
        "",
        "",
        mockSkills
      );
      expect(resultWithEmptyFields.enhancedSummary).toContain("Professional");
      expect(resultWithEmptyFields.enhancedExperience[0].title).toBe(
        "Senior Professional"
      );
      expect(resultWithEmptyFields.enhancedExperience[0].company).toBe(
        "Leading Organization"
      );
    });

    it("should generate enhanced experience with correct structure", () => {
      const experience = result.enhancedExperience[0];

      expect(experience).toHaveProperty("title");
      expect(experience).toHaveProperty("company");
      expect(experience).toHaveProperty("duration");
      expect(experience).toHaveProperty("description");
      expect(experience).toHaveProperty("achievements");
      expect(experience).toHaveProperty("enhancedDescription");

      expect(experience.title).toBe(mockRole);
      expect(experience.company).toBe(mockCompany);
      expect(experience.duration).toBe("2020 - Present");
      expect(Array.isArray(experience.achievements)).toBe(true);
      expect(experience.achievements.length).toBeGreaterThan(0);
    });

    it("should include role and company in enhanced experience description", () => {
      const experience = result.enhancedExperience[0];
      expect(experience.enhancedDescription).toContain(mockRole);
      expect(experience.company).toBe(mockCompany);
      expect(experience.enhancedDescription).toContain(mockSkills[0]);
      expect(experience.enhancedDescription).toContain(mockSkills[1]);
    });

    it("should generate achievements with action verbs and metrics", () => {
      const achievements = result.enhancedExperience[0].achievements;

      expect(achievements.length).toBe(3);
      achievements.forEach((achievement) => {
        expect(typeof achievement).toBe("string");
        expect(achievement.length).toBeGreaterThan(0);
      });

      // First achievement should use the first verb and metric from arrays
      expect(achievements[0]).toContain("Increased");
      expect(achievements[0]).toContain("by 25%");
    });

    it("should generate skill suggestions excluding provided skills", () => {
      expect(result.skillSuggestions.length).toBe(5);
      result.skillSuggestions.forEach((skill) => {
        expect(mockSkills).not.toContain(skill);
        expect(typeof skill).toBe("string");
      });
    });

    it("should handle case where all recommended skills are already provided", () => {
      const allSkills = [
        "Project Management",
        "Strategic Planning",
        "Data Analysis",
        "Cross-functional Leadership",
        "Agile Methodology",
        "Risk Management",
        "Stakeholder Communication",
        "Process Optimization",
        "Business Intelligence",
        "Cloud Architecture",
        "System Design",
        "Performance Optimization",
      ];

      const resultWithAllSkills = generateMockEnhancedResume(
        mockName,
        mockRole,
        mockCompany,
        allSkills
      );
      expect(resultWithAllSkills.skillSuggestions.length).toBe(0);
    });

    it("should generate consistent improvement tips", () => {
      expect(result.improvementTips.length).toBe(6);
      result.improvementTips.forEach((tip) => {
        expect(typeof tip).toBe("string");
        expect(tip.length).toBeGreaterThan(0);
      });

      // Check specific tips are included
      expect(result.improvementTips).toContain(
        "Add quantifiable metrics to all role descriptions (e.g., 'Increased sales by 25%')"
      );
      expect(result.improvementTips).toContain(
        "Include 3-4 bullet points per role with specific achievements"
      );
    });

    it("should use different templates based on random selection", () => {
      // Test with different random values - need to restore between calls
      const mockRandom = jest.spyOn(Math, "random");

      mockRandom.mockReturnValue(0.3); // Second template (0.3 * 3 = 0.9, floor = 0)
      const result2 = generateMockEnhancedResume(
        mockName,
        mockRole,
        mockCompany,
        mockSkills
      );
      expect(result2.enhancedSummary).toContain("Results-driven"); // Actually first template due to calculation

      mockRandom.mockReturnValue(0.6); // Different template (0.6 * 3 = 1.8, floor = 1)
      const result3 = generateMockEnhancedResume(
        mockName,
        mockRole,
        mockCompany,
        mockSkills
      );
      expect(result3.enhancedSummary).toContain("Innovative");

      mockRandom.mockReturnValue(0.9); // Third template (0.9 * 3 = 2.7, floor = 2)
      const result4 = generateMockEnhancedResume(
        mockName,
        mockRole,
        mockCompany,
        mockSkills
      );
      expect(result4.enhancedSummary).toContain("Strategic-minded");
    });

    it("should use different achievement verbs based on random selection", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.1); // Different verb index
      const resultWithDifferentVerb = generateMockEnhancedResume(
        mockName,
        mockRole,
        mockCompany,
        mockSkills
      );
      const firstAchievement =
        resultWithDifferentVerb.enhancedExperience[0].achievements[0];

      // Should use a different verb than "Increased"
      expect(firstAchievement).not.toContain("Increased");
      expect(typeof firstAchievement).toBe("string");
    });

    it("should be deterministic with fixed random seed", () => {
      const result1 = generateMockEnhancedResume(
        mockName,
        mockRole,
        mockCompany,
        mockSkills
      );
      const result2 = generateMockEnhancedResume(
        mockName,
        mockRole,
        mockCompany,
        mockSkills
      );

      expect(result1.enhancedSummary).toBe(result2.enhancedSummary);
      expect(result1.enhancedExperience[0].achievements[0]).toBe(
        result2.enhancedExperience[0].achievements[0]
      );
      expect(result1.skillSuggestions).toEqual(result2.skillSuggestions);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined inputs gracefully", () => {
      expect(() => {
        generateMockEnhancedResume(
          undefined as any,
          undefined as any,
          undefined as any,
          undefined as any
        );
      }).not.toThrow();
    });

    it("should handle null inputs gracefully", () => {
      expect(() => {
        generateMockEnhancedResume(
          null as any,
          null as any,
          null as any,
          null as any
        );
      }).not.toThrow();
    });

    it("should handle very long skill arrays", () => {
      const manySkills = Array.from({ length: 100 }, (_, i) => `Skill${i}`);
      const result = generateMockEnhancedResume(
        "Test",
        "Role",
        "Company",
        manySkills
      );

      expect(result.skillSuggestions.length).toBeLessThanOrEqual(5);
      expect(result).toBeDefined();
    });
  });
});
