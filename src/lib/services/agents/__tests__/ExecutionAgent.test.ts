import { ExecutionAgent } from "../ExecutionAgent";
import { generateText } from "../../aiGenerationService";
import { AgentContext } from "../BaseAgent";

jest.mock("../../aiGenerationService");
const mockedGenerateText = jest.mocked(generateText);

describe("ExecutionAgent", () => {
  const mockContext: AgentContext = {
    userId: "test-user",
    model: "test-model",
    userResume: "# Old Resume",
  };

  const mockPlan = {
    strategicPoints: ["Add AWS", "Clarify role"],
    keywordsToInclude: ["AWS", "Terraform"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should build prompt with plan and parse JSON markdown", async () => {
    const agent = new ExecutionAgent("test-model");
    const mockJson = {
      resumeMarkdown: "# New Improved Resume",
    };
    mockedGenerateText.mockResolvedValueOnce({
      text: JSON.stringify(mockJson),
    });

    const result = await agent.run({ planOutput: mockPlan }, mockContext);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockJson);
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.stringContaining("PLAN:\n1. Add AWS\n2. Clarify role"),
      2000,
      0.7,
      "test-model",
    );
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.stringContaining("KEYWORDS TO INCLUDE:\nAWS, Terraform"),
      2000,
      0.7,
      "test-model",
    );
  });

  it("should use outputFormatInstruction if provided in context", () => {
    const agent = new ExecutionAgent("test-model");
    const customContext = {
      ...mockContext,
      outputFormatInstruction: "Use LaTeX instead.",
    };
    const prompt = agent.buildPrompt({ planOutput: mockPlan }, customContext);
    expect(prompt).toContain("Use LaTeX instead.");
    expect(prompt).not.toContain(
      "Output the full resume content in Markdown format.",
    );
  });

  it("should fallback to raw text as markdown if JSON parsing fails", async () => {
    const agent = new ExecutionAgent("test-model");
    const rawMarkdown = "# Just Markdown Content";
    mockedGenerateText.mockResolvedValueOnce({ text: rawMarkdown });

    const result = await agent.run({ planOutput: mockPlan }, mockContext);

    expect(result.success).toBe(true);
    expect(result.data?.resumeMarkdown).toBe(rawMarkdown);
  });

  it("should handle empty keywords in plan", () => {
    const agent = new ExecutionAgent("test-model");
    const planWithoutKeywords = { strategicPoints: ["p1"] };
    const prompt = agent.buildPrompt(
      { planOutput: planWithoutKeywords },
      mockContext,
    );
    expect(prompt).toContain("KEYWORDS TO INCLUDE:\n\n");
  });
});
