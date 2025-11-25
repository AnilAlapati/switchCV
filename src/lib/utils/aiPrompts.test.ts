import { getPromptForStage, FALLBACK_RESPONSES } from "./aiPrompts";
import { ResumeData } from "@/hooks/useResumeDataCollection";

describe("aiPrompts", () => {
  const mockData: ResumeData = {
    jobTarget: "Software Engineer",
    experience: "5 years of React development",
    skills: "React, TypeScript",
    education: "BS CS",
    personalInfo: {
      name: "John Doe",
    },
  };

  describe("getPromptForStage", () => {
    it("should return greeting prompt for initial stage", () => {
      const prompt = getPromptForStage("initial", mockData);
      expect(prompt).toContain("You are a professional AI Resume Assistant");
      expect(prompt).toContain("Greeting:");
    });

    it("should return experience prompt with job target", () => {
      const prompt = getPromptForStage("experience", mockData);
      expect(prompt).toContain("You are a professional resume coach");
      expect(prompt).toContain(mockData.jobTarget);
      expect(prompt).toContain("Question:");
    });

    it("should return experience prompt with empty job target if missing", () => {
      const prompt = getPromptForStage("experience", {});
      expect(prompt).toContain("You are a professional resume coach");
      expect(prompt).toContain('""'); // Empty string in quotes
    });

    it("should return skills prompt with job target and experience", () => {
      const prompt = getPromptForStage("skills", mockData);
      expect(prompt).toContain("You are a professional resume coach");
      expect(prompt).toContain(mockData.jobTarget);
      expect(prompt).toContain(mockData.experience);
      expect(prompt).toContain("Question:");
    });

    it("should return skills prompt with empty strings if data missing", () => {
      const prompt = getPromptForStage("skills", {});
      expect(prompt).toContain("You are a professional resume coach");
      expect(prompt).toContain('""');
    });

    it("should return education prompt with job target", () => {
      const prompt = getPromptForStage("education", mockData);
      expect(prompt).toContain("You are a professional resume coach");
      expect(prompt).toContain(mockData.jobTarget);
      expect(prompt).toContain("Question:");
    });

    it("should return education prompt with empty job target if missing", () => {
      const prompt = getPromptForStage("education", {});
      expect(prompt).toContain("You are a professional resume coach");
      expect(prompt).toContain('""');
    });

    it("should return personal prompt", () => {
      const prompt = getPromptForStage("personal", mockData);
      expect(prompt).toContain("You are a professional resume coach");
      expect(prompt).toContain("contact information");
      expect(prompt).toContain("Question:");
    });

    it("should return default prompt for unknown stage", () => {
      // @ts-expect-error - Testing invalid stage
      const prompt = getPromptForStage("unknown", mockData);
      expect(prompt).toBe("Tell me more about that.");
    });
  });

  describe("FALLBACK_RESPONSES", () => {
    it("should have fallback for experience", () => {
      expect(FALLBACK_RESPONSES.experience).toBeDefined();
      expect(FALLBACK_RESPONSES.experience).toContain("work experience");
    });

    it("should have fallback for skills", () => {
      expect(FALLBACK_RESPONSES.skills).toBeDefined();
      expect(FALLBACK_RESPONSES.skills).toContain("key skills");
    });

    it("should have fallback for education", () => {
      expect(FALLBACK_RESPONSES.education).toBeDefined();
      expect(FALLBACK_RESPONSES.education).toContain("educational background");
    });

    it("should have fallback for personal", () => {
      expect(FALLBACK_RESPONSES.personal).toBeDefined();
      expect(FALLBACK_RESPONSES.personal).toContain("full name");
    });
  });
});
