import { ResumeIntakeNormalizer } from "@/lib/services/resumeIntakeNormalizer";

describe("ResumeIntakeNormalizer", () => {
  it("normalizes sources and extracts structured data", () => {
    const result = ResumeIntakeNormalizer.normalize({
      sources: [
        {
          channel: "paste",
          text: `
            CONTACT
            My name is Jane Doe
            jane@example.com

            SKILLS
            TypeScript, React, Node.js

            EXPERIENCE
            Software Engineer at Acme Corp
          `,
        },
      ],
    });

    expect(result.draft.cleanedText.length).toBeGreaterThan(0);
    expect(result.draft.extractedData.name).toBe("Jane Doe");
    expect(result.draft.extractedData.email).toBe("jane@example.com");
    expect(result.draft.sections.skills.length).toBeGreaterThan(0);
    expect(result.evidenceMap.name?.length).toBeGreaterThan(0);
  });

  it("marks missing critical fields when required content is absent", () => {
    const result = ResumeIntakeNormalizer.normalize({
      sources: [
        {
          channel: "chat",
          text: "Hello there",
        },
      ],
    });

    expect(result.missingCriticalFields).toContain("email");
    expect(result.missingCriticalFields).toContain("summary");
    expect(result.missingCriticalFields).toContain("skills");
    expect(result.missingCriticalFields).toContain("experience_or_education");
  });
});
