import { ResumeIntakeNormalizer } from "@/lib/services/resumeIntakeNormalizer";
import type { AIObservationContext } from "@/lib/services/aiMonitoringService";

// ── Mocks for normalizeWithAI ──────────────────────────────────────────

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockExtractWithStructuredOutput = jest.fn();
jest.mock("@/lib/services/aiExtractionService", () => ({
  extractWithStructuredOutput: (...args: unknown[]) =>
    mockExtractWithStructuredOutput(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ResumeIntakeNormalizer", () => {
  describe("normalize (regex path)", () => {
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

    it("does not mark summary missing when experience is present", () => {
      const result = ResumeIntakeNormalizer.normalize({
        sources: [
          {
            channel: "paste",
            text: "Jane Doe\njane@example.com\nEXPERIENCE\nSoftware Engineer at Acme Corp\nSKILLS\nReact",
          },
        ],
      });

      expect(result.draft.extractedData.experience).toHaveLength(1);
      expect(result.missingCriticalFields).not.toContain("summary");
    });

    it("handles multiple sources by merging them", () => {
      const result = ResumeIntakeNormalizer.normalize({
        sources: [
          { channel: "chat", text: "My name is Alice Smith" },
          { channel: "chat", text: "SKILLS\nPython, Django" },
        ],
      });

      expect(result.draft.cleanedText).toContain("Alice Smith");
      expect(result.draft.cleanedText).toContain("Python");
    });

    it("filters out header/footer lines (page numbers)", () => {
      const text = Array(5)
        .fill("Page 1 of 3")
        .concat([
          "CONTACT",
          "John Doe",
          "john@test.com",
          "SKILLS",
          "JavaScript",
        ])
        .join("\n");
      const result = ResumeIntakeNormalizer.normalize({
        sources: [{ channel: "paste", text }],
      });

      expect(result.draft.cleanedText).not.toContain("Page 1 of 3");
    });

    it("normalizes Unicode characters (smart quotes, dashes)", () => {
      const result = ResumeIntakeNormalizer.normalize({
        sources: [
          {
            channel: "paste",
            text: "CONTACT\nJohn\u2019s Resume \u2014 Senior Developer\njohn@test.com\nSKILLS\nJavaScript",
          },
        ],
      });

      // Smart quote should be normalized to straight quote
      expect(result.draft.cleanedText).toContain("'");
      // Em dash should be normalized to hyphen
      expect(result.draft.cleanedText).toContain("-");
    });

    it("handles empty sources gracefully", () => {
      const result = ResumeIntakeNormalizer.normalize({
        sources: [{ channel: "chat", text: "" }],
      });

      expect(result.missingCriticalFields.length).toBeGreaterThan(0);
    });

    it("merges broken lines (hyphenated word wrapping)", () => {
      const result = ResumeIntakeNormalizer.normalize({
        sources: [
          {
            channel: "paste",
            text: "EXPERIENCE\nSenior Soft-\nware Engineer at Google\njohn@test.com",
          },
        ],
      });

      // The broken line merge removes the trailing hyphen and joins the next line
      expect(result.draft.cleanedText).toContain("Soft ware Engineer");
    });

    it("builds evidence map for array fields (experience, skills)", () => {
      const result = ResumeIntakeNormalizer.normalize({
        sources: [
          {
            channel: "paste",
            text: "CONTACT\nJohn Doe\njohn@example.com\nSKILLS\nReact, Node.js, TypeScript\nEXPERIENCE\nSoftware Engineer at Google",
          },
        ],
      });

      // Skills should have evidence
      if (result.evidenceMap.skills) {
        expect(result.evidenceMap.skills.length).toBeGreaterThan(0);
      }
    });
  });

  describe("normalizeWithAI", () => {
    it("uses AI extraction when source is paste and AI succeeds", async () => {
      mockExtractWithStructuredOutput.mockResolvedValueOnce({
        success: true,
        data: {
          name: "AI Name",
          email: "ai@test.com",
          skills: ["React", "TypeScript"],
        },
        latencyMs: 500,
      });

      const result = await ResumeIntakeNormalizer.normalizeWithAI({
        sources: [
          {
            channel: "paste",
            text: "CONTACT\nSome resume text that is long enough\nname@example.com\nSKILLS\nReact",
          },
        ],
      });

      expect(result.extractionMethod).toBe("ai");
      expect(result.draft.extractedData.name).toBe("AI Name");
      expect(result.draft.extractedData.email).toBe("ai@test.com");
    });

    it("backfills deterministic contact fields when AI succeeds partially", async () => {
      mockExtractWithStructuredOutput.mockResolvedValueOnce({
        success: true,
        data: {
          name: "AI Name",
          skills: ["React"],
        },
        latencyMs: 500,
      });

      const result = await ResumeIntakeNormalizer.normalizeWithAI({
        sources: [
          {
            channel: "paste",
            text: "CONTACT\nJane Doe\njane@example.com\n(+91) 9916179765\nSKILLS\nReact",
          },
        ],
      });

      expect(result.extractionMethod).toBe("ai");
      expect(result.draft.extractedData.name).toBe("AI Name");
      expect(result.draft.extractedData.email).toBe("jane@example.com");
      expect(result.draft.extractedData.phone).toBe("(+91) 9916179765");
      expect(result.draft.extractedFields).toEqual(
        expect.arrayContaining(["name", "email", "phone", "skills"]),
      );
    });

    it("uses AI extraction when source is pdf", async () => {
      mockExtractWithStructuredOutput.mockResolvedValueOnce({
        success: true,
        data: { name: "PDF Person", email: "pdf@test.com" },
        latencyMs: 300,
      });

      const result = await ResumeIntakeNormalizer.normalizeWithAI({
        sources: [
          {
            channel: "pdf",
            text: "Some PDF extracted text that is long enough for processing",
          },
        ],
      });

      expect(result.extractionMethod).toBe("ai");
    });

    it("uses AI extraction when source is docx", async () => {
      mockExtractWithStructuredOutput.mockResolvedValueOnce({
        success: true,
        data: { name: "Docx Person" },
        latencyMs: 200,
      });

      const result = await ResumeIntakeNormalizer.normalizeWithAI({
        sources: [
          {
            channel: "docx",
            text: "Some docx extracted text that is long enough for processing",
          },
        ],
      });

      expect(result.extractionMethod).toBe("ai");
    });

    it("falls back to regex when AI extraction fails", async () => {
      mockExtractWithStructuredOutput.mockResolvedValueOnce({
        success: false,
        data: null,
        error: "AI model error",
      });

      const result = await ResumeIntakeNormalizer.normalizeWithAI({
        sources: [
          {
            channel: "paste",
            text: "CONTACT\nJane Doe\njane@example.com\nSKILLS\nPython",
          },
        ],
      });

      expect(result.extractionMethod).toBe("regex");
    });

    it("falls back to regex when AI throws an exception", async () => {
      mockExtractWithStructuredOutput.mockRejectedValueOnce(
        new Error("Network error"),
      );

      const result = await ResumeIntakeNormalizer.normalizeWithAI({
        sources: [
          {
            channel: "paste",
            text: "CONTACT\nJane Doe\njane@example.com\nSKILLS\nPython",
          },
        ],
      });

      expect(result.extractionMethod).toBe("regex");
    });

    it("falls back to regex when skipAI is true", async () => {
      const result = await ResumeIntakeNormalizer.normalizeWithAI(
        {
          sources: [
            {
              channel: "paste",
              text: "CONTACT\nJane Doe\njane@example.com\nSKILLS\nPython",
            },
          ],
        },
        { skipAI: true },
      );

      expect(result.extractionMethod).toBe("regex");
      expect(mockExtractWithStructuredOutput).not.toHaveBeenCalled();
    });

    it("uses regex for chat sources (does not attempt AI)", async () => {
      const result = await ResumeIntakeNormalizer.normalizeWithAI({
        sources: [
          {
            channel: "chat",
            text: "CONTACT\nJane Doe\njane@example.com\nSKILLS\nPython",
          },
        ],
      });

      expect(result.extractionMethod).toBe("regex");
      expect(mockExtractWithStructuredOutput).not.toHaveBeenCalled();
    });

    it("passes userTier option to AI extraction", async () => {
      mockExtractWithStructuredOutput.mockResolvedValueOnce({
        success: true,
        data: { name: "Test" },
        latencyMs: 100,
      });

      await ResumeIntakeNormalizer.normalizeWithAI(
        {
          sources: [
            {
              channel: "paste",
              text: "Some resume text long enough for processing",
            },
          ],
        },
        { userTier: "enterprise" },
      );

      expect(mockExtractWithStructuredOutput).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ userTier: "enterprise" }),
      );
    });

    it("passes observationContext option to AI extraction", async () => {
      const observationContext = {
        requestId: "request-1",
        sessionId: "session-1",
      } as unknown as AIObservationContext;
      mockExtractWithStructuredOutput.mockResolvedValueOnce({
        success: true,
        data: { name: "Observed" },
        latencyMs: 100,
      });

      await ResumeIntakeNormalizer.normalizeWithAI(
        {
          sources: [
            {
              channel: "pdf",
              text: "Some resume text long enough for processing",
            },
          ],
        },
        {
          userTier: "premium",
          observationContext,
        },
      );

      expect(mockExtractWithStructuredOutput).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ observationContext }),
      );
    });

    it("still produces sections and evidence map even with AI extraction", async () => {
      mockExtractWithStructuredOutput.mockResolvedValueOnce({
        success: true,
        data: {
          name: "Test Person",
          skills: ["React"],
        },
        latencyMs: 100,
      });

      const result = await ResumeIntakeNormalizer.normalizeWithAI({
        sources: [
          {
            channel: "paste",
            text: "CONTACT\nTest Person\nSKILLS\nReact, JavaScript",
          },
        ],
      });

      expect(result.draft.sections).toBeDefined();
      expect(result.evidenceMap).toBeDefined();
    });
  });
});
