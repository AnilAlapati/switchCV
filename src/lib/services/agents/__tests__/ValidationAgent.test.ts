import { ValidationAgent } from "../ValidationAgent";
import { generateText } from "../../aiGenerationService";
import { AgentContext } from "../BaseAgent";

jest.mock("../../aiGenerationService");
const mockedGenerateText = jest.mocked(generateText);

describe("ValidationAgent", () => {
  const mockContext: AgentContext = {
    userId: "test-user",
    model: "test-model",
    jobDescription: "Staff Engineer",
  };

  const mockExecution = {
    resumeMarkdown: "# Draft Resume Content",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should build prompt with draft and parse PASS status", async () => {
    const agent = new ValidationAgent("test-model");
    const mockJson = {
      status: "PASS",
      critique: "",
      missingKeywords: [],
    };
    mockedGenerateText.mockResolvedValueOnce({
      text: JSON.stringify(mockJson),
    });

    const result = await agent.run(
      { executionOutput: mockExecution },
      mockContext,
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockJson);
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.stringContaining("DRAFT RESUME:\n# Draft Resume Content"),
      2000,
      0.7,
      "test-model",
    );
  });

  it("should parse NEEDS_WORK status and critique", async () => {
    const agent = new ValidationAgent("test-model");
    const mockJson = {
      status: "NEEDS_WORK",
      critique: "Missing deep learning exp",
      missingKeywords: ["PyTorch", "TensorFlow"],
    };
    mockedGenerateText.mockResolvedValueOnce({
      text: JSON.stringify(mockJson),
    });

    const result = await agent.run(
      { executionOutput: mockExecution },
      mockContext,
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockJson);
  });

  it("should fallback to PASS if JSON parsing fails", async () => {
    const agent = new ValidationAgent("test-model");
    mockedGenerateText.mockResolvedValueOnce({
      text: "Invalid JSON or plain string",
    });

    const result = await agent.run(
      { executionOutput: mockExecution },
      mockContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("PASS");
  });

  it("should extract JSON even if text follows it", async () => {
    const agent = new ValidationAgent("test-model");
    const mockJson = { status: "PASS" };
    mockedGenerateText.mockResolvedValueOnce({
      text: `${JSON.stringify(mockJson)}\nHope this passes!`,
    });

    const result = await agent.run(
      { executionOutput: mockExecution },
      mockContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("PASS");
  });
});
