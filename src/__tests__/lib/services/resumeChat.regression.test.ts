/**
 * Resume Chat Regression Test Suite — v3 Function Calling
 *
 * 15 scenarios across 3 categories:
 *   Category A: Normal data collection (model stores data, asks follow-ups)
 *   Category B: Intent / meta-message filtering (MUST be 100% — no false extractions)
 *   Category C: Edge cases and robustness
 *
 * Confidence score = (passed / total) × 100.
 * CI gate: confidence ≥ 90.
 */

// ============================================================================
// MOCKS
// ============================================================================

jest.mock("@/lib/services/featureFlagService", () => ({
  isFeatureEnabled: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/lib/services/conversationStorageService", () => ({
  persistConversationSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/services/aiMonitoringService", () => ({
  classifyAIFailure: jest.fn(() => ({
    failureCode: "UNKNOWN_ERROR",
    errorMessage: "error",
    httpStatus: 500,
    providerErrorClass: "unknown",
  })),
  createAIObservationContext: jest.fn(() => ({
    requestId: "test-req",
    startedAt: new Date(),
  })),
  markAIStageFailed: jest.fn(),
  markAIStageSuccess: jest.fn().mockResolvedValue(undefined),
  markAIStageRecoveredWithFallback: jest.fn().mockResolvedValue(undefined),
  noteAIStageAttempt: jest.fn(),
  persistAIFailureEvent: jest.fn().mockResolvedValue("event-id"),
  persistAIRequestSummary: jest.fn().mockResolvedValue(undefined),
  resolveMonitoringSessionId: jest.fn(() => "session-id"),
}));

jest.mock("@/lib/services/billingService", () => ({
  BillingService: {
    trackUsage: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/services/resumeService", () => ({
  saveGeneratedResume: jest.fn().mockResolvedValue({
    resumeId: "resume-123",
    numericId: 1,
  }),
}));

jest.mock("@/lib/services/conversationConfig", () => ({
  getActiveConfig: jest.fn().mockReturnValue({
    maxQuestionsInBetaMode: false,
    completionThreshold: 80,
  }),
}));

jest.mock("@/lib/services/serverAnalytics", () => ({
  captureServerEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/services/aiExtractionService", () => ({
  extractWithStructuredOutput: jest.fn().mockResolvedValue({
    success: true,
    data: {},
    method: "ai",
    latencyMs: 10,
  }),
}));

jest.mock("@/lib/services/aiGenerationService", () => ({
  generateText: jest.fn(),
}));

// The star of the show — we control what tool calls the model returns
const mockGenerateTextWithTier = jest.fn();
jest.mock("@/server/services/aiProviderService", () => ({
  generateTextWithTier: (...args: unknown[]) =>
    mockGenerateTextWithTier(...args),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { processFunctionCallingGeneration } from "@/lib/services/resumeGenerationOrchestrator";
import type { SyncGenerationInput } from "@/lib/services/resumeGenerationOrchestrator";
import type { AIToolCall } from "@/types/ai";

// ============================================================================
// HELPERS
// ============================================================================

function makeInput(
  message: string,
  collectedData: Record<string, unknown> = {},
  history: Array<{ content: string; isUser: boolean }> = [],
): SyncGenerationInput {
  return {
    userId: "test-user",
    message,
    conversationHistory: history,
    sessionData: { collectedData },
    userTier: "premium",
    persistResult: false, // preview mode to avoid complex save logic in most tests
  };
}

function mockAIReply(text: string, toolCalls: AIToolCall[] = []) {
  mockGenerateTextWithTier.mockResolvedValueOnce({
    text,
    model: "gemini-2.5-pro",
    toolCalls,
  });
}

// ============================================================================
// SCENARIO RUNNER
// ============================================================================

interface ScenarioResult {
  name: string;
  passed: boolean;
  error?: string;
}

const scenarioResults: ScenarioResult[] = [];

async function runScenario(
  name: string,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
    scenarioResults.push({ name, passed: true });
  } catch (err) {
    scenarioResults.push({
      name,
      passed: false,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ============================================================================
// CATEGORY A: Normal data collection
// ============================================================================

describe("Category A — Normal data collection", () => {
  beforeEach(() => jest.clearAllMocks());

  it("A1: stores name+email when set_contact_info is called", async () => {
    await runScenario(
      "A1: set_contact_info stores name and email",
      async () => {
        mockAIReply("Got it! What's your professional summary?", [
          {
            name: "set_contact_info",
            args: { name: "Jane Doe", email: "jane@example.com" },
          },
        ]);

        const result = await processFunctionCallingGeneration(
          makeInput("Hi, I'm Jane Doe, jane@example.com"),
        );

        expect(result.sessionData?.collectedData).toMatchObject({
          name: "Jane Doe",
          email: "jane@example.com",
        });
        expect(result.response).toContain("Got it");
      },
    );
  });

  it("A2: stores professional summary when set_summary is called", async () => {
    await runScenario("A2: set_summary stores summary text", async () => {
      mockAIReply("Great summary! Tell me about your work experience.", [
        {
          name: "set_summary",
          args: {
            summary: "Full-stack engineer with 5 years of experience in React.",
          },
        },
      ]);

      const result = await processFunctionCallingGeneration(
        makeInput(
          "I'm a full-stack engineer with 5 years of experience in React.",
          { name: "Jane Doe", email: "jane@example.com" },
        ),
      );

      expect(result.sessionData?.collectedData).toMatchObject({
        summary: "Full-stack engineer with 5 years of experience in React.",
      });
    });
  });

  it("A3: adds experience entry when add_experience is called", async () => {
    await runScenario(
      "A3: add_experience creates experience entry",
      async () => {
        mockAIReply("Thanks! Any other roles you'd like to add?", [
          {
            name: "add_experience",
            args: {
              title: "Senior Engineer",
              company: "Acme Corp",
              duration: "2020–2023",
              description: "Led frontend development for the payments team.",
            },
          },
        ]);

        const result = await processFunctionCallingGeneration(
          makeInput("At Acme Corp I was a Senior Engineer from 2020 to 2023.", {
            name: "Jane Doe",
            email: "jane@example.com",
            summary: "Full-stack engineer.",
          }),
        );

        const experience = result.sessionData?.collectedData
          ?.experience as Array<Record<string, unknown>>;
        expect(Array.isArray(experience)).toBe(true);
        expect(experience[0]).toMatchObject({
          title: "Senior Engineer",
          company: "Acme Corp",
        });
      },
    );
  });

  it("A4: adds education entry when add_education is called", async () => {
    await runScenario("A4: add_education creates education entry", async () => {
      mockAIReply("Nice! What skills would you like to highlight?", [
        {
          name: "add_education",
          args: {
            degree: "B.Tech Computer Science",
            institution: "IIT Delhi",
            year: "2018",
            gpa: "8.5/10",
          },
        },
      ]);

      const result = await processFunctionCallingGeneration(
        makeInput("I did B.Tech CS from IIT Delhi in 2018, CGPA 8.5.", {
          name: "Jane Doe",
          email: "jane@example.com",
        }),
      );

      const education = result.sessionData?.collectedData?.education as Array<
        Record<string, unknown>
      >;
      expect(Array.isArray(education)).toBe(true);
      expect(education[0]).toMatchObject({
        degree: "B.Tech Computer Science",
        institution: "IIT Delhi",
      });
    });
  });

  it("A5: stores skills when set_skills is called", async () => {
    await runScenario("A5: set_skills replaces skill list", async () => {
      mockAIReply("Great! Shall I create your resume now?", [
        {
          name: "set_skills",
          args: { skills: "Python, React, SQL, Docker" },
        },
      ]);

      const result = await processFunctionCallingGeneration(
        makeInput("My skills are Python, React, SQL, and Docker."),
      );

      const skills = result.sessionData?.collectedData?.skills as string[];
      expect(Array.isArray(skills)).toBe(true);
      expect(skills).toContain("Python");
      expect(skills).toContain("React");
    });
  });
});

// ============================================================================
// CATEGORY B: Intent / meta-message filtering (MUST be 100%)
// ============================================================================

describe("Category B — Intent filtering (must be 100%)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("B1: 'Create my resume now' — no data tool calls, no data stored", async () => {
    await runScenario("B1: creation intent does not store data", async () => {
      // Model should respond conversationally without storing anything
      mockAIReply(
        "I'd love to create your resume! Can you start by telling me your name and email?",
        [], // No tool calls — model recognises this is intent, not data
      );

      const result = await processFunctionCallingGeneration(
        makeInput("Create my resume now"),
      );

      // No data should have been stored
      const stored = result.sessionData?.collectedData ?? {};
      const storedKeys = Object.keys(stored).filter(
        (k) => stored[k] !== undefined && stored[k] !== "",
      );
      expect(storedKeys.length).toBe(0);
    });
  });

  it("B2: UI complaint is not stored as resume content", async () => {
    await runScenario("B2: UI complaint not stored as data", async () => {
      mockAIReply(
        "I see the preview shows your name and education — I'm still collecting more info. What about your work experience?",
        [], // No tool calls
      );

      const startingData = {
        name: "Alice",
        email: "alice@example.com",
      };

      const result = await processFunctionCallingGeneration(
        makeInput(
          "How much information did you receive? Live preview just shows name and education",
          startingData,
        ),
      );

      // Existing data preserved but complaint text NOT added as summary or any field
      expect(result.sessionData?.collectedData?.name).toBe("Alice");
      expect(JSON.stringify(result.sessionData?.collectedData)).not.toContain(
        "live preview",
      );
      expect(JSON.stringify(result.sessionData?.collectedData)).not.toContain(
        "Live preview",
      );
    });
  });

  it("B3: Affirmative 'yes' alone does not trigger resume creation without data", async () => {
    await runScenario(
      "B3: bare affirmative without data handled gracefully",
      async () => {
        mockAIReply(
          "Before I can create your resume, I'll need your name and email. Could you provide those?",
          [],
        );

        const result = await processFunctionCallingGeneration(makeInput("yes"));

        expect(result.created).toBeFalsy();
        expect(result.resumeId).toBeUndefined();
      },
    );
  });

  it("B4: Repeated creation request without data does not produce a resume", async () => {
    await runScenario(
      "B4: repeated creation requests do not manufacture data",
      async () => {
        mockAIReply(
          "I'm ready to help! Please share your name and email to get started.",
          [],
        );

        const result = await processFunctionCallingGeneration(
          makeInput("Create my resume now please, I told you 3 times already"),
        );

        expect(result.created).toBeFalsy();
        expect(result.sessionData?.collectedData?.name).toBeUndefined();
      },
    );
  });

  it("B5: Question about the process is not stored as resume data", async () => {
    await runScenario(
      "B5: process question not stored as resume content",
      async () => {
        mockAIReply(
          "I collect your work history, education, and skills through our conversation, then generate a professional PDF resume.",
          [],
        );

        const result = await processFunctionCallingGeneration(
          makeInput("How does this resume builder work?"),
        );

        const stored = result.sessionData?.collectedData ?? {};
        const storedKeys = Object.keys(stored).filter(
          (k) => stored[k] !== undefined && stored[k] !== "",
        );
        expect(storedKeys.length).toBe(0);
      },
    );
  });
});

// ============================================================================
// CATEGORY C: Edge cases and robustness
// ============================================================================

describe("Category C — Edge cases and robustness", () => {
  beforeEach(() => jest.clearAllMocks());

  it("C1: mark_complete with minimum data triggers save", async () => {
    await runScenario(
      "C1: mark_complete with name+email+summary saves resume",
      async () => {
        const saveGeneratedResume = jest.requireMock<{
          saveGeneratedResume: jest.Mock;
        }>("@/lib/services/resumeService").saveGeneratedResume;

        mockAIReply("Perfect, creating your resume now!", [
          {
            name: "mark_complete",
            args: {
              confirmation_message: "Creating your resume!",
            },
          },
        ]);

        const result = await processFunctionCallingGeneration({
          ...makeInput("Generate it!", {
            name: "Bob Smith",
            email: "bob@example.com",
            summary: "Experienced PM with 10 years in SaaS.",
          }),
          persistResult: true, // trigger save
        });

        expect(saveGeneratedResume).toHaveBeenCalledTimes(1);
        expect(result.created).toBe(true);
        expect(result.resumeId).toBe("resume-123");
      },
    );
  });

  it("C1b: file upload creation persists upload source context", async () => {
    await runScenario(
      "C1b: file upload source context is preserved",
      async () => {
        const saveGeneratedResume = jest.requireMock<{
          saveGeneratedResume: jest.Mock;
        }>("@/lib/services/resumeService").saveGeneratedResume;

        mockAIReply("Creating your resume now.", [
          {
            name: "mark_complete",
            args: { confirmation_message: "Creating your resume!" },
          },
        ]);

        await processFunctionCallingGeneration({
          ...makeInput("Create my resume", {
            name: "Uploaded User",
            email: "uploaded@example.com",
            experience: [
              {
                title: "Engineer",
                company: "Acme",
                duration: "2020 - Present",
                description: "Built internal tools.",
              },
            ],
          }),
          sessionData: {
            collectedData: {
              name: "Uploaded User",
              email: "uploaded@example.com",
              experience: [
                {
                  title: "Engineer",
                  company: "Acme",
                  duration: "2020 - Present",
                  description: "Built internal tools.",
                },
              ],
            },
            wasFileUpload: true,
            sourceRawText: "Uploaded resume raw text",
          },
          inputSources: ["pdf"],
          persistResult: true,
        });

        expect(saveGeneratedResume).toHaveBeenCalledWith(
          "test-user",
          expect.any(Object),
          expect.objectContaining({
            sourceContext: {
              type: "upload",
              rawText: "Uploaded resume raw text",
            },
          }),
        );
      },
    );
  });

  it("C2: mark_complete without minimum data asks for missing fields", async () => {
    await runScenario(
      "C2: mark_complete without minimum data asks for clarification",
      async () => {
        const saveGeneratedResume = jest.requireMock<{
          saveGeneratedResume: jest.Mock;
        }>("@/lib/services/resumeService").saveGeneratedResume;

        // Model tries to complete but there's no data yet
        mockAIReply("Creating now!", [
          {
            name: "mark_complete",
            args: { confirmation_message: "Creating!" },
          },
        ]);

        const result = await processFunctionCallingGeneration({
          ...makeInput("Build my resume"),
          persistResult: true,
        });

        // Should NOT have saved — not enough data
        expect(saveGeneratedResume).not.toHaveBeenCalled();
        expect(result.created).toBeFalsy();
        expect(result.needsClarification).toBe(true);
      },
    );
  });

  it("C3: multiple tool calls in one response are all applied", async () => {
    await runScenario(
      "C3: applying multiple tool calls from one model response",
      async () => {
        mockAIReply("Got all that! Shall I add your skills next?", [
          {
            name: "set_contact_info",
            args: { name: "Carol", email: "carol@test.com" },
          },
          {
            name: "set_summary",
            args: { summary: "Product designer with 7 years experience." },
          },
          {
            name: "add_experience",
            args: {
              title: "Lead Designer",
              company: "DesignCo",
              duration: "2019–Present",
              description: "Led end-to-end product design.",
            },
          },
        ]);

        const result = await processFunctionCallingGeneration(
          makeInput("I'm Carol, carol@test.com, product designer at DesignCo."),
        );

        expect(result.sessionData?.collectedData?.name).toBe("Carol");
        expect(result.sessionData?.collectedData?.summary).toBe(
          "Product designer with 7 years experience.",
        );
        const exp = result.sessionData?.collectedData?.experience as Array<
          Record<string, unknown>
        >;
        expect(exp?.length).toBeGreaterThan(0);
      },
    );
  });

  it("C4: AI failure returns graceful error message, not a crash", async () => {
    await runScenario(
      "C4: AI failure returns graceful fallback, not a throw",
      async () => {
        mockGenerateTextWithTier.mockRejectedValueOnce(
          new Error("Upstream timeout"),
        );

        const result = await processFunctionCallingGeneration(
          makeInput("I'm a software engineer"),
        );

        // Should return graceful message, not throw
        expect(result.response).toMatch(/trouble|try again|moment/i);
        expect(result.created).toBeFalsy();
      },
    );
  });

  it("C5: Preview mode does not call saveGeneratedResume", async () => {
    await runScenario(
      "C5: persistResult=false skips saveGeneratedResume",
      async () => {
        const saveGeneratedResume = jest.requireMock<{
          saveGeneratedResume: jest.Mock;
        }>("@/lib/services/resumeService").saveGeneratedResume;

        mockAIReply("Creating preview!", [
          {
            name: "mark_complete",
            args: { confirmation_message: "Preview!" },
          },
        ]);

        const result = await processFunctionCallingGeneration({
          ...makeInput("Build it", {
            name: "Dave",
            email: "dave@example.com",
            summary: "Backend engineer.",
            experience: [
              {
                title: "Engineer",
                company: "Corp",
                duration: "2020-2023",
                description: "Built APIs.",
              },
            ],
            education: [
              {
                degree: "BS CS",
                institution: "State Uni",
                year: "2018",
              },
            ],
          }),
          persistResult: false,
        });

        expect(saveGeneratedResume).not.toHaveBeenCalled();
        expect(result.previewData).toBeDefined();
        expect(result.created).toBeFalsy();
      },
    );
  });
});

// ============================================================================
// CONFIDENCE SCORE REPORT
// ============================================================================

describe("Confidence Score Gate", () => {
  it("should achieve ≥ 90% confidence across all 15 scenarios", () => {
    const total = scenarioResults.length;
    const passed = scenarioResults.filter((s) => s.passed).length;
    const confidence = total > 0 ? (passed / total) * 100 : 0;

    const failed = scenarioResults.filter((s) => !s.passed);
    if (failed.length > 0) {
      console.warn("\nFailed scenarios:");
      failed.forEach((s) => console.warn(`  ✗ ${s.name}: ${s.error}`));
    }

    console.info(
      `\n🎯 Regression Confidence Score: ${confidence.toFixed(1)}% (${passed}/${total} scenarios passed)`,
    );

    // Category B must be 100% — verify separately
    const categoryB = scenarioResults.filter((s) => s.name.startsWith("B"));
    const bPassed = categoryB.filter((s) => s.passed).length;
    if (categoryB.length > 0) {
      const bConfidence = (bPassed / categoryB.length) * 100;
      expect(bConfidence).toBe(100); // Strict: all intent-filtering tests must pass
    }

    expect(confidence).toBeGreaterThanOrEqual(90);
  });
});
