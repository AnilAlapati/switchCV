import { ResearchAgent } from "../ResearchAgent";
import { PlanningAgent } from "../PlanningAgent";
import { WritingAgent } from "../WritingAgent";
import { AuditorAgent } from "../AuditorAgent";
import { generateText } from "../../aiGenerationService";
import { AgentContext } from "../BaseAgent";

jest.mock("../../aiGenerationService");
const mockedGenerateText = jest.mocked(generateText);

describe("Agentic Service Layer", () => {
    const mockContext: AgentContext = {
        userId: "test-user",
        model: "test-model",
        jobDescription: "Sample Job Description",
        userResume: "Sample User Resume",
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("ResearchAgent (The Scout)", () => {
        it("should build correct prompt and parse JSON output", async () => {
            const agent = new ResearchAgent("test-model");
            const mockJson = {
                summary: "Research summary",
                hiddenRequirements: ["req1"],
                culturalIndicators: ["ind1"],
            };
            mockedGenerateText.mockResolvedValueOnce({
                text: JSON.stringify(mockJson),
                model: "test-model",
                provider: "test-provider"
            });

            const result = await agent.run(undefined, mockContext);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockJson);
        });
    });

    describe("PlanningAgent (The Architect)", () => {
        it("should build correct prompt and parse JSON", async () => {
            const agent = new PlanningAgent("test-model");
            const researchOutput = { summary: "r-sum", hiddenRequirements: ["h1"] };
            const mockJson = {
                strategicPoints: ["p1"],
                keywordsToInclude: ["kw1"],
                sectionsToEnhance: ["sec1"],
            };
            mockedGenerateText.mockResolvedValueOnce({
                text: JSON.stringify(mockJson),
                model: "test-model",
                provider: "test-provider"
            });

            const result = await agent.run({ researchOutput }, mockContext);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockJson);
        });
    });

    describe("WritingAgent (The Writer)", () => {
        it("should build correct prompt and parse Markdown output", async () => {
            const agent = new WritingAgent("test-model");
            const planOutput = { strategicPoints: ["p1"], keywordsToInclude: ["kw1"] };
            const mockJson = {
                resumeMarkdown: "# New Resume",
            };
            mockedGenerateText.mockResolvedValueOnce({
                text: JSON.stringify(mockJson),
                model: "test-model",
                provider: "test-provider"
            });

            const result = await agent.run({ planOutput }, mockContext);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockJson);
        });
    });

    describe("AuditorAgent (The Auditor)", () => {
        it("should perform validation and recommend a template", async () => {
            const agent = new AuditorAgent("test-model");
            const executionOutput = { resumeMarkdown: "# Draft" };
            const mockJson = {
                status: "PASS",
                critique: "",
                suggestedTemplateId: "modern-v1",
                designReasoning: "Good match"
            };
            mockedGenerateText.mockResolvedValueOnce({
                text: JSON.stringify(mockJson),
                model: "test-model",
                provider: "test-provider"
            });

            const result = await agent.run({ executionOutput }, mockContext);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockJson);
        });
    });

    describe("BaseAgent Error Handling", () => {
        it("should return failure if generateText throws", async () => {
            const agent = new ResearchAgent("test-model");
            mockedGenerateText.mockRejectedValueOnce(new Error("AI Oops"));

            const result = await agent.run(undefined, mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toBe("AI Oops");
        });
    });
});
