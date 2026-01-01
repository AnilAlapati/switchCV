import {
  getInitialGreeting,
  buildConversationalPrompt,
  buildResumeCreationPrompt,
  isCompletionResponse,
  extractResumeJSON,
  getFollowUpQuestion,
  getProgressMessage,
  RESUME_ASSISTANT_SYSTEM_PROMPT,
} from "@/lib/services/resumePrompts";
import { getActiveConfig } from "@/lib/services/conversationConfig";

// Mock the config
jest.mock("@/lib/services/conversationConfig", () => ({
  getActiveConfig: jest.fn(),
}));

describe("resumePrompts", () => {
  const mockConfig = {
    contextWindowSize: 5,
    enableSmartQuestions: false,
    maxQuestionsInBetaMode: false,
    maxBetaQuestions: 10,
    priorityFields: ["name", "email", "experience"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getActiveConfig as jest.Mock).mockReturnValue(mockConfig);
  });

  describe("getInitialGreeting", () => {
    it("should return the greeting string", () => {
      const greeting = getInitialGreeting();
      expect(greeting).toContain("Hey! I'm your Career Coach AI");
      expect(greeting).toContain("name, email, and what kind of role");
    });
  });

  describe("buildConversationalPrompt", () => {
    const mockHistory = [
      { content: "Hi", isUser: true },
      { content: "Hello", isUser: false },
    ];

    it("should build a basic prompt with history", () => {
      const prompt = buildConversationalPrompt("My name is John", mockHistory);
      expect(prompt).toContain(RESUME_ASSISTANT_SYSTEM_PROMPT);
      expect(prompt).toContain("User: Hi");
      expect(prompt).toContain("Assistant: Hello");
      expect(prompt).toContain('User\'s latest message: "My name is John"');
    });

    it("should include collected data if provided", () => {
      const collectedData = { name: "John" };
      const prompt = buildConversationalPrompt(
        "msg",
        [],
        undefined,
        collectedData
      );
      expect(prompt).toContain("CURRENTLY COLLECTED DATA:");
      expect(prompt).toContain('"name": "John"');
    });

    it("should handle forceCreate flag", () => {
      const prompt = buildConversationalPrompt(
        "create it",
        [],
        undefined,
        undefined,
        undefined,
        true
      );
      expect(prompt).toContain(
        "USER REQUEST: The user explicitly wants to create the resume NOW"
      );
      expect(prompt).toContain('Generate the "RESUME_COMPLETE" response');
    });

    it("should include missing info hints", () => {
      const progress = {
        hasName: true,
        hasEmail: false,
        hasExperience: false,
        hasEducation: true,
        hasSkills: true,
      };
      const prompt = buildConversationalPrompt("msg", [], progress);
      expect(prompt).toContain("MISSING INFO: email, work experience");
    });

    it("should indicate completion when all info is present", () => {
      const progress = {
        hasName: true,
        hasEmail: true,
        hasExperience: true,
        hasEducation: true,
        hasSkills: true,
      };
      const prompt = buildConversationalPrompt("msg", [], progress);
      expect(prompt).toContain(
        "INFO COMPLETE: All required information collected"
      );
    });

    describe("Beta Mode Smart Questions", () => {
      beforeEach(() => {
        (getActiveConfig as jest.Mock).mockReturnValue({
          ...mockConfig,
          enableSmartQuestions: true,
          maxQuestionsInBetaMode: true,
          maxBetaQuestions: 4,
        });
      });

      it("should ask smart questions when under limit", () => {
        // 2 messages in history = 1 question asked (approx)
        const prompt = buildConversationalPrompt("msg", mockHistory, {
          hasName: false,
        });
        expect(prompt).toContain("BETA MODE: Ask ONE smart question");
        expect(prompt).toContain("REMAINING QUESTIONS ALLOWED:");
      });

      it("should force completion when limit reached", () => {
        // 10 messages in history = 5 questions asked > 4 max
        const longHistory = Array(10).fill({ content: "msg", isUser: true });
        const prompt = buildConversationalPrompt("msg", longHistory, {
          hasName: false,
        });
        expect(prompt).toContain("BETA MODE: Maximum questions reached");
        expect(prompt).toContain("Offer to create resume");
      });
    });
  });

  describe("buildResumeCreationPrompt", () => {
    it("should build prompt with collected data", () => {
      const data = { name: "John", email: "john@example.com" };
      const prompt = buildResumeCreationPrompt(data);
      expect(prompt).toContain(
        "Based on the following information, create a professional resume"
      );
      expect(prompt).toContain('"name": "John"');
      expect(prompt).toContain('"email": "john@example.com"');
    });
  });

  describe("isCompletionResponse", () => {
    it("should detect completion indicators", () => {
      expect(isCompletionResponse("RESUME_COMPLETE")).toBe(true);
      expect(isCompletionResponse("Here is the JSON: ```json ...")).toBe(true);
      expect(isCompletionResponse("I have all the information")).toBe(true);
    });

    it("should return false for normal conversation", () => {
      expect(isCompletionResponse("What is your email?")).toBe(false);
      expect(isCompletionResponse("Hello there")).toBe(false);
    });
  });

  describe("extractResumeJSON", () => {
    it("should extract valid JSON from code block", () => {
      const json = { isComplete: true, name: "John" };
      const response = `Here is the resume:
\`\`\`json
${JSON.stringify(json)}
\`\`\`
Thanks!`;
      const result = extractResumeJSON(response);
      expect(result).toEqual(json);
    });

    it("should return null if JSON is invalid", () => {
      const response = `\`\`\`json
{ invalid json
\`\`\``;
      expect(extractResumeJSON(response)).toBeNull();
    });

    it("should return null if no JSON block found", () => {
      expect(extractResumeJSON("No json here")).toBeNull();
    });

    it("should return null if isComplete is missing/false", () => {
      const json = { name: "John" };
      const response = `\`\`\`json
${JSON.stringify(json)}
\`\`\``;
      expect(extractResumeJSON(response)).toBeNull();
    });
  });

  describe("getFollowUpQuestion", () => {
    it("should return specific question for known field", () => {
      expect(getFollowUpQuestion(["name"])).toContain("full name and email");
      expect(getFollowUpQuestion(["email"])).toContain("email address");
      expect(getFollowUpQuestion(["phone"])).toContain("phone number");
    });

    it("should return generic question for unknown field", () => {
      expect(getFollowUpQuestion(["unknown"])).toContain(
        "I need more information about your unknown"
      );
    });
  });

  describe("getProgressMessage", () => {
    it("should return appropriate message for percentage", () => {
      expect(getProgressMessage(10)).toContain("Great start");
      expect(getProgressMessage(40)).toContain("making good progress");
      expect(getProgressMessage(60)).toContain("Excellent");
      expect(getProgressMessage(90)).toContain("Almost done");
      expect(getProgressMessage(100)).toContain("Perfect");
    });
  });
});
