import { PolishAgent } from "../PolishAgent";
import { generateText } from "../../aiGenerationService";
import { AgentContext } from "../BaseAgent";

jest.mock("../../aiGenerationService");
const mockedGenerateText = jest.mocked(generateText);

describe("PolishAgent", () => {
  const mockContext: AgentContext = {
    userId: "test-user",
    model: "test-model",
  };

  const mockExecution = {
    resumeMarkdown: "# Draft Resume",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should build prompt with critique and parse final markdown", async () => {
    const agent = new PolishAgent("test-model");
    const validationOutput = {
      status: "NEEDS_WORK" as const,
      critique: "Too long",
      missingKeywords: ["K8s"],
    };
    const mockJson = {
      finalResumeMarkdown: "# Final Polished Resume",
    };
    mockedGenerateText.mockResolvedValueOnce({
      text: JSON.stringify(mockJson),
    });

    const result = await agent.run(
      {
        executionOutput: mockExecution,
        validationOutput,
      },
      mockContext,
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockJson);
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.stringContaining("CRITIQUE:\nToo long"),
      2000,
      0.7,
      "test-model",
    );
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.stringContaining("MISSING KEYWORDS:\nK8s"),
      2000,
      0.7,
      "test-model",
    );
  });

  it("should build prompt for passed validation", async () => {
    const agent = new PolishAgent("test-model");
    const validationOutput = {
      status: "PASS" as const,
    };
    const mockJson = { finalResumeMarkdown: "# Final Passed Resume" };
    mockedGenerateText.mockResolvedValueOnce({
      text: JSON.stringify(mockJson),
    });

    await agent.run(
      {
        executionOutput: mockExecution,
        validationOutput,
      },
      mockContext,
    );

    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.stringContaining(
        "The resume passed validation. Focus on tone and brevity.",
      ),
      2000,
      0.7,
      "test-model",
    );
  });

  it("should fallback to raw text if JSON parsing fails", async () => {
    const agent = new PolishAgent("test-model");
    const rawText = "# Raw Polish Content";
    mockedGenerateText.mockResolvedValueOnce({ text: rawText });

    const result = await agent.run(
      {
        executionOutput: mockExecution,
        validationOutput: { status: "PASS" },
      },
      mockContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.finalResumeMarkdown).toBe(rawText);
  });
});
