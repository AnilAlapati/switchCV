import { SummaryExtractor } from "@/lib/services/extractors/SummaryExtractor";

describe("SummaryExtractor", () => {
  let extractor: SummaryExtractor;

  beforeEach(() => {
    extractor = new SummaryExtractor();
  });

  it("should extract summary with inline content", () => {
    const text =
      "Summary: Experienced software engineer with 10 years of experience.";
    const result = extractor.extract(text);
    expect(result.summary).toBe(
      "Experienced software engineer with 10 years of experience.",
    );
  });

  it("should extract summary from next lines", () => {
    const text = `
Professional Summary
Dedicated and highly skilled software professional.
Expert in React and Node.js.
    `;
    const result = extractor.extract(text);
    expect(result.summary).toBe(
      "Dedicated and highly skilled software professional. Expert in React and Node.js.",
    );
  });

  it("should stop extraction at next header", () => {
    const text = `
Objective
To obtain a challenging position.
Experience
Software Engineer at TechCorp.
    `;
    const result = extractor.extract(text);
    expect(result.summary).toBe("To obtain a challenging position.");
  });

  it("should handle mixed case and variants", () => {
    const text = "ABOUT ME\nI love building products that matter.";
    const result = extractor.extract(text);
    expect(result.summary).toBe("I love building products that matter.");
  });

  it("should ignore empty summaries", () => {
    const text = "Summary:\n\n\nExperience:";
    const result = extractor.extract(text);
    expect(result.summary).toBeUndefined();
  });

  it("should handle multiline content with empty lines in between", () => {
    const text = `
Executive Summary
Line one of summary.

Line two of summary.
EXPERIENCE
    `;
    const result = extractor.extract(text);
    expect(result.summary).toBe("Line one of summary. Line two of summary.");
  });
});
