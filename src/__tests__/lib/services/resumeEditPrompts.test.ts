import {
  buildResumeEditPrompt,
  extractResumeEditJSON,
  isResumeEditCompletion,
  stripEditArtifacts,
  getResumeEditGreeting,
  RESUME_EDIT_ASSISTANT_SYSTEM_PROMPT,
} from "@/lib/services/resumeEditPrompts";

describe("resumeEditPrompts", () => {
  describe("buildResumeEditPrompt", () => {
    it("should build a prompt with resume snapshot", () => {
      const prompt = buildResumeEditPrompt({
        userMessage: "Change my title",
        conversationHistory: [{ content: "Hello", isUser: true }],
        resumeSnapshot: {
          profile: {
            title: "Old Title",
            summary: "Old Summary",
          },
          resume: {
            title: "Old Title",
            summary: "Old Summary",
          },
        } as any,
        pendingSummary: "Changed title",
      });

      expect(prompt).toContain(RESUME_EDIT_ASSISTANT_SYSTEM_PROMPT);
      expect(prompt).toContain("CURRENT RESUME SNAPSHOT:");
      expect(prompt).toContain("Old Title");
      expect(prompt).toContain(
        "RECENT CHANGE SUMMARY TO REMEMBER: Changed title"
      );
      expect(prompt).toContain("Conversation so far:");
      expect(prompt).toContain("User: Hello");
      expect(prompt).toContain('Latest user message: "Change my title"');
    });

    it("should build a prompt without resume snapshot", () => {
      const prompt = buildResumeEditPrompt({
        userMessage: "I want to edit",
        conversationHistory: [],
        resumeSnapshot: null,
      });

      expect(prompt).toContain("No resume exists for this user");
    });
  });

  describe("extractResumeEditJSON", () => {
    it("should extract valid JSON", () => {
      const json = { isComplete: true, updatedProfile: { title: "New" } };
      const response = `Here is the json:\n\`\`\`json\n${JSON.stringify(
        json
      )}\n\`\`\``;
      const result = extractResumeEditJSON(response);
      expect(result).toEqual(json);
    });

    it("should return null for invalid JSON", () => {
      const response = "No json here";
      const result = extractResumeEditJSON(response);
      expect(result).toBeNull();
    });

    it("should return null for malformed JSON", () => {
      const response = "```json\n{ invalid json \n```";
      const result = extractResumeEditJSON(response);
      expect(result).toBeNull();
    });
  });

  describe("isResumeEditCompletion", () => {
    it("should return true if marker exists", () => {
      expect(isResumeEditCompletion("Done. RESUME_EDIT_COMPLETE")).toBe(true);
    });

    it("should return false if marker missing", () => {
      expect(isResumeEditCompletion("Not done yet")).toBe(false);
    });
  });

  describe("stripEditArtifacts", () => {
    it("should remove artifacts", () => {
      const text =
        "Here is the update.\nRESUME_EDIT_COMPLETE\n```json\n{}\n```\nThanks.";
      const result = stripEditArtifacts(text);
      expect(result).toBe("Here is the update.\n\nThanks.");
    });
  });

  describe("getResumeEditGreeting", () => {
    it("should return no resume message", () => {
      const msg = getResumeEditGreeting(false);
      expect(msg).toContain("couldn’t find a resume");
    });

    it("should return greeting with name and title", () => {
      const msg = getResumeEditGreeting(true, "My Resume", "John");
      expect(msg).toContain("Hi John!");
      expect(msg).toContain("My Resume");
    });

    it("should return default greeting", () => {
      const msg = getResumeEditGreeting(true);
      expect(msg).toContain("Hi there!");
      expect(msg).toContain("your resume");
    });
  });
});
