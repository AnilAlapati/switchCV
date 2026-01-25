import { ResearchAgent } from "../ResearchAgent";
import { PlanningAgent } from "../PlanningAgent";
import { ExecutionAgent } from "../ExecutionAgent";
import { ValidationAgent } from "../ValidationAgent";
import { PolishAgent } from "../PolishAgent";
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

    describe("ResearchAgent", () => {
        it("should build correct prompt and parse JSON output", async () => {
            const agent = new ResearchAgent("test-model");
            const mockJson = {
                summary: "Research summary",
                hiddenRequirements: ["req1"],
                culturalIndicators: ["ind1"],
            };
            mockedGenerateText.mockResolvedValueOnce({ text: JSON.stringify(mockJson) });

            const result = await agent.run(undefined, mockContext);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockJson);
            expect(mockedGenerateText).toHaveBeenCalledWith(
                expect.stringContaining("Analyze the Job Description"),
                2000,
                0.7,
                "test-model"
            );
        });

        it("should fallback to raw text if JSON parsing fails", async () => {
            const agent = new ResearchAgent("test-model");
            const rawText = "Plain text response";
            mockedGenerateText.mockResolvedValueOnce({ text: rawText });

            const result = await agent.run(undefined, mockContext);

            expect(result.success).toBe(true);
            expect(result.data?.summary).toBe(rawText);
        });
    });

    describe("PlanningAgent", () => {
        it("should build correct prompt using research output and parse JSON", async () => {
            const agent = new PlanningAgent("test-model");
            const researchOutput = { summary: "r-sum", hiddenRequirements: ["h1"] };
            const mockJson = {
                strategicPoints: ["p1"],
                keywordsToInclude: ["kw1"],
                sectionsToEnhance: ["sec1"],
            };
            mockedGenerateText.mockResolvedValueOnce({ text: JSON.stringify(mockJson) });

            const result = await agent.run({ researchOutput }, mockContext);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockJson);
            expect(mockedGenerateText).toHaveBeenCalledWith(
                expect.stringContaining("RESEARCH SUMMARY:\nr-sum"),
                2000,
                0.7,
                "test-model"
            );
        });
    });

    describe("ExecutionAgent", () => {
        it("should build correct prompt and parse Markdown output", async () => {
            const agent = new ExecutionAgent("test-model");
            const planOutput = { strategicPoints: ["p1"], keywordsToInclude: ["kw1"] };
            const mockJson = {
                resumeMarkdown: "# New Resume",
            };
            mockedGenerateText.mockResolvedValueOnce({ text: JSON.stringify(mockJson) });

            const result = await agent.run({ planOutput }, mockContext);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockJson);
        });
    });

    describe("ValidationAgent", () => {
        it("should build correct prompt and parse validation output", async () => {
            const agent = new ValidationAgent("test-model");
            const executionOutput = { resumeMarkdown: "# Draft" };
            const mockJson = {
                status: "PASS",
                critique: "",
                missingKeywords: [],
            };
            mockedGenerateText.mockResolvedValueOnce({ text: JSON.stringify(mockJson) });

            const result = await agent.run({ executionOutput }, mockContext);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockJson);
        });
    });

    describe("PolishAgent", () => {
        it("should build correct prompt and parse polished output", async () => {
            const agent = new PolishAgent("test-model");
            const executionOutput = { resumeMarkdown: "# Draft" };
            const validationOutput = { status: "NEEDS_WORK", critique: "Weak tone" };
            const mockJson = {
                finalResumeMarkdown: "# Final",
            };
            mockedGenerateText.mockResolvedValueOnce({ text: JSON.stringify(mockJson) });

            const result = await agent.run({ executionOutput, validationOutput }, mockContext);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockJson);
            expect(mockedGenerateText).toHaveBeenCalledWith(
                expect.stringContaining("Weak tone"),
                2000,
                0.7,
                "test-model"
            );
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
