import { getPromptForStage } from "@/lib/utils/aiPrompts";
import { ResumeData, ConversationStage } from "@/hooks/useResumeDataCollection";

describe("aiPrompts", () => {
  const mockData: ResumeData = {
    jobTarget: "Software Engineer",
    experience: "5 years in React",
  };

  it("should return greeting for initial stage", () => {
    const prompt = getPromptForStage("initial", mockData);
    expect(prompt).toContain("Greeting:");
  });

  it("should return experience prompt", () => {
    const prompt = getPromptForStage("experience", mockData);
    expect(prompt).toContain("Software Engineer");
    expect(prompt).toContain("Question:");
  });

  it("should return skills prompt", () => {
    const prompt = getPromptForStage("skills", mockData);
    expect(prompt).toContain("Software Engineer");
    expect(prompt).toContain("5 years in React");
    expect(prompt).toContain("Question:");
  });

  it("should return education prompt", () => {
    const prompt = getPromptForStage("education", mockData);
    expect(prompt).toContain("Software Engineer");
    expect(prompt).toContain("Question:");
  });

  it("should return personal prompt", () => {
    const prompt = getPromptForStage("personal", mockData);
    expect(prompt).toContain("Question:");
  });

  it("should return default prompt for unknown stage", () => {
    const prompt = getPromptForStage("unknown" as ConversationStage, mockData);
    expect(prompt).toBe("Tell me more about that.");
  });
});
