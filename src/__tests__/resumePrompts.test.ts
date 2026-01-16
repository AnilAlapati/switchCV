import { buildConversationalPrompt } from "../lib/services/resumePrompts";

describe("buildConversationalPrompt", () => {
  it("should include collected data in the prompt when provided", () => {
    const userMessage = "My email is test@example.com";
    const conversationHistory = [
      { content: "What is your name?", isUser: false },
      { content: "My name is John Doe", isUser: true },
    ];
    const currentProgress = {
      hasName: true,
      hasEmail: false,
    };
    const collectedData = {
      name: "John Doe",
      experience: [
        {
          title: "Developer",
          company: "Tech Corp",
          duration: "2020-2021",
          description: "Worked on stuff",
        },
      ],
    };

    const prompt = buildConversationalPrompt(
      userMessage,
      conversationHistory,
      currentProgress,
      collectedData
    );

    // Check if the prompt contains the collected data section
    expect(prompt).toContain("CURRENTLY COLLECTED DATA:");
    expect(prompt).toContain('"name": "John Doe"');
    expect(prompt).toContain('"title": "Developer"');
    expect(prompt).toContain('"company": "Tech Corp"');
  });

  it("should not include collected data section if data is not provided", () => {
    const userMessage = "Hello";
    const conversationHistory: Array<{ role: string; content: string }> = [];

    const prompt = buildConversationalPrompt(userMessage, conversationHistory);

    expect(prompt).not.toContain("CURRENTLY COLLECTED DATA:");
  });
});
