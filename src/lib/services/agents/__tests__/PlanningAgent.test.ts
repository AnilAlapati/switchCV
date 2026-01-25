import { PlanningAgent, PlanningAgentInput } from "../PlanningAgent";
import { generateText } from "../../aiGenerationService";
import { AgentContext } from "../BaseAgent";

jest.mock("../../aiGenerationService");
const mockedGenerateText = jest.mocked(generateText);

describe("PlanningAgent", () => {
  const mockContext: AgentContext = {
    userId: "test-user",
    model: "test-model",
    jobDescription: "Senior Cloud Architect",
    userResume: "Experience: 10 years of AWS",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should build prompt with research output and parse JSON", async () => {
    const agent = new PlanningAgent("test-model");
    const researchOutput = {
      summary: "r-sum",
      hiddenRequirements: ["security clearable"],
    };
    const mockJson = {
      strategicPoints: ["Focus on security", "Highlight AWS certs"],
      keywordsToInclude: ["IAM", "VPC"],
      sectionsToEnhance: ["Experience"],
    };
    mockedGenerateText.mockResolvedValueOnce({
      text: JSON.stringify(mockJson),
    });

    const result = await agent.run({ researchOutput }, mockContext);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockJson);
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.stringContaining("RESEARCH SUMMARY:\nr-sum"),
      2000,
      0.7,
      "test-model",
    );
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.stringContaining("HIDDEN REQUIREMENTS:\nsecurity clearable"),
      2000,
      0.7,
      "test-model",
    );
  });

  it("should handle missing research output in prompt", () => {
    const agent = new PlanningAgent("test-model");
    const prompt = agent.buildPrompt({}, mockContext);
    expect(prompt).not.toContain("RESEARCH SUMMARY:");
    expect(prompt).toContain("USER RESUME:\nExperience: 10 years of AWS");
  });

  it("should handle missing resume in context", () => {
    const agent = new PlanningAgent("test-model");
    const prompt = agent.buildPrompt({}, { userId: "u", model: "m" });
    expect(prompt).toContain("No specific resume content provided.");
  });

  it("should fallback to treating output as strategic points if JSON is invalid", async () => {
    const agent = new PlanningAgent("test-model");
    const rawText = "Plain text strategy";
    mockedGenerateText.mockResolvedValueOnce({ text: rawText });

    const result = await agent.run({}, mockContext);

    expect(result.success).toBe(true);
    expect(result.data?.strategicPoints).toEqual([rawText]);
  });

  it("should extract JSON from surrounded text", async () => {
    const agent = new PlanningAgent("test-model");
    const mockJson = { strategicPoints: ["p1"] };
    const wrappedText = `Analysis:\n ${JSON.stringify(mockJson)} \nDone.`;
    mockedGenerateText.mockResolvedValueOnce({ text: wrappedText });

    const result = await agent.run({}, mockContext);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockJson);
  });

  it("should handle emptyStrategicPoints in fallback if parsing fails completely", async () => {
    const agent = new PlanningAgent("test-model");
    mockedGenerateText.mockResolvedValueOnce({ text: "" });

    const result = await agent.run({}, mockContext);

    expect(result.success).toBe(true);
    expect(result.data?.strategicPoints).toEqual([""]);
  });
});
