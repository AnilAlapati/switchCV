/**
 * Agent Orchestrator — Multi-Agent Revision Loop Tests
 *
 * Covers branches NOT present in the basic agentOrchestrator.test.ts:
 *
 *   A. Revision loop (core)
 *      1. Auditor NEEDS_WORK → Writer re-runs with critique injected into context
 *      2. Revised Writer succeeds → revised markdown used in final result
 *      3. Revised Writer fails → original Writer output used (graceful fallback)
 *      4. NEEDS_WORK with no critique text → revision still attempted
 *
 *   B. Standard workflow (2-agent: Planning → Writing)
 *      5. Standard mode success (Research + Auditor NOT called)
 *      6. Standard mode ArchitectAgent fails → returns null
 *      7. Standard mode WriterAgent fails → returns null
 *
 *   C. Gate checks
 *      8.  Kill switch disabled (config.agentic.enabled = false) → null
 *      9.  Free tier budget cap exceeded → null
 *      10. Free tier user usage limit exceeded → null
 *      11. Premium tier bypasses budget + user limit checks
 *
 *   D. Cost tracking
 *      12. Free tier standard mode → trackCost called with standard cost ($0.003)
 *      13. Free tier autonomous mode → trackCost called with autonomous cost ($0.008)
 *      14. Premium tier → trackCost NOT called
 *
 *   E. Context injection
 *      15. Auditor critique is correctly appended to WriterAgent context.instructions
 *      16. Original instructions (if any) are preserved before the critique
 */

// ============================================================================
// SHARED MOCK REFS (declared before imports)
// ============================================================================

const mockScoutRun = jest.fn();
const mockArchitectRun = jest.fn();
const mockWriterRun = jest.fn();
const mockAuditorRun = jest.fn();
const mockCheckSystemBudget = jest.fn();
const mockTrackCost = jest.fn();

// ============================================================================
// MOCKS
// ============================================================================

jest.mock("../agents", () => ({
  ResearchAgent: jest.fn().mockImplementation(() => ({ run: mockScoutRun })),
  PlanningAgent: jest.fn().mockImplementation(() => ({
    run: mockArchitectRun,
  })),
  WritingAgent: jest.fn().mockImplementation(() => ({ run: mockWriterRun })),
  AuditorAgent: jest.fn().mockImplementation(() => ({ run: mockAuditorRun })),
}));

jest.mock("../../getSystemConfig");

jest.mock("../billingService", () => ({
  BillingService: {
    checkSystemBudget: (...args: unknown[]) => mockCheckSystemBudget(...args),
    trackCost: (...args: unknown[]) => {
      mockTrackCost(...args);
      return Promise.resolve();
    },
  },
}));

// Mock dynamic imports used inside agentOrchestrator
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ agentic: { usageCount: 0 } }),
    }),
    set: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: { increment: jest.fn((n: number) => ({ _increment: n })) },
}));

jest.mock("@/lib/config.client", () => ({
  FREE_TIER_AGENT_LIMIT: 3,
}));

jest.mock("@/lib/config/aiModels", () => ({
  getTierModels: jest.fn().mockReturnValue({
    planning: "gemini-pro-model",
    execution: "gemini-flash-model",
  }),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { runAgenticWorkflow } from "../agentOrchestrator";
import { getSystemConfig } from "../../getSystemConfig";

// ============================================================================
// FIXTURES
// ============================================================================

const RESEARCH_OUTPUT = { summary: "Role needs distributed systems expertise" };
const PLAN_OUTPUT = {
  strategicPoints: ["Highlight scale", "Add Kubernetes"],
  keywordsToInclude: ["K8s"],
};
const ORIGINAL_MARKDOWN = "# Original Resume\nGood but unrevised.";
const REVISED_MARKDOWN = "# Revised Resume\nImproved after critique.";
const AUDITOR_CRITIQUE =
  "Missing quantified achievements and leadership examples.";

function setupEnabledConfig() {
  (getSystemConfig as jest.Mock).mockResolvedValue({
    agentic: { enabled: true, budgetCap: 100 },
  });
}

function successResearch() {
  mockScoutRun.mockResolvedValue({ success: true, data: RESEARCH_OUTPUT });
}

function successPlan() {
  mockArchitectRun.mockResolvedValue({ success: true, data: PLAN_OUTPUT });
}

function successWrite(markdown = ORIGINAL_MARKDOWN) {
  mockWriterRun.mockResolvedValue({
    success: true,
    data: { resumeMarkdown: markdown },
  });
}

function auditorPass() {
  mockAuditorRun.mockResolvedValue({
    success: true,
    data: {
      status: "PASS",
      suggestedTemplateId: "signal-v1",
      designReasoning: "Technical role.",
    },
  });
}

function auditorNeedsWork(critique = AUDITOR_CRITIQUE) {
  mockAuditorRun.mockResolvedValue({
    success: true,
    data: {
      status: "NEEDS_WORK",
      critique,
      suggestedTemplateId: "executive-v1",
      designReasoning: "Leadership role.",
    },
  });
}

const BASE_DATA_AUTONOMOUS = {
  userResume: "My old resume",
  jobDescription: "Senior Engineer",
  mode: "autonomous" as const,
};

const BASE_DATA_STANDARD = {
  userResume: "My old resume",
  jobDescription: "Senior Engineer",
  mode: "standard" as const,
};

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  // Also reset once-queues on leaf mocks to prevent cross-test contamination.
  // (clearAllMocks does not clear mockResolvedValueOnce queues.)
  mockScoutRun.mockReset();
  mockArchitectRun.mockReset();
  mockWriterRun.mockReset();
  mockAuditorRun.mockReset();
  setupEnabledConfig();
  mockCheckSystemBudget.mockResolvedValue(true);
  mockTrackCost.mockImplementation(() => {});
});

// ============================================================================
// TESTS
// ============================================================================

describe("Agent Orchestrator — Multi-Agent Revision Loop", () => {
  // -------------------------------------------------------------------------
  // A. Revision Loop
  // -------------------------------------------------------------------------
  describe("A. Revision loop — Auditor returns NEEDS_WORK", () => {
    it("A1: calls WriterAgent twice when Auditor returns NEEDS_WORK", async () => {
      successResearch();
      successPlan();
      successWrite(ORIGINAL_MARKDOWN);
      auditorNeedsWork();
      // Second Writer call (revision) → succeeds
      mockWriterRun.mockResolvedValueOnce({
        success: true,
        data: { resumeMarkdown: REVISED_MARKDOWN },
      });

      await runAgenticWorkflow("user-1", "premium", BASE_DATA_AUTONOMOUS);

      expect(mockWriterRun).toHaveBeenCalledTimes(2);
    });

    it("A2: uses revised markdown when second Writer succeeds", async () => {
      successResearch();
      successPlan();
      // First writer call
      mockWriterRun
        .mockResolvedValueOnce({
          success: true,
          data: { resumeMarkdown: ORIGINAL_MARKDOWN },
        })
        // Second writer call (revision)
        .mockResolvedValueOnce({
          success: true,
          data: { resumeMarkdown: REVISED_MARKDOWN },
        });
      auditorNeedsWork();

      const result = await runAgenticWorkflow(
        "user-1",
        "premium",
        BASE_DATA_AUTONOMOUS,
      );

      expect(result?.resumeMarkdown).toBe(REVISED_MARKDOWN);
    });

    it("A3: falls back to original Writer output when revised Writer fails", async () => {
      successResearch();
      successPlan();
      // First writer call succeeds
      mockWriterRun
        .mockResolvedValueOnce({
          success: true,
          data: { resumeMarkdown: ORIGINAL_MARKDOWN },
        })
        // Second writer call (revision) fails
        .mockResolvedValueOnce({
          success: false,
          error: "LLM quota exceeded",
        });
      auditorNeedsWork();

      const result = await runAgenticWorkflow(
        "user-1",
        "premium",
        BASE_DATA_AUTONOMOUS,
      );

      // Should still return a result with the original markdown
      expect(result?.resumeMarkdown).toBe(ORIGINAL_MARKDOWN);
      expect(mockWriterRun).toHaveBeenCalledTimes(2);
    });

    it("A4: skips revision when critique is empty string (falsy guard)", async () => {
      // The orchestrator guards revision with `&& auditorResult.data?.critique`.
      // An empty string is falsy, so revision is NOT triggered.
      successResearch();
      successPlan();
      successWrite(ORIGINAL_MARKDOWN); // only one writer call expected
      auditorNeedsWork(""); // NEEDS_WORK but empty critique → falsy guard

      const result = await runAgenticWorkflow(
        "user-1",
        "premium",
        BASE_DATA_AUTONOMOUS,
      );

      // Revision skipped — writer called exactly once, original markdown used
      expect(mockWriterRun).toHaveBeenCalledTimes(1);
      expect(result?.resumeMarkdown).toBe(ORIGINAL_MARKDOWN);
    });
  });

  // -------------------------------------------------------------------------
  // B. Standard workflow (2-agent)
  // -------------------------------------------------------------------------
  describe("B. Standard workflow (Planning → Writing)", () => {
    it("B5: standard mode succeeds without calling Research or Auditor agents", async () => {
      successPlan();
      successWrite(ORIGINAL_MARKDOWN);

      const result = await runAgenticWorkflow(
        "user-1",
        "premium",
        BASE_DATA_STANDARD,
      );

      expect(result).not.toBeNull();
      expect(result?.resumeMarkdown).toBe(ORIGINAL_MARKDOWN);
      expect(mockScoutRun).not.toHaveBeenCalled();
      expect(mockAuditorRun).not.toHaveBeenCalled();
      expect(mockArchitectRun).toHaveBeenCalledTimes(1);
      expect(mockWriterRun).toHaveBeenCalledTimes(1);
    });

    it("B6: standard mode returns null when PlanningAgent fails", async () => {
      mockArchitectRun.mockResolvedValue({
        success: false,
        error: "AI overloaded",
      });

      const result = await runAgenticWorkflow(
        "user-1",
        "premium",
        BASE_DATA_STANDARD,
      );

      expect(result).toBeNull();
    });

    it("B7: standard mode returns null when WritingAgent fails", async () => {
      successPlan();
      mockWriterRun.mockResolvedValue({
        success: false,
        error: "Context too long",
      });

      const result = await runAgenticWorkflow(
        "user-1",
        "premium",
        BASE_DATA_STANDARD,
      );

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // C. Gate checks
  // -------------------------------------------------------------------------
  describe("C. Gate checks", () => {
    it("C8: returns null immediately when kill switch is disabled", async () => {
      (getSystemConfig as jest.Mock).mockResolvedValue({
        agentic: { enabled: false, budgetCap: 100 },
      });

      const result = await runAgenticWorkflow(
        "user-1",
        "premium",
        BASE_DATA_AUTONOMOUS,
      );

      expect(result).toBeNull();
      expect(mockScoutRun).not.toHaveBeenCalled();
    });

    it("C9: returns null for free tier when budget cap is exceeded", async () => {
      mockCheckSystemBudget.mockResolvedValue(false);

      const result = await runAgenticWorkflow(
        "user-1",
        "basic", // free tier role
        BASE_DATA_AUTONOMOUS,
      );

      expect(result).toBeNull();
      expect(mockCheckSystemBudget).toHaveBeenCalledWith(100);
    });

    it("C10: returns null for free tier when user has reached usage limit", async () => {
      // Override adminDb.get to return a user who has used all 3 free runs
      const { adminDb } = jest.requireMock("@/lib/firebase-admin");
      adminDb.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ agentic: { usageCount: 3 } }), // >= FREE_TIER_AGENT_LIMIT (3)
      });

      const result = await runAgenticWorkflow(
        "user-1",
        "jobseeker", // free tier role
        BASE_DATA_AUTONOMOUS,
      );

      expect(result).toBeNull();
    });

    it("C11: premium tier skips budget and user limit checks", async () => {
      successResearch();
      successPlan();
      successWrite();
      auditorPass();

      await runAgenticWorkflow("user-1", "premium", BASE_DATA_AUTONOMOUS);

      // checkSystemBudget should NOT be called for premium
      expect(mockCheckSystemBudget).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // D. Cost tracking
  // -------------------------------------------------------------------------
  describe("D. Cost tracking", () => {
    it("D12: free tier standard mode calls trackCost with $0.003", async () => {
      // Setup free tier to pass limit check (usageCount=0)
      mockCheckSystemBudget.mockResolvedValue(true);
      successPlan();
      successWrite();

      await runAgenticWorkflow("user-free", "basic", BASE_DATA_STANDARD);

      expect(mockTrackCost).toHaveBeenCalledWith(
        "user-free",
        0.003,
        "agentic_workflow",
      );
    });

    it("D13: free tier autonomous mode calls trackCost with $0.008", async () => {
      mockCheckSystemBudget.mockResolvedValue(true);
      successResearch();
      successPlan();
      successWrite();
      auditorPass();

      await runAgenticWorkflow("user-free", "basic", BASE_DATA_AUTONOMOUS);

      expect(mockTrackCost).toHaveBeenCalledWith(
        "user-free",
        0.008,
        "agentic_workflow",
      );
    });

    it("D14: premium tier does NOT call trackCost", async () => {
      successResearch();
      successPlan();
      successWrite();
      auditorPass();

      await runAgenticWorkflow("user-premium", "premium", BASE_DATA_AUTONOMOUS);

      expect(mockTrackCost).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // E. Context injection
  // -------------------------------------------------------------------------
  describe("E. Context injection — auditor critique in Writer context", () => {
    it("E15: second WriterAgent call has AUDITOR FEEDBACK in context.instructions", async () => {
      successResearch();
      successPlan();
      mockWriterRun
        .mockResolvedValueOnce({
          success: true,
          data: { resumeMarkdown: ORIGINAL_MARKDOWN },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { resumeMarkdown: REVISED_MARKDOWN },
        });
      auditorNeedsWork(AUDITOR_CRITIQUE);

      await runAgenticWorkflow("user-1", "premium", BASE_DATA_AUTONOMOUS);

      // Second call to WriterAgent.run; the context is the second argument
      const secondCallContext = mockWriterRun.mock.calls[1][1];
      expect(secondCallContext.instructions).toContain("AUDITOR FEEDBACK");
      expect(secondCallContext.instructions).toContain(AUDITOR_CRITIQUE);
    });

    it("E16: original instructions are preserved before the appended critique", async () => {
      successResearch();
      successPlan();
      mockWriterRun
        .mockResolvedValueOnce({
          success: true,
          data: { resumeMarkdown: ORIGINAL_MARKDOWN },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { resumeMarkdown: REVISED_MARKDOWN },
        });
      auditorNeedsWork(AUDITOR_CRITIQUE);

      // Provide existing instructions in the input
      await runAgenticWorkflow("user-1", "premium", {
        ...BASE_DATA_AUTONOMOUS,
        instructions: "Keep it under one page.",
      });

      const secondCallContext = mockWriterRun.mock.calls[1][1];
      expect(secondCallContext.instructions).toContain(
        "Keep it under one page",
      );
      expect(secondCallContext.instructions).toContain("AUDITOR FEEDBACK");
      // Original instructions appear BEFORE the critique
      const instruIdx = secondCallContext.instructions.indexOf(
        "Keep it under one page",
      );
      const critiqueIdx =
        secondCallContext.instructions.indexOf("AUDITOR FEEDBACK");
      expect(instruIdx).toBeLessThan(critiqueIdx);
    });
  });
});
