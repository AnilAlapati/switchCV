import { ResearchAgent } from "../ResearchAgent";
import { generateText } from "../../aiGenerationService";
import { AgentContext } from "../BaseAgent";

jest.mock("../../aiGenerationService");
const mockedGenerateText = jest.mocked(generateText);

describe("ResearchAgent", () => {
  const mockContext: AgentContext = {
    userId: "test-user",
    model: "test-model",
    jobDescription: "Staff Software Engineer at Google",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should build correct prompt and parse perfect JSON output", async () => {
    const agent = new ResearchAgent("test-model");
    const mockJson = {
      summary: "Highly competitive role focusing on scale.",
      hiddenRequirements: ["Distributed systems", "L7 load balancing"],
      culturalIndicators: ["Googley", "Data-driven"],
    };
    mockedGenerateText.mockResolvedValueOnce({
      text: JSON.stringify(mockJson),
    });

    const result = await agent.run(undefined, mockContext);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockJson);
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.stringContaining("Analyze the Job Description"),
      2000,
      0.7,
      "test-model",
    );
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.stringContaining(
        "JOB DESCRIPTION:\nStaff Software Engineer at Google",
      ),
      2000,
      0.7,
      "test-model",
    );
  });

  it("should extract JSON from surrounded text (regex check)", async () => {
    const agent = new ResearchAgent("test-model");
    const mockJson = {
      summary: "Surrounded summary",
      hiddenRequirements: ["req1"],
      culturalIndicators: ["ind1"],
    };
    const wrappedText = `Here is the analysis:\n${JSON.stringify(mockJson)}\nHope this helps!`;
    mockedGenerateText.mockResolvedValueOnce({ text: wrappedText });

    const result = await agent.run(undefined, mockContext);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockJson);
  });

  it("should fallback to treating entire output as summary if JSON is invalid", async () => {
    const agent = new ResearchAgent("test-model");
    const invalidJson = "{ summary: 'missing quotes' }";
    mockedGenerateText.mockResolvedValueOnce({ text: invalidJson });

    const result = await agent.run(undefined, mockContext);

    expect(result.success).toBe(true);
    expect(result.data?.summary).toBe(invalidJson);
  });

  it("should fallback to raw text if no JSON brackets found", async () => {
    const agent = new ResearchAgent("test-model");
    const rawText = "Just a plain string without any JSON structure.";
    mockedGenerateText.mockResolvedValueOnce({ text: rawText });

    const result = await agent.run(undefined, mockContext);

    expect(result.success).toBe(true);
    expect(result.data?.summary).toBe(rawText);
  });

  it("should handle missing job description in prompt", () => {
    const agent = new ResearchAgent("test-model");
    const emptyContext: AgentContext = { userId: "u1", model: "m1" };
    const prompt = agent.buildPrompt(undefined, emptyContext);
    expect(prompt).toContain("No specific job description provided.");
  });

  it("should return error if generateText throws", async () => {
    const agent = new ResearchAgent("test-model");
    mockedGenerateText.mockRejectedValueOnce(new Error("API Timeout"));

    const result = await agent.run(undefined, mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toBe("API Timeout");
  });

  it("should include hiddenRequirements and culturalIndicators as optional fields", async () => {
    const agent = new ResearchAgent("test-model");
    const partialJson = {
      summary: "Only summary provided",
    };
    mockedGenerateText.mockResolvedValueOnce({
      text: JSON.stringify(partialJson),
    });

    const result = await agent.run(undefined, mockContext);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(partialJson);
    expect(result.data?.hiddenRequirements).toBeUndefined();
  });
});
