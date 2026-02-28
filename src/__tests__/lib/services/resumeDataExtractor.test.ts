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

    it("should NOT extract name from 'I'm starting to...' phrase", () => {
      const text = "I'm starting to get a hang of this";
      const result = ResumeDataExtractor.extract(text);

      expect(result.data.name).toBeUndefined();
    });

    it("should NOT extract name from 'I'm looking for...' phrase", () => {
      const text = "I'm looking for a job in tech";
      const result = ResumeDataExtractor.extract(text);

      expect(result.data.name).toBeUndefined();
    });

    it("should NOT extract name from role phrase like 'I am the solo founder'", () => {
      const text = "I am the solo founder of a startup";
      const result = ResumeDataExtractor.extract(text);

      expect(result.data.name).toBeUndefined();
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

    it("should extract location from text", () => {
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

    it("should not infer substring skills from arbitrary words", () => {
      const text = "I build digital products with guardrails for safety";
      const result = ResumeDataExtractor.extract(text);

      expect(result.data.skills).toBeUndefined();
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

    it("should extract data from RESUME_DATA marker", () => {
      const text = 'RESUME_DATA: {"name": "Jane Doe"}';
      const result = ResumeDataExtractor.extract(text);
      expect(result.data.name).toBe("Jane Doe");
    });

    it("should extract data from plain JSON object", () => {
      const text =
        'Here is the data: {"name": "Bob Smith", "email": "bob@example.com"}';
      const result = ResumeDataExtractor.extract(text);
      expect(result.data.name).toBe("Bob Smith");
    });

    it("should leave education year empty when not provided", () => {
      const text = "I have a Bachelor degree in Computer Science from MIT";
      const result = ResumeDataExtractor.extract(text, "education");

      expect(result.data.education?.[0].year).toBe("");
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

    it("should not extract assistant-authored fields as user data", () => {
      const messages = [
        { content: "Name: Fake Name", isUser: false },
        { content: "My name is Real Name", isUser: true },
      ];

      const result = ResumeDataExtractor.extractFromConversation(messages);
      expect(result.data.name).toBe("Real Name");
    });

    it("should detect context from AI messages", () => {
      const messages = [
        { content: "Tell me about your education", isUser: false },
        { content: "I have a BS in CS from MIT 2023", isUser: true },
        { content: "What is your work experience?", isUser: false },
        { content: "I worked at Google as Engineer", isUser: true },
        { content: "What are your skills?", isUser: false },
        { content: "I know React and Node", isUser: true },
        { content: "What is your contact info?", isUser: false },
        { content: "email@example.com", isUser: true },
      ];

      const result = ResumeDataExtractor.extractFromConversation(messages);
      expect(result.data.education).toBeDefined();
      expect(result.data.experience).toBeDefined();
      expect(result.data.skills).toBeDefined();
      expect(result.data.email).toBeDefined();
    });

    it("should use context to extract generic education patterns", () => {
      const messages = [
        { content: "What is your education?", isUser: false },
        { content: "Computer Science, MIT, 2023", isUser: true },
      ];

      const result = ResumeDataExtractor.extractFromConversation(messages);
      expect(result.data.education).toBeDefined();
      expect(result.data.education?.[0].degree).toContain("Computer Science");
      expect(result.data.education?.[0].institution).toBe("MIT");
    });

    it("should not extract generic education pattern without context", () => {
      const messages = [
        { content: "Computer Science, MIT, 2023", isUser: true },
      ];

      const result = ResumeDataExtractor.extractFromConversation(messages);
      expect(result.data.education).toBeUndefined();
    });

    it("should handle context switching", () => {
      const messages = [
        { content: "Education?", isUser: false },
        { content: "CS, MIT", isUser: true }, // Context: education
        { content: "Experience?", isUser: false },
        { content: "I worked at Google", isUser: true }, // Context: experience
      ];

      const result = ResumeDataExtractor.extractFromConversation(messages);
      expect(result.data.education).toBeDefined();
      expect(result.data.experience).toBeDefined();
    });

    it("should ignore non-resume JSON objects", () => {
      const text = `Here is some json: {"foo": "bar"}`;
      const result = ResumeDataExtractor.extract(text);
      expect(result.data.name).toBeUndefined();
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

    it("should concatenate education arrays", () => {
      const existing = {
        education: [
          {
            degree: "BS",
            institution: "Univ A",
            year: "2020",
          },
        ],
      };
      const extracted = {
        education: [
          {
            degree: "MS",
            institution: "Univ B",
            year: "2022",
          },
        ],
      };

      const merged = ResumeDataExtractor.mergeData(existing, extracted);

      expect(merged.education).toHaveLength(2);
    });

    it("should deduplicate experience items", () => {
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
            title: "Developer",
            company: "Corp A", // Same company/title
            duration: "2021", // Different duration/desc shouldn't matter for dedupe if title/company match
            description: "Updated description",
          },
          {
            title: "Manager",
            company: "Corp B",
            duration: "2022",
            description: "New job",
          },
        ],
      };

      const merged = ResumeDataExtractor.mergeData(existing, extracted);

      expect(merged.experience).toHaveLength(2); // Should have "Developer @ Corp A" (existing) and "Manager @ Corp B" (new)
      expect(merged.experience?.[0].company).toBe("Corp A");
      expect(merged.experience?.[1].company).toBe("Corp B");
    });

    it("should deduplicate education items", () => {
      const existing = {
        education: [
          {
            degree: "BS",
            institution: "Univ A",
            year: "2020",
          },
        ],
      };
      const extracted = {
        education: [
          {
            degree: "BS",
            institution: "Univ A", // Same degree/inst
            year: "2020",
          },
          {
            degree: "MS",
            institution: "Univ A", // Different degree
            year: "2022",
          },
        ],
      };

      const merged = ResumeDataExtractor.mergeData(existing, extracted);

      expect(merged.education).toHaveLength(2); // BS (existing) + MS (new)
      expect(merged.education?.[0].degree).toBe("BS");
      expect(merged.education?.[1].degree).toBe("MS");
    });
  });

  describe("pattern extraction", () => {
    it("should extract work experience mentions", () => {
      const text = "I worked as a Software Engineer at Google";
      const result = ResumeDataExtractor.extract(text);

      expect(result.data.experience).toBeDefined();
      expect(result.data.experience?.length).toBeGreaterThan(0);
      expect(result.data.experience?.[0].description).toBe("");
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

    it("should handle invalid JSON gracefully", () => {
      const text = `\`\`\`json
{ invalid json
\`\`\``;
      const result = ResumeDataExtractor.extract(text);
      // Should fall back to pattern matching or empty
      expect(result.confidence).toBeLessThan(0.95);
    });
  });
});
