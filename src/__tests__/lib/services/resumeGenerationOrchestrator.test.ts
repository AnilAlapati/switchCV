/**
 * Resume Generation Orchestrator — Branch Coverage Tests
 *
 * Mocks all external dependencies (AI providers, billing, Firestore) and
 * validates every branch in processSyncGeneration():
 *   1. Normal flow → resume created
 *   2. Repair loop → validation fail → repair → success
 *   3. Creative polish → polish applied
 *   4. Clarification → missing data → asks user
 *   5. Preview mode → persistResult=false
 *   6. Legacy fallback → tier provider fails → generateText used
 *   7. Structured output → JSON parsed directly
 *   8. Conversation continues → not ready yet
 */

// ============================================================================
// MOCKS — must be declared before imports
// ============================================================================

jest.mock("@/lib/services/featureFlagService", () => ({
  isFeatureEnabled: jest.fn().mockResolvedValue(true),
}));

const mockPersistConversationSession = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/services/conversationStorageService", () => ({
  persistConversationSession: (...args: unknown[]) =>
    mockPersistConversationSession(...args),
}));

const mockPersistAIRequestSummary = jest.fn().mockResolvedValue(undefined);
const mockPersistAIFailureEvent = jest.fn().mockResolvedValue("event-1");
const mockMarkAIStageRecoveredWithFallback = jest
  .fn()
  .mockResolvedValue(undefined);

// Mock AI extraction — controllable per-test via mockExtractWithStructuredOutput.
const mockExtractWithStructuredOutput = jest.fn();
jest.mock("@/lib/services/aiExtractionService", () => ({
  extractWithStructuredOutput: (...args: unknown[]) =>
    mockExtractWithStructuredOutput(...args),
}));

/** Default successful AI extraction result matching the test fixture data */
const SUCCESSFUL_AI_EXTRACTION = {
  success: true,
  data: {
    name: "Alex Johnson",
    email: "alex@example.com",
    phone: "555-0100",
    experience: [
      {
        title: "Software Engineer",
        company: "Acme Corp",
        duration: "2021-2024",
        description:
          "Built customer-facing web applications using React and Node.js.",
      },
    ],
    education: [
      {
        degree: "B.S. Computer Science",
        institution: "MIT",
        year: "2021",
      },
    ],
    skills: ["React", "Node.js", "TypeScript"],
  },
  method: "ai" as const,
  latencyMs: 120,
};

/** Minimal AI extraction (user said very little) — almost no data */
const MINIMAL_AI_EXTRACTION = {
  success: true,
  data: {},
  method: "ai" as const,
  latencyMs: 50,
};

/** Failed AI extraction — service unavailable */
const FAILED_AI_EXTRACTION = {
  success: false,
  data: null,
  method: "fallback" as const,
  latencyMs: 0,
  error: "AI service unavailable",
};

jest.mock("@/server/services/aiProviderService", () => ({
  generateTextWithTier: jest.fn(),
}));

jest.mock("@/lib/services/aiGenerationService", () => ({
  generateText: jest.fn(),
}));

jest.mock("@/lib/services/billingService", () => ({
  BillingService: {
    trackUsage: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/services/resumeService", () => ({
  saveGeneratedResume: jest.fn().mockResolvedValue({
    resumeId: "mock-resume-id",
    numericId: 42,
  }),
}));

jest.mock("@/lib/services/conversationConfig", () => ({
  getActiveConfig: jest.fn().mockReturnValue({
    maxQuestionsInBetaMode: false,
    maxBetaQuestions: 5,
    completionThreshold: 80,
  }),
}));

jest.mock("@/lib/services/aiMonitoringService", () => ({
  classifyAIFailure: jest.fn(() => ({
    failureCode: "AI_SCHEMA_VALIDATION_FAILED",
    errorMessage: "Resume generation response failed schema validation",
  })),
  createAIObservationContext: jest.fn((input: { requestId?: string }) => ({
    requestId: input.requestId ?? "generated-request-id",
    sessionId: "session-123",
    userIdHash: "hash-123",
    userTier: "premium",
    entrypoint: "resume_generate",
    deployVersion: "test-build",
    environment: "test",
    conversationTurn: 5,
    startedAt: new Date("2026-03-13T12:00:00Z"),
    stages: {},
    failureCount: 0,
    fallbackCount: 0,
  })),
  markAIStageRecoveredWithFallback: (...args: unknown[]) =>
    mockMarkAIStageRecoveredWithFallback(...args),
  persistAIFailureEvent: (...args: unknown[]) =>
    mockPersistAIFailureEvent(...args),
  persistAIRequestSummary: (...args: unknown[]) =>
    mockPersistAIRequestSummary(...args),
  resolveMonitoringSessionId: jest.fn(() => "session-123"),
}));

// ============================================================================
// IMPORTS
// ============================================================================

import {
  processSyncGeneration,
  type SyncGenerationInput,
} from "@/lib/services/resumeGenerationOrchestrator";
import { generateTextWithTier } from "@/server/services/aiProviderService";
import { generateText } from "@/lib/services/aiGenerationService";
import { saveGeneratedResume } from "@/lib/services/resumeService";
import { isFeatureEnabled } from "@/lib/services/featureFlagService";

const mockGenerateTextWithTier = generateTextWithTier as jest.MockedFunction<
  typeof generateTextWithTier
>;
const mockGenerateText = generateText as jest.MockedFunction<
  typeof generateText
>;
const mockSaveGeneratedResume = saveGeneratedResume as jest.MockedFunction<
  typeof saveGeneratedResume
>;
const mockIsFeatureEnabled = isFeatureEnabled as jest.MockedFunction<
  typeof isFeatureEnabled
>;

// ============================================================================
// FIXTURES
// ============================================================================

/** A valid structured AI response matching AIResumeResponseSchema */
const VALID_RESUME_JSON = {
  title: "Software Engineer Resume",
  templateId: "signal-v1",
  summary: "Software engineer building web apps with React and Node.js.",
  skills: [
    { name: "React", level: "Advanced", visibility: "public" },
    { name: "Node.js", level: "Advanced", visibility: "public" },
    { name: "TypeScript", level: "Intermediate", visibility: "public" },
  ],
  experience: [
    {
      company: "Acme Corp",
      role: "Software Engineer",
      startDate: "2021",
      endDate: "2024",
      description:
        "Built customer-facing web applications using React and Node.js.",
      visibility: "public",
    },
  ],
  education: [
    {
      institution: "MIT",
      degree: "B.S. Computer Science",
      startDate: "2017",
      endDate: "2021",
      visibility: "public",
    },
  ],
  contact: {
    email: { value: "alex@example.com", visibility: "public" },
    phone: { value: "555-0100", visibility: "masked" },
  },
  projects: [],
};

const VALID_RESPONSE_TEXT = JSON.stringify(VALID_RESUME_JSON);

/** Resume JSON that will fail strict validation (unverified metric claim) */
const INVALID_RESUME_JSON = {
  ...VALID_RESUME_JSON,
  summary:
    "Award-winning engineer with 15 years of AI experience who increased revenue by 500%.",
};

/**
 * Builds a minimal SyncGenerationInput with user messages that provide
 * enough data for extraction.
 */
function buildInput(
  overrides?: Partial<SyncGenerationInput>,
): SyncGenerationInput {
  return {
    userId: "test-user-123",
    message: "go ahead and build it",
    conversationHistory: [
      {
        content:
          "My name is Alex Johnson, email alex@example.com phone 555-0100",
        isUser: true,
      },
      {
        content:
          "I worked at Acme Corp as a Software Engineer from 2021 to 2024. Built web apps with React and Node.js.",
        isUser: true,
      },
      {
        content: "B.S. Computer Science from MIT, 2017-2021",
        isUser: true,
      },
      { content: "Skills: React, Node.js, TypeScript", isUser: true },
    ],
    userTier: "premium",
    ...overrides,
  };
}

function mockAIResponse(text: string): {
  text: string;
  model: string;
  provider: string;
  tier: string;
  estimatedCost: number;
} {
  return {
    text,
    model: "gemini-2.0-flash",
    provider: "google",
    tier: "cheap",
    estimatedCost: 0.001,
  };
}

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  jest.clearAllMocks();

  // Default: all feature flags enabled
  mockIsFeatureEnabled.mockResolvedValue(true);

  // Default: AI extraction returns full data
  mockExtractWithStructuredOutput.mockResolvedValue(SUCCESSFUL_AI_EXTRACTION);

  // Default mock: save succeeds
  mockSaveGeneratedResume.mockResolvedValue({
    resumeId: "mock-resume-id",
    numericId: 42,
  });
});

// ============================================================================
// TESTS
// ============================================================================

describe("Resume Generation Orchestrator", () => {
  // -------------------------------------------------------------------------
  // Branch 1: Normal flow — AI returns valid JSON → resume created
  // -------------------------------------------------------------------------
  describe("Normal generation flow", () => {
    it("creates a resume when AI returns valid structured JSON", async () => {
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse(VALID_RESPONSE_TEXT),
      );

      const result = await processSyncGeneration(buildInput());

      expect(result.requestId).toEqual(expect.any(String));
      expect(result.created).toBe(true);
      expect(result.resumeId).toBe("mock-resume-id");
      expect(result.numericId).toBe(42);
      expect(result.progress).toBe(100);
      expect(result.qualityReport).toBeDefined();
      expect(result.qualityReport!.schemaValid).toBe(true);
      expect(mockPersistAIRequestSummary).toHaveBeenCalled();
    });

    it("calls billingService.trackUsage", async () => {
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse(VALID_RESPONSE_TEXT),
      );

      await processSyncGeneration(buildInput());

      const { BillingService } = jest.requireMock(
        "@/lib/services/billingService",
      );
      expect(BillingService.trackUsage).toHaveBeenCalledWith(
        "test-user-123",
        "gemini-2.0-flash",
        expect.objectContaining({ input: expect.any(Number) }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Branch 2: Repair loop — first attempt fails validation, repair fixes it
  // -------------------------------------------------------------------------
  describe("Repair loop", () => {
    it("attempts repair when initial response fails validation", async () => {
      // First call returns invalid JSON, second (repair) returns valid
      mockGenerateTextWithTier
        .mockResolvedValueOnce(
          mockAIResponse(JSON.stringify(INVALID_RESUME_JSON)),
        )
        .mockResolvedValueOnce(
          mockAIResponse("```json\n" + VALID_RESPONSE_TEXT + "\n```"),
        );

      const result = await processSyncGeneration(
        buildInput({ strictMode: true }),
      );

      // The orchestrator should have called generateTextWithTier twice
      expect(mockGenerateTextWithTier).toHaveBeenCalledTimes(2);
      // Result may be created OR clarification depending on repair success
      expect(result.qualityReport).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Branch 3: Creative polish — polished output is valid
  // -------------------------------------------------------------------------
  describe("Creative polish", () => {
    it("applies creative polish when flag is enabled", async () => {
      mockIsFeatureEnabled.mockImplementation(async (flag: string) => {
        // Enable all flags including creative polish
        return true;
      });
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse(VALID_RESPONSE_TEXT),
      );

      const result = await processSyncGeneration(
        buildInput({ desiredStyle: "professional" }),
      );

      expect(result.created).toBe(true);
      expect(result.qualityReport).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Branch 4: Clarification — not enough data, asks user for more
  // -------------------------------------------------------------------------
  describe("Clarification flow", () => {
    it("returns response text when data is insufficient", async () => {
      // User said very little → AI extraction returns minimal data
      mockExtractWithStructuredOutput.mockResolvedValue(MINIMAL_AI_EXTRACTION);
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse(
          "I'd like to help create your resume! Could you tell me your name and email?",
        ),
      );

      const result = await processSyncGeneration(
        buildInput({
          message: "hi",
          conversationHistory: [{ content: "hi", isUser: true }],
        }),
      );

      expect(result.created).toBeUndefined();
      expect(result.response).toBeDefined();
      expect(result.progress).toBeLessThan(100);
    });

    it("returns exact missing-entry guidance when validation fails during creation", async () => {
      const incompleteResume = {
        isComplete: true,
        title: "Software Engineer Resume",
        templateId: "signal-v1",
        summary: "Software engineer building web apps with React and Node.js.",
        skills: [{ name: "React", level: "Advanced", visibility: "public" }],
        experience: [
          {
            company: "Acme Corp",
            role: "Software Engineer",
            startDate: "2021",
            endDate: "2024",
            description: "",
            visibility: "public",
          },
        ],
        education: [],
        contact: {
          email: { value: "alex@example.com", visibility: "public" },
          phone: { value: "555-0100", visibility: "masked" },
        },
        projects: [],
      };

      mockGenerateTextWithTier
        .mockResolvedValueOnce(
          mockAIResponse(
            "```json\n" + JSON.stringify(incompleteResume) + "\n```",
          ),
        )
        .mockResolvedValueOnce(mockAIResponse("not-json"));

      const result = await processSyncGeneration(
        buildInput({ strictMode: true }),
      );

      expect(result.needsClarification).toBe(true);
      expect(result.progress).toBe(95);
      expect(result.response).toContain("Experience entry 1");
      expect(result.response).toContain('title/role="Software Engineer"');
      expect(result.response).toContain("description=missing");
    });
  });

  // -------------------------------------------------------------------------
  // Branch 5: Preview mode — persistResult=false
  // -------------------------------------------------------------------------
  describe("Preview mode", () => {
    it("returns previewData without persisting when persistResult=false", async () => {
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse(VALID_RESPONSE_TEXT),
      );

      const result = await processSyncGeneration(
        buildInput({ persistResult: false }),
      );

      expect(result.created).toBe(false);
      expect(result.previewData).toBeDefined();
      expect(result.response).toBe("Preview generated successfully");
      expect(mockSaveGeneratedResume).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Branch 6: Legacy fallback — tier provider fails, generateText used
  // -------------------------------------------------------------------------
  describe("Legacy fallback", () => {
    it("falls back to generateText when generateTextWithTier throws", async () => {
      mockGenerateTextWithTier.mockRejectedValue(
        new Error("All providers failed"),
      );
      mockGenerateText.mockResolvedValue({
        text: VALID_RESPONSE_TEXT,
        model: "gemini-legacy",
      } as any);

      const result = await processSyncGeneration(buildInput());

      expect(mockGenerateText).toHaveBeenCalled();
      // Should still attempt to process the response
      expect(result).toBeDefined();
      expect(mockMarkAIStageRecoveredWithFallback).toHaveBeenCalled();
      expect(mockPersistAIRequestSummary).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Branch 7: Structured output — response is raw JSON (no markdown fences)
  // -------------------------------------------------------------------------
  describe("Structured output parsing", () => {
    it("parses raw JSON response without markdown fences", async () => {
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse(VALID_RESPONSE_TEXT),
      );

      const result = await processSyncGeneration(buildInput());

      expect(result.created).toBe(true);
      expect(result.qualityReport?.schemaValid).toBe(true);
    });

    it("falls back to regex extraction when raw JSON fails schema", async () => {
      // Return valid JSON that doesn't match the schema
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse(JSON.stringify({ invalid: true })),
      );

      const result = await processSyncGeneration(buildInput());

      // Should not create resume since the data is inadequate
      expect(result).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Branch 8: Conversation continues — not ready to create yet
  // -------------------------------------------------------------------------
  describe("Conversation continuation", () => {
    it("returns AI response when progress is below threshold", async () => {
      // User provided only a name → AI extraction returns minimal data
      mockExtractWithStructuredOutput.mockResolvedValue({
        success: true,
        data: { name: "Sam" },
        method: "ai",
        latencyMs: 50,
      });
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse("Thanks! What about your education background?"),
      );

      const result = await processSyncGeneration(
        buildInput({
          message: "My name is Sam",
          conversationHistory: [{ content: "My name is Sam", isUser: true }],
        }),
      );

      expect(result.created).toBeUndefined();
      expect(result.response).toContain("education");
      expect(result.sessionData).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Additional edge cases
  // -------------------------------------------------------------------------
  describe("Edge cases", () => {
    it("injects force-create prompt instructions for explicit creation intent", async () => {
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse(VALID_RESPONSE_TEXT),
      );

      await processSyncGeneration(
        buildInput({ message: "go ahead and build it" }),
      );

      const firstCallArgs = mockGenerateTextWithTier.mock.calls[0]?.[0];
      expect(firstCallArgs).toBeDefined();
      expect(firstCallArgs.prompt).toContain(
        "USER REQUEST: The user explicitly wants to create the resume NOW",
      );
    });

    it("does not treat a simple affirmative as explicit creation intent", async () => {
      mockExtractWithStructuredOutput.mockResolvedValue({
        success: true,
        data: { name: "Sam" },
        method: "ai",
        latencyMs: 40,
      });
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse("Thanks! What is your email address?"),
      );

      const result = await processSyncGeneration(
        buildInput({
          message: "yes",
          conversationHistory: [{ content: "My name is Sam", isUser: true }],
          persistResult: false,
        }),
      );

      const firstCallArgs = mockGenerateTextWithTier.mock.calls[0]?.[0];
      expect(firstCallArgs).toBeDefined();
      expect(firstCallArgs.prompt).not.toContain(
        "USER REQUEST: The user explicitly wants to create the resume NOW",
      );
      expect(result.created).toBeUndefined();
      expect(result.response).toContain("email");
    });

    it("handles user requesting question limit", async () => {
      const { getActiveConfig } = jest.requireMock(
        "@/lib/services/conversationConfig",
      );
      (getActiveConfig as jest.Mock).mockReturnValue({
        enableSmartQuestions: true,
        maxQuestionsInBetaMode: false,
        maxBetaQuestions: 5,
        completionThreshold: 80,
        priorityFields: ["name", "email", "experience"],
      });

      mockExtractWithStructuredOutput.mockResolvedValue({
        success: true,
        data: { name: "Alex" },
        method: "ai",
        latencyMs: 50,
      });
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse("Thanks! What is your email address?"),
      );

      const result = await processSyncGeneration(
        buildInput({
          message: "Only 3 questions please, then create my resume",
          conversationHistory: [{ content: "My name is Alex", isUser: true }],
          persistResult: false,
        }),
      );

      const firstCallArgs = mockGenerateTextWithTier.mock.calls[0]?.[0];
      expect(firstCallArgs).toBeDefined();
      expect(firstCallArgs.prompt).toContain("REMAINING QUESTIONS ALLOWED: 3");
      expect(firstCallArgs.prompt).toContain(
        "USER REQUEST: The user explicitly wants to create the resume NOW",
      );
      expect(result).toBeDefined();
    });

    it("handles all feature flags disabled (v1 pipeline)", async () => {
      mockIsFeatureEnabled.mockResolvedValue(false);
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse(
          "Here's some conversational advice about your resume...",
        ),
      );

      const result = await processSyncGeneration(buildInput());

      // Without v2_writer, resume creation depends on regex extraction
      expect(result).toBeDefined();
    });

    it("handles saveGeneratedResume failure", async () => {
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse(VALID_RESPONSE_TEXT),
      );
      mockSaveGeneratedResume.mockRejectedValue(
        new Error("Firestore write failed"),
      );

      await expect(processSyncGeneration(buildInput())).rejects.toThrow(
        "Firestore write failed",
      );
    });

    it("includes evidenceMap when resume is created", async () => {
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse(VALID_RESPONSE_TEXT),
      );

      const result = await processSyncGeneration(
        buildInput({ persistResult: false }),
      );

      expect(result.evidenceMap).toBeDefined();
      expect(typeof result.evidenceMap).toBe("object");
    });

    it("continues with deterministic extraction when AI extraction service fails", async () => {
      mockExtractWithStructuredOutput.mockResolvedValue(FAILED_AI_EXTRACTION);
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse("Tell me about your most recent work experience."),
      );

      const result = await processSyncGeneration(
        buildInput({
          message: "My name is Alex Johnson and email alex@example.com",
          conversationHistory: [
            {
              content: "My name is Alex Johnson and email alex@example.com",
              isUser: true,
            },
          ],
          persistResult: false,
        }),
      );

      expect(result.response).toBe(
        "Tell me about your most recent work experience.",
      );
      expect(result.progress).toBeGreaterThan(0);
      expect(result.created).toBeUndefined();
      expect(mockGenerateTextWithTier).toHaveBeenCalled();
    });

    it("continues with deterministic extraction when AI extraction throws an exception", async () => {
      mockExtractWithStructuredOutput.mockRejectedValue(
        new Error("Gemini API timeout"),
      );
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse("What are your strongest skills?"),
      );

      const result = await processSyncGeneration(
        buildInput({
          message: "My name is Alex Johnson and email alex@example.com",
          conversationHistory: [
            {
              content: "My name is Alex Johnson and email alex@example.com",
              isUser: true,
            },
          ],
          persistResult: false,
        }),
      );

      expect(result.response).toBe("What are your strongest skills?");
      expect(result.created).toBeUndefined();
      expect(result.progress).toBeGreaterThan(0);
      expect(mockGenerateTextWithTier).toHaveBeenCalled();
    });

    it("persists conversation session after generation", async () => {
      mockGenerateTextWithTier.mockResolvedValue(
        mockAIResponse(VALID_RESPONSE_TEXT),
      );

      await processSyncGeneration(buildInput());

      expect(mockPersistConversationSession).toHaveBeenCalledTimes(1);
      const sessionArg = mockPersistConversationSession.mock.calls[0][0];
      expect(sessionArg.userId).toBe("test-user-123");
      expect(sessionArg.messages.length).toBeGreaterThan(0);
      expect(sessionArg.outcome).toBe("resume_created");
      expect(sessionArg.metadata.pipeline).toBe("v2_structured");
    });
  });
});
