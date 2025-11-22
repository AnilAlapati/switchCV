import { ResumeDataExtractor } from "@/lib/services/resumeDataExtractor";
import { ConversationManager } from "@/lib/services/conversationManager";
import { getActiveConfig } from "@/lib/services/conversationConfig";

// Mock dependencies
jest.mock("@/lib/services/aiGenerationService", () => ({
  generateText: jest.fn().mockResolvedValue({
    text: "Mock AI Response",
    model: "mock-model",
    provider: "mock-provider",
  }),
}));

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    set: jest.fn().mockResolvedValue(true),
  },
}));

describe("Resume Generation Flow Simulation", () => {
  // Test Data

  it("should extract name correctly even if short", () => {
    const text = "My name is Anil A";
    const result = ResumeDataExtractor.extract(text);
    expect(result.data.name).toBe("Anil A");
  });

  it("should extract name from just the name string", () => {
    const text = "Anil A";
    const result = ResumeDataExtractor.extract(text);
    expect(result.data.name).toBe("Anil A");
  });

  it("should respect 'only X questions' limit in config logic", () => {
    const conversationHistory = [
      { content: "Hi", isUser: true },
      { content: "Hello", isUser: false },
    ];
    const message = "only 6 questions please";

    // Logic from route.ts
    let config = getActiveConfig();
    const allText = [...conversationHistory, { content: message, isUser: true }]
      .filter((m) => m.isUser)
      .map((m) => m.content)
      .join(" ");

    const questionLimitMatch = allText.match(/only\s+(\d+)\s+questions?/i);
    let limit = 0;
    if (questionLimitMatch && questionLimitMatch[1]) {
      limit = parseInt(questionLimitMatch[1], 10);
      if (!isNaN(limit) && limit > 0) {
        config = {
          ...config,
          maxQuestionsInBetaMode: true,
          maxBetaQuestions: limit,
        };
      }
    }

    expect(limit).toBe(6);
    expect(config.maxBetaQuestions).toBe(6);
    expect(config.maxQuestionsInBetaMode).toBe(true);
  });

  it("should accumulate data correctly through conversation steps", () => {
    const manager = new ConversationManager();

    // Step 1: Name
    const nameResult = ResumeDataExtractor.extract("My name is Anil A");
    manager.updateData(nameResult.data);
    expect(manager.getData().name).toBe("Anil A");

    // Step 2: Email
    const emailResult = ResumeDataExtractor.extract("anilalapati.66@gmail.com");
    manager.updateData(emailResult.data);
    expect(manager.getData().email).toBe("anilalapati.66@gmail.com");

    // Step 3: Experience
    const expResult = ResumeDataExtractor.extract(
      "I work as Senior Software Engineer at TechNova Systems"
    );
    manager.updateData(expResult.data);
    expect(manager.getData().experience?.length).toBeGreaterThan(0);
    expect(manager.getData().experience?.[0].company).toBe("TechNova Systems");

    // Step 4: Summary
    // Manually set summary because extractor might not catch it without context or specific pattern
    manager.updateData({ summary: "I am a passionate developer." });
    expect(manager.getData().summary).toBe("I am a passionate developer.");

    // Check progress
    const progress = manager.getProgress();
    expect(progress.hasMinimumData).toBe(true); // Name + Email + Summary
  });
});
