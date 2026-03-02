/**
 * Tests for structured output support in AI providers
 *
 * These tests validate that structured output options (JSON mode, responseSchema)
 * are correctly passed through the provider chain.
 */

// Mock all external dependencies before imports
jest.mock("@/lib/services/secretManagerService", () => ({
  getSecret: jest.fn().mockResolvedValue("test-api-key"),
}));

jest.mock("@/lib/utils/retry", () => ({
  withRetry: jest.fn((fn: () => Promise<unknown>) => fn()),
}));

jest.mock("@/lib/services/ai/core-utils", () => ({
  fetchWithTimeout: jest.fn(),
  validateContextWindow: jest.fn().mockResolvedValue(undefined),
  checkGlobalSafetyLimit: jest.fn(),
  TokenUsage: {},
}));

jest.mock("@/lib/services/ai/model-manager", () => ({
  getAIConstants: jest.fn().mockResolvedValue({
    MAX_MODEL_REFRESH_ATTEMPTS: 3,
    MODEL_PREFERENCES: ["gemini-2.0-flash"],
  }),
  loadModelSelection: jest.fn().mockResolvedValue({
    models: ["gemini-2.0-flash"],
    usingFallback: false,
  }),
  selectBestModel: jest.fn().mockResolvedValue("gemini-2.0-flash"),
  resetModelCache: jest.fn(),
  invalidateModelCache: jest.fn(),
  getCacheStatus: jest.fn(),
}));

jest.mock("@/config/aiEndpoints", () => ({
  AI_ENDPOINTS: {
    GEMINI: {
      GENERATE: (model: string, key: string) =>
        `https://gemini.test/v1beta/models/${model}:generateContent?key=${key}`,
    },
    OPENAI: { CHAT_COMPLETIONS: "https://openai.test/v1/chat/completions" },
    GROQ: { CHAT_COMPLETIONS: "https://groq.test/openai/v1/chat/completions" },
  },
  DEFAULT_STOP_SEQUENCES: ["###"],
}));

import { fetchWithTimeout } from "@/lib/services/ai/core-utils";
import type { GeminiJsonSchema } from "@/lib/utils/zodToGeminiSchema";

const mockFetch = fetchWithTimeout as jest.MockedFunction<
  typeof fetchWithTimeout
>;

describe("Structured Output Support", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateWithGemini - structured output", () => {
    const {
      generateWithGemini,
    } = require("@/lib/services/ai/providers/gemini");

    it("should include responseMimeType and responseSchema when structuredOutput is provided", async () => {
      const testSchema: GeminiJsonSchema = {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          summary: { type: "STRING" },
        },
        required: ["title", "summary"],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: '{"title":"Test","summary":"Summary"}' }],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 20,
            totalTokenCount: 30,
          },
        }),
      } as unknown as Response);

      const result = await generateWithGemini(
        "test prompt",
        2000,
        0.7,
        undefined,
        {
          responseSchema: testSchema,
        },
      );

      expect(result.text).toBe('{"title":"Test","summary":"Summary"}');

      // Verify the request body includes structured output config
      const callArgs = mockFetch.mock.calls[0];
      const requestInit = callArgs[1] as RequestInit;
      const body = JSON.parse(requestInit.body as string);

      expect(body.generationConfig.responseMimeType).toBe("application/json");
      expect(body.generationConfig.responseSchema).toEqual(testSchema);
      // Stop sequences should be removed for structured output
      expect(body.generationConfig.stopSequences).toBeUndefined();
    });

    it("should NOT include structured output fields when not provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Hello world" }] } }],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 5,
            totalTokenCount: 10,
          },
        }),
      } as unknown as Response);

      await generateWithGemini("test prompt", 150, 0.7);

      const callArgs = mockFetch.mock.calls[0];
      const requestInit = callArgs[1] as RequestInit;
      const body = JSON.parse(requestInit.body as string);

      expect(body.generationConfig.responseMimeType).toBeUndefined();
      expect(body.generationConfig.responseSchema).toBeUndefined();
      expect(body.generationConfig.stopSequences).toBeDefined();
    });
  });

  describe("generateWithOpenAI - JSON mode", () => {
    const {
      generateWithOpenAI,
    } = require("@/lib/services/ai/providers/openai");

    it("should include response_format when jsonMode is true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"title":"Test"}' } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      } as unknown as Response);

      const result = await generateWithOpenAI("test prompt", 2000, 0.7, true);
      expect(result.text).toBe('{"title":"Test"}');

      const callArgs = mockFetch.mock.calls[0];
      const requestInit = callArgs[1] as RequestInit;
      const body = JSON.parse(requestInit.body as string);

      expect(body.response_format).toEqual({ type: "json_object" });
      expect(body.stop).toBeUndefined();
    });

    it("should NOT include response_format when jsonMode is false", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Regular text" } }],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        }),
      } as unknown as Response);

      await generateWithOpenAI("test prompt", 150, 0.7, false);

      const callArgs = mockFetch.mock.calls[0];
      const requestInit = callArgs[1] as RequestInit;
      const body = JSON.parse(requestInit.body as string);

      expect(body.response_format).toBeUndefined();
      expect(body.stop).toBeDefined();
    });
  });

  describe("generateWithGroq - JSON mode", () => {
    const { generateWithGroq } = require("@/lib/services/ai/providers/groq");

    it("should include response_format when jsonMode is true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"title":"Test"}' } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      } as unknown as Response);

      const result = await generateWithGroq("test prompt", 2000, 0.7, true);
      expect(result.text).toBe('{"title":"Test"}');

      const callArgs = mockFetch.mock.calls[0];
      const requestInit = callArgs[1] as RequestInit;
      const body = JSON.parse(requestInit.body as string);

      expect(body.response_format).toEqual({ type: "json_object" });
    });
  });
});
