/**
 * resumeBulletEnhancer — Unit Test Suite
 *
 * PURPOSE: Validate the full behaviour of enhanceBulletsWithLLM:
 *   experience entries → generateTextWithTier (mocked) → JSON parse →
 *   Zod validation → merge back → BulletEnhancementResult
 *
 * Covers:
 *   1. Returns early when experience array is empty
 *   2. Returns early when no entry has any content worth enhancing
 *   3. Happy path: LLM returns enhanced descriptions and achievements
 *   4. Happy path: unchanged content (LLM returns same text → enhanced: false)
 *   5. Non-blocking: LLM call throws → returns original, enhanced: false
 *   6. Non-blocking: response is not valid JSON → returns original
 *   7. Non-blocking: response fails Zod schema → returns original
 *   8. Entries without matching enhancement index are preserved unchanged
 *   9. Billing is called with token counts derived from prompt/response length
 *  10. Only entries with sufficient description/achievements are sent to the LLM
 */

// ============================================================================
// MOCKS — hoisted before imports
// ============================================================================

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockTrackUsage = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/services/billingService", () => ({
  BillingService: {
    trackUsage: (...args: unknown[]) => mockTrackUsage(...args),
  },
}));

const mockGenerateTextWithTier = jest.fn();
jest.mock("@/server/services/aiProviderService", () => ({
  generateTextWithTier: (...args: unknown[]) =>
    mockGenerateTextWithTier(...args),
}));

// zodToGeminiSchema is used to convert the output schema — return a stub object
jest.mock("@/lib/utils/zodToGeminiSchema", () => ({
  zodToGeminiSchema: jest.fn(() => ({ type: "object" })),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import {
  enhanceBulletsWithLLM,
  type ExperienceEntryInput,
} from "@/lib/services/resumeBulletEnhancer";

// ============================================================================
// HELPERS
// ============================================================================

const BASE_CONTEXT = {
  userId: "user-test-123",
  userTier: "enterprise",
};

function makeLLMResponse(
  entries: { index: number; description: string; achievements: string[] }[],
): string {
  return JSON.stringify({ entries });
}

const RICH_EXPERIENCE: ExperienceEntryInput[] = [
  {
    role: "Software Engineer",
    company: "Acme Corp",
    duration: "2020 - 2023",
    description:
      "was responsible for managing the CI/CD pipeline and helped with deployments",
    achievements: [],
  },
  {
    role: "Tech Lead",
    company: "Beta Inc",
    duration: "2023 - Present",
    description: "Led migration of monolith to microservices architecture",
    achievements: ["Reduced deploy time by 40%"],
  },
];

// ============================================================================
// TESTS
// ============================================================================

describe("enhanceBulletsWithLLM", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- Guard conditions ----------

  it("returns early (enhanced: false) when experience array is absent", async () => {
    const result = await enhanceBulletsWithLLM(
      { experience: undefined },
      BASE_CONTEXT,
    );

    expect(result.enhanced).toBe(false);
    expect(result.experience).toHaveLength(0);
    expect(result.annotations).toHaveLength(0);
    expect(mockGenerateTextWithTier).not.toHaveBeenCalled();
  });

  it("returns early (enhanced: false) when experience array is empty", async () => {
    const result = await enhanceBulletsWithLLM(
      { experience: [] },
      BASE_CONTEXT,
    );

    expect(result.enhanced).toBe(false);
    expect(result.experience).toHaveLength(0);
    expect(mockGenerateTextWithTier).not.toHaveBeenCalled();
  });

  it("skips LLM when no entry has description or achievements worth enhancing", async () => {
    const sparse: ExperienceEntryInput[] = [
      { company: "Corp A", description: "ok" }, // too short (<=20 chars)
      { company: "Corp B" }, // no description, no achievements
    ];

    const result = await enhanceBulletsWithLLM(
      { experience: sparse },
      BASE_CONTEXT,
    );

    expect(result.enhanced).toBe(false);
    expect(mockGenerateTextWithTier).not.toHaveBeenCalled();
  });

  // ---------- Happy path ----------

  it("returns enhanced descriptions and achievements when LLM responds correctly", async () => {
    mockGenerateTextWithTier.mockResolvedValue({
      text: makeLLMResponse([
        {
          index: 0,
          description: "Managed CI/CD pipeline and automated deployments",
          achievements: [
            "Deployed to production 3× per week with zero downtime",
          ],
        },
        {
          index: 1,
          description:
            "Led migration of monolith to microservices architecture",
          achievements: [
            "Reduced deploy time by 40%",
            "Eliminated single point of failure",
          ],
        },
      ]),
      model: "gemini-2.5-pro",
    });

    const result = await enhanceBulletsWithLLM(
      { experience: RICH_EXPERIENCE },
      BASE_CONTEXT,
    );

    expect(result.enhanced).toBe(true);
    expect(result.experience).toHaveLength(2);

    expect(result.experience[0].description).toBe(
      "Managed CI/CD pipeline and automated deployments",
    );
    expect(result.experience[0].achievements).toEqual([
      "Deployed to production 3× per week with zero downtime",
    ]);
    expect(result.experience[0]._enhanced).toBe(true);

    expect(result.experience[1].achievements).toContain(
      "Eliminated single point of failure",
    );

    // At least one annotation per changed entry
    expect(result.annotations.length).toBeGreaterThan(0);
    expect(result.annotations.some((a) => a.includes("Acme Corp"))).toBe(true);
  });

  it("returns enhanced: false when LLM returns the same text (no changes)", async () => {
    // LLM echoes back the exact same content
    mockGenerateTextWithTier.mockResolvedValue({
      text: makeLLMResponse([
        {
          index: 0,
          description:
            "was responsible for managing the CI/CD pipeline and helped with deployments",
          achievements: [],
        },
        {
          index: 1,
          description:
            "Led migration of monolith to microservices architecture",
          achievements: ["Reduced deploy time by 40%"],
        },
      ]),
      model: "gemini-2.5-pro",
    });

    const result = await enhanceBulletsWithLLM(
      { experience: RICH_EXPERIENCE },
      BASE_CONTEXT,
    );

    expect(result.enhanced).toBe(false);
    expect(result.annotations).toHaveLength(0);
  });

  // ---------- Non-blocking failure paths ----------

  it("returns original content (enhanced: false) when LLM call throws", async () => {
    mockGenerateTextWithTier.mockRejectedValue(
      new Error("Gemini API unavailable"),
    );

    const result = await enhanceBulletsWithLLM(
      { experience: RICH_EXPERIENCE },
      BASE_CONTEXT,
    );

    expect(result.enhanced).toBe(false);
    expect(result.experience).toHaveLength(2);
    // Originals must be preserved
    expect(result.experience[0].description).toBe(
      "was responsible for managing the CI/CD pipeline and helped with deployments",
    );
  });

  it("returns original content when LLM response is not valid JSON", async () => {
    mockGenerateTextWithTier.mockResolvedValue({
      text: "Sorry, I cannot help with that request.",
      model: "gemini-2.5-pro",
    });

    const result = await enhanceBulletsWithLLM(
      { experience: RICH_EXPERIENCE },
      BASE_CONTEXT,
    );

    expect(result.enhanced).toBe(false);
    expect(result.experience[0].description).toBe(
      "was responsible for managing the CI/CD pipeline and helped with deployments",
    );
  });

  it("returns original content when LLM response fails Zod schema validation", async () => {
    // Wrong shape: "results" instead of "entries"
    mockGenerateTextWithTier.mockResolvedValue({
      text: JSON.stringify({ results: [{ idx: 0, desc: "foo" }] }),
      model: "gemini-2.5-pro",
    });

    const result = await enhanceBulletsWithLLM(
      { experience: RICH_EXPERIENCE },
      BASE_CONTEXT,
    );

    expect(result.enhanced).toBe(false);
  });

  it("returns original content when LLM response has empty text", async () => {
    mockGenerateTextWithTier.mockResolvedValue({
      text: "",
      model: "gemini-2.5-pro",
    });

    const result = await enhanceBulletsWithLLM(
      { experience: RICH_EXPERIENCE },
      BASE_CONTEXT,
    );

    expect(result.enhanced).toBe(false);
  });

  // ---------- Merge behaviour ----------

  it("preserves entries that have no corresponding enhancement in LLM response", async () => {
    // LLM only returns enhancement for index 1, not index 0
    mockGenerateTextWithTier.mockResolvedValue({
      text: makeLLMResponse([
        {
          index: 1,
          description:
            "Led migration of monolith to microservices architecture",
          achievements: ["Reduced deploy time by 40%", "Scaled to 10× traffic"],
        },
      ]),
      model: "gemini-2.5-pro",
    });

    const result = await enhanceBulletsWithLLM(
      { experience: RICH_EXPERIENCE },
      BASE_CONTEXT,
    );

    // Entry 0 is preserved as-is
    expect(result.experience[0].description).toBe(
      "was responsible for managing the CI/CD pipeline and helped with deployments",
    );
    expect(result.experience[0]._enhanced).toBeUndefined();

    // Entry 1 gets the new achievement
    expect(result.experience[1].achievements).toContain(
      "Scaled to 10× traffic",
    );
  });

  // ---------- Billing ----------

  it("calls BillingService.trackUsage after a successful LLM call", async () => {
    mockGenerateTextWithTier.mockResolvedValue({
      text: makeLLMResponse([
        {
          index: 0,
          description: "Managed CI/CD pipeline and automated deployments",
          achievements: [],
        },
        {
          index: 1,
          description:
            "Led migration of monolith to microservices architecture",
          achievements: ["Reduced deploy time by 40%"],
        },
      ]),
      model: "gemini-2.5-pro",
    });

    await enhanceBulletsWithLLM({ experience: RICH_EXPERIENCE }, BASE_CONTEXT);

    expect(mockTrackUsage).toHaveBeenCalledTimes(1);
    expect(mockTrackUsage).toHaveBeenCalledWith(
      BASE_CONTEXT.userId,
      "gemini-2.5-pro",
      expect.objectContaining({
        input: expect.any(Number),
        output: expect.any(Number),
      }),
    );
  });

  it("does not call BillingService when no entries pass the content filter", async () => {
    const result = await enhanceBulletsWithLLM(
      { experience: [] },
      BASE_CONTEXT,
    );

    expect(result.enhanced).toBe(false);
    expect(mockTrackUsage).not.toHaveBeenCalled();
  });

  // ---------- LLM call parameters ----------

  it("calls generateTextWithTier with stage='enhancement' and enterprise tier", async () => {
    mockGenerateTextWithTier.mockResolvedValue({
      text: makeLLMResponse([
        { index: 0, description: "Managed CI/CD pipeline", achievements: [] },
        {
          index: 1,
          description: "Led migration",
          achievements: ["Reduced deploy time by 40%"],
        },
      ]),
      model: "gemini-2.5-pro",
    });

    await enhanceBulletsWithLLM({ experience: RICH_EXPERIENCE }, BASE_CONTEXT);

    expect(mockGenerateTextWithTier).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "enhancement",
        userTier: "enterprise",
        modelId: "gemini-2.5-pro",
        jsonMode: true,
      }),
    );
  });
});
