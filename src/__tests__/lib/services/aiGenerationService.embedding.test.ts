/**
 * aiGenerationService.embedding.test.ts
 *
 * Additional coverage tests for generateEmbedding and billing tracking.
 * Follows the same jest.resetModules() + dynamic import pattern as the main test file.
 */

// Mock global fetch (used by fetchWithTimeout internally)
global.fetch = jest.fn();

jest.mock("@/lib/utils/retry", () => ({
  withRetry: jest.fn((fn: () => unknown) => fn()),
}));

describe("aiGenerationService – additional coverage", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (global.fetch as jest.Mock).mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ── generateEmbedding – values-not-array branch ────────────────────

  describe("generateEmbedding", () => {
    it("throws when embedding values is not an array", async () => {
      process.env.GEMINI_API_KEY = "test-key";
      const { generateEmbedding } =
        await import("@/lib/services/aiGenerationService");

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: { values: "not-an-array" } }),
      });

      await expect(generateEmbedding("test")).rejects.toThrow(
        "Invalid embedding response structure",
      );
    });

    it("throws when embedding field is null", async () => {
      process.env.GEMINI_API_KEY = "test-key";
      const { generateEmbedding } =
        await import("@/lib/services/aiGenerationService");

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: null }),
      });

      await expect(generateEmbedding("test")).rejects.toThrow(
        "Invalid embedding response structure",
      );
    });
  });

  // ── generateText billing tracking ────────────────────────────────────

  describe("generateText billing tracking", () => {
    it("tracks usage when userId is provided and does not block result", async () => {
      process.env.GEMINI_API_KEY = "test-key";
      const { generateText } =
        await import("@/lib/services/aiGenerationService");

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            models: [
              {
                name: "models/gemini-2.0-flash-lite",
                supportedGenerationMethods: ["generateContent"],
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: "Generated" }] } }],
            usageMetadata: {
              promptTokenCount: 10,
              candidatesTokenCount: 20,
              totalTokenCount: 30,
            },
          }),
        });

      const result = await generateText(
        "test prompt",
        150,
        0.7,
        undefined,
        "user-123",
      );

      expect(result.text).toBe("Generated");
      expect(result.provider).toBe("gemini");
      // Fire-and-forget billing should not affect the result
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it("still returns result when billing tracking fails", async () => {
      process.env.GEMINI_API_KEY = "test-key";

      // Mock BillingService to fail before importing aiGenerationService
      jest.doMock("@/lib/services/billingService", () => ({
        BillingService: {
          trackUsage: jest.fn().mockRejectedValue(new Error("Billing DB down")),
          checkBudget: jest.fn().mockResolvedValue({ allowed: true }),
        },
      }));

      const { generateText } =
        await import("@/lib/services/aiGenerationService");

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            models: [
              {
                name: "models/gemini-2.0-flash-lite",
                supportedGenerationMethods: ["generateContent"],
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: "Success" }] } }],
            usageMetadata: {
              promptTokenCount: 10,
              candidatesTokenCount: 20,
              totalTokenCount: 30,
            },
          }),
        });

      // Should still succeed — billing failure is fire-and-forget
      const result = await generateText(
        "test prompt",
        150,
        0.7,
        undefined,
        "user-with-broken-billing",
      );

      expect(result.text).toBe("Success");

      // Give time for the async catch handler to execute
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  });
});
