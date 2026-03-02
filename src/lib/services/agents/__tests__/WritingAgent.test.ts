/**
 * WritingAgent — Unit Tests
 *
 * Covers:
 *   1. Happy path — parses resumeMarkdown from JSON response
 *   2. buildPrompt — includes plan points, keywords, and user resume
 *   3. buildPrompt — includes "ADDITIONAL CONTEXT" when instructions provided
 *   4. buildPrompt — omits "ADDITIONAL CONTEXT" section when instructions absent
 *   5. buildPrompt — handles plan with no keywords
 *   6. buildPrompt — includes custom outputFormatInstruction
 *   7. parseOutput — falls back to raw text when response is not JSON
 *   8. parseOutput — falls back to raw text when JSON doesn't match schema
 *   9. parseOutput — extracts JSON from text with surrounding content
 *  10. generateText error → success=false with error message
 *  11. Revision pass — instructions prepended correctly with auditor critique
 */

import { WritingAgent } from "../WritingAgent";
import { generateText } from "../../aiGenerationService";
import { AgentContext } from "../BaseAgent";

jest.mock("../../aiGenerationService");
const mockedGenerateText = jest.mocked(generateText);

describe("WritingAgent", () => {
  const mockMeta = { model: "test-model", provider: "test-provider" };

  const mockContext: AgentContext = {
    userId: "test-user",
    model: "test-model",
    jobDescription: "Staff Engineer at Google",
    userResume: "8 years building distributed systems at FAANG.",
  };

  const mockPlan = {
    strategicPoints: ["Highlight scale", "Add Kubernetes experience"],
    keywordsToInclude: ["Kubernetes", "gRPC", "Borg"],
  };

  const RESUME_MARKDOWN = "# Staff Engineer Resume\n## Experience\n...";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Happy path
  // -------------------------------------------------------------------------
  it("returns parsed resumeMarkdown from a valid JSON response", async () => {
    const agent = new WritingAgent("test-model");
    mockedGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({ resumeMarkdown: RESUME_MARKDOWN }),
      ...mockMeta,
    });

    const result = await agent.run({ planOutput: mockPlan }, mockContext);

    expect(result.success).toBe(true);
    expect(result.data?.resumeMarkdown).toBe(RESUME_MARKDOWN);
  });

  // -------------------------------------------------------------------------
  // 2. buildPrompt — plan points, keywords, and user resume
  // -------------------------------------------------------------------------
  it("buildPrompt includes numbered plan points, keywords, and user resume", () => {
    const agent = new WritingAgent("test-model");
    const prompt = agent.buildPrompt({ planOutput: mockPlan }, mockContext);

    expect(prompt).toContain("1. Highlight scale");
    expect(prompt).toContain("2. Add Kubernetes experience");
    expect(prompt).toContain("Kubernetes, gRPC, Borg");
    expect(prompt).toContain("8 years building distributed systems at FAANG");
  });

  // -------------------------------------------------------------------------
  // 3. buildPrompt — includes ADDITIONAL CONTEXT when instructions provided
  // -------------------------------------------------------------------------
  it("buildPrompt includes 'ADDITIONAL CONTEXT' section when context.instructions set", () => {
    const agent = new WritingAgent("test-model");
    const contextWithInstructions: AgentContext = {
      ...mockContext,
      instructions:
        "AUDITOR FEEDBACK (please address these issues):\nAdd metrics to all bullet points.",
    };
    const prompt = agent.buildPrompt(
      { planOutput: mockPlan },
      contextWithInstructions,
    );

    expect(prompt).toContain("ADDITIONAL CONTEXT:");
    expect(prompt).toContain("AUDITOR FEEDBACK");
    expect(prompt).toContain("Add metrics to all bullet points");
  });

  // -------------------------------------------------------------------------
  // 4. buildPrompt — omits ADDITIONAL CONTEXT section when instructions absent
  // -------------------------------------------------------------------------
  it("buildPrompt omits 'ADDITIONAL CONTEXT' section when instructions not set", () => {
    const agent = new WritingAgent("test-model");
    const prompt = agent.buildPrompt({ planOutput: mockPlan }, mockContext);

    expect(prompt).not.toContain("ADDITIONAL CONTEXT:");
  });

  // -------------------------------------------------------------------------
  // 5. buildPrompt — handles plan with no keywords
  // -------------------------------------------------------------------------
  it("buildPrompt handles plan without keywords gracefully", () => {
    const agent = new WritingAgent("test-model");
    const planNoKeywords = {
      strategicPoints: ["Highlight impact"],
    };
    const prompt = agent.buildPrompt(
      { planOutput: planNoKeywords },
      mockContext,
    );

    // Keywords section should exist but be empty
    expect(prompt).toContain("KEYWORDS TO INCLUDE:");
    // Should not throw
    expect(prompt).toContain("Highlight impact");
  });

  // -------------------------------------------------------------------------
  // 6. buildPrompt — includes custom outputFormatInstruction
  // -------------------------------------------------------------------------
  it("buildPrompt uses custom outputFormatInstruction when provided", () => {
    const agent = new WritingAgent("test-model");
    const contextWithFormat: AgentContext = {
      ...mockContext,
      outputFormatInstruction: "Output in YAML format, not Markdown.",
    };
    const prompt = agent.buildPrompt(
      { planOutput: mockPlan },
      contextWithFormat,
    );

    expect(prompt).toContain("Output in YAML format, not Markdown");
  });

  // -------------------------------------------------------------------------
  // 7. parseOutput — falls back to raw text when response is not JSON
  // -------------------------------------------------------------------------
  it("parseOutput returns raw text as resumeMarkdown when response is not JSON", async () => {
    const agent = new WritingAgent("test-model");
    const rawText = "# Plain Markdown Resume\nNo JSON here.";
    mockedGenerateText.mockResolvedValueOnce({ text: rawText, ...mockMeta });

    const result = await agent.run({ planOutput: mockPlan }, mockContext);

    expect(result.success).toBe(true);
    expect(result.data?.resumeMarkdown).toBe(rawText);
  });

  // -------------------------------------------------------------------------
  // 8. parseOutput — falls back to raw text when schema doesn't match
  // -------------------------------------------------------------------------
  it("parseOutput falls back to raw text when JSON lacks resumeMarkdown field", async () => {
    const agent = new WritingAgent("test-model");
    const badJson = JSON.stringify({ content: "wrong field" });
    mockedGenerateText.mockResolvedValueOnce({ text: badJson, ...mockMeta });

    const result = await agent.run({ planOutput: mockPlan }, mockContext);

    expect(result.success).toBe(true);
    // Zod validation fails → raw text used
    expect(result.data?.resumeMarkdown).toBe(badJson);
  });

  // -------------------------------------------------------------------------
  // 9. parseOutput — extracts JSON from surrounding text
  // -------------------------------------------------------------------------
  it("parseOutput extracts JSON from a response with surrounding prose", async () => {
    const agent = new WritingAgent("test-model");
    const wrapped = `Here is your rewritten resume:\n${JSON.stringify({ resumeMarkdown: RESUME_MARKDOWN })}\nHope this helps!`;
    mockedGenerateText.mockResolvedValueOnce({ text: wrapped, ...mockMeta });

    const result = await agent.run({ planOutput: mockPlan }, mockContext);

    expect(result.success).toBe(true);
    expect(result.data?.resumeMarkdown).toBe(RESUME_MARKDOWN);
  });

  // -------------------------------------------------------------------------
  // 10. generateText throws → agent failure
  // -------------------------------------------------------------------------
  it("returns failure when generateText throws", async () => {
    const agent = new WritingAgent("test-model");
    mockedGenerateText.mockRejectedValueOnce(
      new Error("Context window exceeded"),
    );

    const result = await agent.run({ planOutput: mockPlan }, mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Context window exceeded");
  });

  // -------------------------------------------------------------------------
  // 11. Revision pass — auditor critique appears AFTER original instructions
  // -------------------------------------------------------------------------
  it("revision pass: critique is appended after original instructions in prompt", () => {
    const agent = new WritingAgent("test-model");
    const originalInstructions = "Keep it to one page.";
    const auditorCritique =
      "AUDITOR FEEDBACK (please address these issues):\nAdd more metrics.";
    const combinedInstructions = [originalInstructions, auditorCritique]
      .join("\n\n")
      .trim();

    const revisionContext: AgentContext = {
      ...mockContext,
      instructions: combinedInstructions,
    };

    const prompt = agent.buildPrompt({ planOutput: mockPlan }, revisionContext);

    // Both pieces should be present, original before critique
    const originalIdx = prompt.indexOf(originalInstructions);
    const critiqueIdx = prompt.indexOf("AUDITOR FEEDBACK");
    expect(originalIdx).toBeGreaterThan(-1);
    expect(critiqueIdx).toBeGreaterThan(-1);
    expect(originalIdx).toBeLessThan(critiqueIdx);
  });
});
