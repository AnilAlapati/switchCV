import { runAgenticWorkflow } from "../agentOrchestrator";
import { ResearchAgent, PlanningAgent, WritingAgent, AuditorAgent } from "../agents";
import { getSystemConfig } from "../../getSystemConfig";

// Shared mocks
const mockScoutRun = jest.fn();
const mockArchitectRun = jest.fn();
const mockWriterRun = jest.fn();
const mockAuditorRun = jest.fn();

// Mock the agents
jest.mock("../agents", () => ({
    ResearchAgent: jest.fn().mockImplementation(() => ({ run: mockScoutRun })),
    PlanningAgent: jest.fn().mockImplementation(() => ({ run: mockArchitectRun })),
    WritingAgent: jest.fn().mockImplementation(() => ({ run: mockWriterRun })),
    AuditorAgent: jest.fn().mockImplementation(() => ({ run: mockAuditorRun })),
}));

jest.mock("../../getSystemConfig");
jest.mock("../../firebase-admin", () => ({
    adminDb: {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ agentic: { usageCount: 0 } })
        }),
        set: jest.fn().mockResolvedValue({ success: true }),
    },
}));

describe("agentOrchestrator", () => {
    const userId = "test-user-123";
    const userRole = "premium";
    const mockData = {
        userResume: "Old Resume",
        jobDescription: "Future Job",
        mode: "autonomous" as const,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getSystemConfig as jest.Mock).mockResolvedValue({
            agentic: { enabled: true, budgetCap: 100 },
        });
    });

    it("should run the autonomous workflow successfully", async () => {
        mockScoutRun.mockResolvedValue({
            success: true,
            data: { summary: "Research done" },
        });
        mockArchitectRun.mockResolvedValue({
            success: true,
            data: { strategicPoints: ["Point A"] },
        });
        mockWriterRun.mockResolvedValue({
            success: true,
            data: { resumeMarkdown: "# New Resume" },
        });
        mockAuditorRun.mockResolvedValue({
            success: true,
            data: { status: "PASS", suggestedTemplateId: "executive-v1", designReasoning: "Senior role" },
        });

        const result = await runAgenticWorkflow(userId, userRole, mockData);

        expect(result).toEqual({
            resumeMarkdown: "# New Resume",
            templateId: "executive-v1",
            reasoning: "Senior role",
        });

        expect(mockScoutRun).toHaveBeenCalled();
        expect(mockArchitectRun).toHaveBeenCalled();
        expect(mockWriterRun).toHaveBeenCalled();
        expect(mockAuditorRun).toHaveBeenCalled();
    });

    it("should handle failures and return null", async () => {
        mockScoutRun.mockResolvedValue({
            success: false,
            error: "AI Failure",
        });

        const result = await runAgenticWorkflow(userId, userRole, mockData);

        expect(result).toBeNull();
    });
});
