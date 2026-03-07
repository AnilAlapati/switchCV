/**
 * ExperienceExtractor Tests
 *
 * Validates that the regex-based extraction correctly identifies real
 * experience entries while rejecting false positives from skills sections.
 */

import { ExperienceExtractor } from "@/lib/services/extractors/ExperienceExtractor";

describe("ExperienceExtractor", () => {
  const extractor = new ExperienceExtractor();

  // =========================================================================
  // BUG REGRESSION: Skills rows misread as experience
  // =========================================================================

  describe("Skills section false-positive prevention", () => {
    it("does NOT extract skill rows as experience when KEY SKILLS header is present", () => {
      const text = `KEY SKILLS
Microservices SQL React.js Python
Angular Javascript Azure Node.js
API Nextjs UiPath Firebase
Prompt Engineering Vibe coding`;

      const result = extractor.extract(text);
      expect(result.experience).toBeUndefined();
    });

    it("does NOT extract skill rows as experience even without section header", () => {
      // Even if the section header is missing, tech-keyword lines should
      // be caught by the looksLikeSkillsList guard.
      const text = `API Nextjs UiPath Firebase
Prompt Engineering Vibe coding`;

      const result = extractor.extract(text, "experience");
      expect(result.experience).toBeUndefined();
    });

    it("does NOT confuse CERTIFICATION section content as experience", () => {
      const text = `CERTIFICATION
Automation Anywhere Certified Advanced RPA Professional
Microsoft Certified Azure Data Scientist Associate`;

      const result = extractor.extract(text);
      expect(result.experience).toBeUndefined();
    });

    it("does NOT extract from SKILLS section in a full resume paste", () => {
      const text = `Software Engineer III
JPMorgan Chase & Co
01-2024 - Present
- Led a team of 5 delivering enterprise automation

KEY SKILLS
Microservices SQL React.js Python
Angular Javascript Azure Node.js
API Nextjs UiPath Firebase
Prompt Engineering Vibe coding

CERTIFICATION
Automation Anywhere Certified Advanced RPA Professional`;

      const result = extractor.extract(text);
      // Should extract the real experience entry, NOT skill rows
      if (result.experience && result.experience.length > 0) {
        for (const entry of result.experience) {
          expect(entry.title).not.toBe("API Nextjs UiPath Firebase");
          expect(entry.company).not.toBe("Prompt Engineering Vibe coding");
        }
      }
    });
  });

  // =========================================================================
  // Positive cases: Real experience entries should still be extracted
  // =========================================================================

  describe("Correct experience extraction", () => {
    it("extracts 'Title at Company' format", () => {
      const text = "I worked as a Software Engineer at JPMorgan Chase";
      const result = extractor.extract(text);
      expect(result.experience).toBeDefined();
      expect(result.experience![0].company).toContain("JPMorgan");
    });

    it("extracts 'Title, Company (dates)' format", () => {
      const text = "Software Engineer III, JPMorgan Chase (2024-Present)";
      const result = extractor.extract(text);
      expect(result.experience).toBeDefined();
      expect(result.experience![0].title).toContain("Software Engineer");
    });

    it("extracts block multiline format with real title/company", () => {
      const text = `Senior RPA Developer
TEKsystems
03-2020 - 10-2020`;

      const result = extractor.extract(text);
      expect(result.experience).toBeDefined();
      expect(result.experience![0].title).toContain("Senior RPA Developer");
      expect(result.experience![0].company).toContain("TEKsystems");
    });

    it("returns empty when context is skills", () => {
      const text = "I worked at Google as a Software Engineer";
      const result = extractor.extract(text, "skills");
      expect(result.experience).toBeUndefined();
    });
  });
});
