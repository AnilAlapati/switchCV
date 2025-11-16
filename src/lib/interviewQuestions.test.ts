/**
 * Interview Questions Generator Tests
 */

import { generateInterviewQuestions } from "@/lib/interviewQuestions";

describe("Interview Questions Generator", () => {
  const jobTitle = "Senior Software Engineer";

  describe("generateInterviewQuestions", () => {
    it("should generate questions with correct count", () => {
      const questions = generateInterviewQuestions(jobTitle, 5);
      expect(questions).toHaveLength(5);
    });

    it("should include different question types", () => {
      const questions = generateInterviewQuestions(jobTitle, 6);
      const categories = questions.map((q) => q.category);

      expect(categories.some((c) => c === "behavioral")).toBe(true);
      expect(categories.some((c) => c === "technical")).toBe(true);
      expect(categories.some((c) => c === "role-specific")).toBe(true);
    });

    it("should have valid difficulty levels", () => {
      const questions = generateInterviewQuestions(jobTitle, 5);

      questions.forEach((q) => {
        expect(["easy", "medium", "hard"]).toContain(q.difficulty);
      });
    });

    it("should include tips for each question", () => {
      const questions = generateInterviewQuestions(jobTitle, 3);

      questions.forEach((q) => {
        expect(Array.isArray(q.tips)).toBe(true);
        expect(q.tips.length).toBeGreaterThan(0);
      });
    });

    it("should have time limits", () => {
      const questions = generateInterviewQuestions(jobTitle, 3);

      questions.forEach((q) => {
        expect(q.timeLimit).toBeGreaterThan(0);
        expect(q.timeLimit).toBeLessThanOrEqual(300);
      });
    });

    it("should have unique question IDs", () => {
      const questions = generateInterviewQuestions(jobTitle, 5);
      const ids = questions.map((q) => q.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(questions.length);
    });

    it("should generate role-specific questions for engineers", () => {
      const questions = generateInterviewQuestions(
        "Senior Software Engineer",
        5
      );
      const hasRoleSpecific = questions.some(
        (q) => q.category === "role-specific"
      );

      expect(hasRoleSpecific).toBe(true);
    });

    it("should generate different questions for different roles", () => {
      const engineerQuestions = generateInterviewQuestions(
        "Software Engineer",
        5
      );
      const dataQuestions = generateInterviewQuestions("Data Scientist", 5);

      const engineerTexts = engineerQuestions.map((q) => q.question);
      const dataTexts = dataQuestions.map((q) => q.question);

      // Should have some different questions
      const overlap = engineerTexts.filter((text) =>
        dataTexts.includes(text)
      ).length;
      expect(overlap).toBeLessThan(engineerTexts.length);
    });
  });
});
