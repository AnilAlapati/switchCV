/**
 * AuditorAgent — Unit Tests
 *
 * Covers:
 *   1. Happy path — PASS response with template recommendation
 *   2. NEEDS_WORK response with critique and template
 *   3. buildPrompt — includes drafted resume and job description
 *   4. buildPrompt — fallback when no job description
 *   5. parseOutput — fallback to PASS + standard-v1 when JSON is invalid
 *   6. parseOutput — fallback when no JSON brackets found
 *   7. parseOutput — partial JSON (missing optional critique)
 *   8. generateText error → success=false with error message
 */

import { AuditorAgent } from "../AuditorAgent";
import { generateText } from "../../aiGenerationService";
import { AgentContext } from "../BaseAgent";

jest.mock("../../aiGenerationService");
const mockedGenerateText = jest.mocked(generateText);

describe("AuditorAgent", () => {
  const mockMeta = { model: "test-model", provider: "test-provider" };

  const mockContext: AgentContext = {
    userId: "test-user",
    model: "test-model",
    jobDescription: "Senior Principal Engineer at Stripe",
    userResume: "10 years of payments infrastructure",
  };

  const DRAFTED_RESUME = "# Stripe Application\nBuilt payments at scale.";

  const validPass = {
    status: "PASS" as const,
    critique: "",
    suggestedTemplateId: "signal-v1",
    designReasoning: "Technical role with high impact metrics.",
  };

  const validNeedsWork = {
    status: "NEEDS_WORK" as const,
    critique: "Missing quantified achievements in the experience section.",
    suggestedTemplateId: "executive-v1",
    designReasoning: "Senior leadership context warrants executive layout.",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Happy path — PASS
  // -------------------------------------------------------------------------
  it("returns PASS with template recommendation on valid AI response", async () => {
    const agent = new AuditorAgent("test-model");
    mockedGenerateText.mockResolvedValueOnce({
      text: JSON.stringify(validPass),
      ...mockMeta,
    });

    const result = await agent.run(
      { executionOutput: { resumeMarkdown: DRAFTED_RESUME } },
      mockContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("PASS");
    expect(result.data?.suggestedTemplateId).toBe("signal-v1");
    expect(result.data?.designReasoning).toBe(
      "Technical role with high impact metrics.",
    );
  });

  // -------------------------------------------------------------------------
  // 2. NEEDS_WORK with critique
  // -------------------------------------------------------------------------
  it("returns NEEDS_WORK with critique when AI detects issues", async () => {
    const agent = new AuditorAgent("test-model");
    mockedGenerateText.mockResolvedValueOnce({
      text: JSON.stringify(validNeedsWork),
      ...mockMeta,
    });

    const result = await agent.run(
      { executionOutput: { resumeMarkdown: DRAFTED_RESUME } },
      mockContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("NEEDS_WORK");
    expect(result.data?.critique).toContain("quantified achievements");
    expect(result.data?.suggestedTemplateId).toBe("executive-v1");
  });

  // -------------------------------------------------------------------------
  // 3. buildPrompt — includes drafted resume and JD
  // -------------------------------------------------------------------------
  it("buildPrompt includes the drafted resume and job description", () => {
    const agent = new AuditorAgent("test-model");
    const prompt = agent.buildPrompt(
      { executionOutput: { resumeMarkdown: DRAFTED_RESUME } },
      mockContext,
    );

    expect(prompt).toContain(DRAFTED_RESUME);
    expect(prompt).toContain("Senior Principal Engineer at Stripe");
    expect(prompt).toContain("NEEDS_WORK");
    expect(prompt).toContain("suggestedTemplateId");
  });

  // -------------------------------------------------------------------------
  // 4. buildPrompt — no job description fallback
  // -------------------------------------------------------------------------
  it("buildPrompt handles missing job description with fallback text", () => {
    const agent = new AuditorAgent("test-model");
    const contextNoJD: AgentContext = { userId: "u1", model: "m1" };
    const prompt = agent.buildPrompt(
      { executionOutput: { resumeMarkdown: DRAFTED_RESUME } },
      contextNoJD,
    );

    expect(prompt).toContain("No job description provided");
  });

  // -------------------------------------------------------------------------
  // 5. parseOutput — invalid JSON → fallback PASS + standard-v1
  // -------------------------------------------------------------------------
  it("parseOutput falls back to PASS + standard-v1 when JSON is invalid", async () => {
    const agent = new AuditorAgent("test-model");
    mockedGenerateText.mockResolvedValueOnce({
      text: "{ status: PASS, bad json }",
      ...mockMeta,
    });

    const result = await agent.run(
      { executionOutput: { resumeMarkdown: DRAFTED_RESUME } },
      mockContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("PASS");
    expect(result.data?.suggestedTemplateId).toBe("standard-v1");
    expect(result.data?.designReasoning).toBe("Fallback to standard template.");
  });

  // -------------------------------------------------------------------------
  // 6. parseOutput — no JSON brackets → fallback
  // -------------------------------------------------------------------------
  it("parseOutput falls back when response has no JSON brackets", async () => {
    const agent = new AuditorAgent("test-model");
    mockedGenerateText.mockResolvedValueOnce({
      text: "This resume looks good overall.",
      ...mockMeta,
    });

    const result = await agent.run(
      { executionOutput: { resumeMarkdown: DRAFTED_RESUME } },
      mockContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("PASS");
    expect(result.data?.suggestedTemplateId).toBe("standard-v1");
  });

  // -------------------------------------------------------------------------
  // 7. parseOutput — JSON with missing optional critique field
  // -------------------------------------------------------------------------
  it("parseOutput succeeds with JSON that omits the optional critique field", async () => {
    const agent = new AuditorAgent("test-model");
    const noCritique = {
      status: "PASS",
      suggestedTemplateId: "modern-creative-v1",
      designReasoning: "Entry-level candidate.",
    };
    mockedGenerateText.mockResolvedValueOnce({
      text: JSON.stringify(noCritique),
      ...mockMeta,
    });

    const result = await agent.run(
      { executionOutput: { resumeMarkdown: DRAFTED_RESUME } },
      mockContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("PASS");
    expect(result.data?.suggestedTemplateId).toBe("modern-creative-v1");
    expect(result.data?.critique).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 8. generateText error → agent failure
  // -------------------------------------------------------------------------
  it("returns failure when generateText throws", async () => {
    const agent = new AuditorAgent("test-model");
    mockedGenerateText.mockRejectedValueOnce(new Error("Rate limit exceeded"));

    const result = await agent.run(
      { executionOutput: { resumeMarkdown: DRAFTED_RESUME } },
      mockContext,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Rate limit exceeded");
  });

  // -------------------------------------------------------------------------
  // 9. parseOutput — JSON embedded in surrounding text (markdown fences)
  // -------------------------------------------------------------------------
  it("parseOutput extracts JSON from markdown fence wrapper", async () => {
    const agent = new AuditorAgent("test-model");
    const wrapped = `Here is my audit:\n\`\`\`json\n${JSON.stringify(validPass)}\n\`\`\`\n`;
    mockedGenerateText.mockResolvedValueOnce({ text: wrapped, ...mockMeta });

    const result = await agent.run(
      { executionOutput: { resumeMarkdown: DRAFTED_RESUME } },
      mockContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("PASS");
    expect(result.data?.suggestedTemplateId).toBe("signal-v1");
  });
});
