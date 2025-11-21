/**
 * Tests for ResumeDataExtractor
 */

import { ResumeDataExtractor } from "@/lib/services/resumeDataExtractor";

describe("ResumeDataExtractor", () => {
  describe("extract", () => {
    it("should extract name from text", () => {
      const text = "My name is John Doe and I'm a developer";
      const result = ResumeDataExtractor.extract(text);

      expect(result.data.name).toBe("John Doe");
      expect(result.extractedFields).toContain("name");
    });

    it("should extract email from text", () => {
      const text = "You can reach me at john.doe@example.com";
      const result = ResumeDataExtractor.extract(text);

      expect(result.data.email).toBe("john.doe@example.com");
    });

    it("should extract phone number", () => {
      const text = "My phone is 555-123-4567";
      const result = ResumeDataExtractor.extract(text);

      expect(result.data.phone).toBe("555-123-4567");
    });

    it("should extract location", () => {
      const text = "I'm located in San Francisco, CA";
      const result = ResumeDataExtractor.extract(text);

      expect(result.data.location).toContain("San Francisco");
    });

    it("should extract skills", () => {
      const text = "My skills: JavaScript, React, Node.js, TypeScript";
      const result = ResumeDataExtractor.extract(text);

      expect(result.data.skills).toBeDefined();
      expect(result.data.skills?.length).toBeGreaterThan(0);
    });

    it("should detect completion markers", () => {
      const text = "RESUME_COMPLETE - I have all the information needed";
      const result = ResumeDataExtractor.extract(text);

      expect(result.isComplete).toBe(true);
    });

    it("should extract JSON data", () => {
      const text = `Here's your data: \`\`\`json
{
  "name": "John Doe",
  "email": "john@example.com",
  "isComplete": true
}
\`\`\``;
      const result = ResumeDataExtractor.extract(text);

      expect(result.data.name).toBe("John Doe");
      expect(result.data.email).toBe("john@example.com");
      expect(result.isComplete).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });

  describe("extractFromConversation", () => {
    it("should extract from multiple messages", () => {
      const messages = [
        { content: "Hi there!", isUser: false },
        { content: "My name is John Doe", isUser: true },
        { content: "What's your email?", isUser: false },
        { content: "It's john@example.com", isUser: true },
      ];

      const result = ResumeDataExtractor.extractFromConversation(messages);

      expect(result.data.name).toBe("John Doe");
      expect(result.data.email).toBe("john@example.com");
      expect(result.extractedFields.length).toBeGreaterThan(0);
    });

    it("should detect completion from AI messages", () => {
      const messages = [
        { content: "My name is Jane Smith", isUser: true },
        {
          content: "RESUME_COMPLETE - ready to create",
          isUser: false,
        },
      ];

      const result = ResumeDataExtractor.extractFromConversation(messages);

      expect(result.isComplete).toBe(true);
    });
  });

  describe("mergeData", () => {
    it("should merge simple fields", () => {
      const existing = { name: "John" };
      const extracted = { email: "john@example.com" };

      const merged = ResumeDataExtractor.mergeData(existing, extracted);

      expect(merged.name).toBe("John");
      expect(merged.email).toBe("john@example.com");
    });

    it("should override existing values", () => {
      const existing = { name: "John" };
      const extracted = { name: "Jane" };

      const merged = ResumeDataExtractor.mergeData(existing, extracted);

      expect(merged.name).toBe("Jane");
    });

    it("should merge arrays without duplicates", () => {
      const existing = { skills: ["JavaScript", "React"] };
      const extracted = { skills: ["React", "Node.js"] };

      const merged = ResumeDataExtractor.mergeData(existing, extracted);

      expect(merged.skills).toHaveLength(3);
      expect(merged.skills).toContain("JavaScript");
      expect(merged.skills).toContain("React");
      expect(merged.skills).toContain("Node.js");
    });

    it("should concatenate experience arrays", () => {
      const existing = {
        experience: [
          {
            title: "Developer",
            company: "Corp A",
            duration: "2020",
            description: "Work",
          },
        ],
      };
      const extracted = {
        experience: [
          {
            title: "Engineer",
            company: "Corp B",
            duration: "2021",
            description: "More work",
          },
        ],
      };

      const merged = ResumeDataExtractor.mergeData(existing, extracted);

      expect(merged.experience).toHaveLength(2);
    });
  });

  describe("pattern extraction", () => {
    it("should extract work experience mentions", () => {
      const text = "I worked as a Software Engineer at Google";
      const result = ResumeDataExtractor.extract(text);

      expect(result.data.experience).toBeDefined();
      expect(result.data.experience?.length).toBeGreaterThan(0);
    });

    it("should extract education mentions", () => {
      const text = "I have a Bachelor degree in Computer Science from MIT";
      const result = ResumeDataExtractor.extract(text);

      expect(result.data.education).toBeDefined();
      expect(result.data.education?.length).toBeGreaterThan(0);
    });
  });

  describe("confidence scoring", () => {
    it("should have high confidence for JSON data", () => {
      const text = `\`\`\`json
{"name": "John", "email": "john@example.com"}
\`\`\``;
      const result = ResumeDataExtractor.extract(text);

      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    });

    it("should have lower confidence for pattern matching", () => {
      const text = "My name is John";
      const result = ResumeDataExtractor.extract(text);

      expect(result.confidence).toBeLessThan(0.95);
    });
  });
});
