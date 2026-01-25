// Mock global fetch
global.fetch = jest.fn();

jest.mock("@/lib/utils/retry", () => ({
  withRetry: jest.fn((fn) => fn()),
}));

describe("aiGenerationService", () => {
  const originalEnv = process.env;
  let generateText: (
    prompt: string,
    maxTokens?: number,
    temperature?: number,
    model?: string,
  ) => Promise<{ text: string; model: string; provider: string; usage?: any }>;
  let invalidateModelCache: () => void;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (global.fetch as jest.Mock).mockReset();

    // Re-import module to ensure fresh state (empty cache)
    const aiModule = await import("@/lib/services/aiGenerationService");
    generateText = aiModule.generateText;
    invalidateModelCache = aiModule.invalidateModelCache;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("generateText", () => {
    it("should use Gemini API when key is present and successful", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      // Mock models response
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
        // Mock generation response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: "Generated text" }] } }],
          }),
        });

      const result = await generateText("prompt");

      expect(result.text).toBe("Generated text");
      expect(result.provider).toBe("gemini");
      expect(result.model).toContain("gemini");
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should fallback to HuggingFace when Gemini fails", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.HUGGINGFACE_TOKEN = "test-hf-token";
      process.env.OPENAI_API_KEY = "test-openai-key";
      process.env.GROQ_API_KEY = "test-groq-key";

      // 1. Gemini Models fetch fails
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Models Error"),
      );

      // 2. Gemini Generation fetch fails (since models fetch failure is caught)
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Generation Error"),
      );

      // 3. OpenAI fetch fails
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("OpenAI Error"),
      );

      // 4. Groq fetch fails
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Groq Error"),
      );

      // 5. HuggingFace success
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ generated_text: "HF Generated text" }],
      });

      const result = await generateText("prompt");

      expect(result.text).toBe("HF Generated text");
      expect(result.provider).toBe("huggingface");
    });

    it("should throw error if all providers fail", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.HUGGINGFACE_TOKEN = "test-hf-token";
      process.env.OPENAI_API_KEY = "test-openai-key";
      process.env.GROQ_API_KEY = "test-groq-key";

      // 1. Gemini Models fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Models Error"),
      );
      // 2. Gemini Generation fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Generation Error"),
      );
      // 3. OpenAI fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("OpenAI Error"),
      );
      // 4. Groq fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Groq Error"),
      );
      // 5. HuggingFace failure
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("HF Error"));

      await expect(generateText("prompt")).rejects.toThrow(
        "All AI providers failed",
      );
    });

    it("should handle missing API keys", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.HUGGINGFACE_TOKEN;

      await expect(generateText("prompt")).rejects.toThrow(
        "All AI providers failed",
      );
    });

    it("should cache Gemini models", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      // First call: Mock models response and generation response
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
            candidates: [{ content: { parts: [{ text: "Text 1" }] } }],
          }),
        });

      await generateText("prompt 1");

      // Second call: Should use cached models, so only generation fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Text 2" }] } }],
        }),
      });

      await generateText("prompt 2");

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("should retry Gemini on 404 (model not found)", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      // 1. Fetch models (success)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            {
              name: "models/old-model",
              supportedGenerationMethods: ["generateContent"],
            },
          ],
        }),
      });

      // 2. Generate with old-model (404)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: () => Promise.resolve("Model not found"),
      });

      // 3. Retry: Fetch models again (success, new model)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            {
              name: "models/new-model",
              supportedGenerationMethods: ["generateContent"],
            },
          ],
        }),
      });

      // 4. Retry: Generate with new-model (success)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Retry success" }] } }],
        }),
      });

      const result = await generateText("prompt");
      expect(result.text).toBe("Retry success");
      expect(result.model).toBe("new-model");
    });

    it("should handle HuggingFace array response", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.HUGGINGFACE_TOKEN = "test-hf-token";
      process.env.OPENAI_API_KEY = "test-openai-key";
      process.env.GROQ_API_KEY = "test-groq-key";

      // 1. Gemini Models fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Models Error"),
      );
      // 2. Gemini Generation fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Generation Error"),
      );
      // 3. OpenAI fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("OpenAI Error"),
      );
      // 4. Groq fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Groq Error"),
      );

      // 5. HF returns array
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ generated_text: "Array text" }],
      });

      const result = await generateText("prompt");
      expect(result.text).toBe("Array text");
    });

    it("should handle HuggingFace loading error", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.HUGGINGFACE_TOKEN = "test-hf-token";
      process.env.OPENAI_API_KEY = "test-openai-key";
      process.env.GROQ_API_KEY = "test-groq-key";

      // 1. Gemini Models fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Models Error"),
      );
      // 2. Gemini Generation fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Generation Error"),
      );
      // 3. OpenAI fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("OpenAI Error"),
      );
      // 4. Groq fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Groq Error"),
      );

      // 5. HF returns loading error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: "Model is loading" }),
      });

      try {
        await generateText("prompt");
        fail("Should have thrown error");
      } catch (error) {
        const err = error as Error;
        expect(err.message).toContain("All AI providers failed");
        expect(err.message).toContain("Model is loading");
      }
    });

    it("should handle HuggingFace other error", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.HUGGINGFACE_TOKEN = "test-hf-token";
      process.env.OPENAI_API_KEY = "test-openai-key";
      process.env.GROQ_API_KEY = "test-groq-key";

      // 1. Gemini Models fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Models Error"),
      );
      // 2. Gemini Generation fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Generation Error"),
      );
      // 3. OpenAI fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("OpenAI Error"),
      );
      // 4. Groq fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Groq Error"),
      );

      // 5. HF returns generic error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: "Some other error" }),
      });

      try {
        await generateText("prompt");
        fail("Should have thrown error");
      } catch (error) {
        const err = error as Error;
        expect(err.message).toContain("All AI providers failed");
        expect(err.message).toContain("Some other error");
      }
    });

    it("should handle HuggingFace unexpected format", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.HUGGINGFACE_TOKEN = "test-hf-token";
      process.env.OPENAI_API_KEY = "test-openai-key";
      process.env.GROQ_API_KEY = "test-groq-key";

      // 1. Gemini Models fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Models Error"),
      );
      // 2. Gemini Generation fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Generation Error"),
      );
      // 3. OpenAI fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("OpenAI Error"),
      );
      // 4. Groq fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Groq Error"),
      );

      // 5. HF returns unexpected json
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foo: "bar" }),
      });

      try {
        await generateText("prompt");
        fail("Should have thrown error");
      } catch (error) {
        const err = error as Error;
        expect(err.message).toContain("All AI providers failed");
        expect(err.message).toContain("Unexpected HuggingFace response format");
      }
    });

    it("should validate context window and throw if exceeded", async () => {
      process.env.GEMINI_API_KEY = "test-key";
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: "gemini", supportedGenerationMethods: ["generateContent"] },
          ],
        }),
      });

      const longPrompt = "a".repeat(150000); // Exceeds MAX_TOKENS_GEMINI (30000 * 4 = 120000 chars)
      await expect(generateText(longPrompt)).rejects.toThrow(/Prompt exceeds/);
    });

    it("should use a specific model if requested", async () => {
      process.env.GEMINI_API_KEY = "test-key";
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Override text" }] } }],
        }),
      });

      const result = await generateText("prompt", 100, 0.7, "requested-model");
      expect(result.model).toBe("requested-model");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("requested-model"),
        expect.anything(),
      );
    });

    it("should use requested model override in Gemini", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            models: [
              {
                name: "models/cached-model",
                supportedGenerationMethods: ["generateContent"],
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: "Override result" }] } }],
          }),
        });

      const result = await generateText("prompt", 150, 0.7, "custom-model");

      expect(result.text).toBe("Override result");
      expect(result.model).toBe("custom-model");
      // Note: currently loadModelSelection is called even if model override is provided
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain(
        "custom-model",
      );
    });
  });

  describe("cache management", () => {
    it("should invalidate cache and get correctly reported status", async () => {
      const { invalidateModelCache, getCacheStatus } =
        await import("@/lib/services/aiGenerationService");

      // Initially no cache
      expect(getCacheStatus().isCached).toBe(false);

      process.env.GEMINI_API_KEY = "test-gemini-key";
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            models: [
              {
                name: "models/gemini-1",
                supportedGenerationMethods: ["generateContent"],
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: "text" }] } }],
          }),
        });

      await generateText("prompt");

      expect(getCacheStatus().isCached).toBe(true);
      expect(getCacheStatus().modelsCount).toBe(1);

      invalidateModelCache();
      expect(getCacheStatus().isCached).toBe(false);
    });
  });

  describe("context window validation", () => {
    it("should throw error when prompt is too long for gemini", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";
      // MAX_TOKENS_GEMINI = 30000, TOKENS_PER_CHAR = 0.25 -> 120000 chars
      const longPrompt = "a".repeat(130000);

      await expect(
        generateText(longPrompt, 150, 0.7, "gemini-model"),
      ).rejects.toThrow(/Prompt exceeds/);
    });

    it("should throw error when prompt is too long for gpt-4", async () => {
      process.env.OPENAI_API_KEY = "test-openai-key";
      // gpt-4 limit 8000 -> 32000 chars
      const longPrompt = "a".repeat(40000);

      // Force OpenAI by making Gemini fail or missing key
      delete process.env.GEMINI_API_KEY;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "ok" } }] }),
      });

      // Note: generateText doesn't take model for OpenAI yet, it's hardcoded to gpt-4o-mini
      // But we can check if it throws if we could pass it.
      // Actually generateWithOpenAI is called which calls validateContextWindow(prompt, "gpt-4o-mini").
      // Wait, let's check the code: model = "gpt-4o-mini"; await validateContextWindow(prompt, model);
      // gpt-4o-mini is not explicitly mentioned in if/else if in validateContextWindow, so it uses MAX_TOKENS_DEFAULT (4000)

      const promptForDefault = "a".repeat(35000); // 35000 * 0.25 = 8750 tokens > 8000
      await expect(generateText(promptForDefault)).rejects.toThrow(
        /Prompt exceeds/,
      );
    });
  });

  describe("generateWithOpenAI", () => {
    it("should use OpenAI when Gemini is not available", async () => {
      delete process.env.GEMINI_API_KEY;
      process.env.OPENAI_API_KEY = "test-openai-key";

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "OpenAI response" } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      });

      const result = await generateText("prompt");
      expect(result.text).toBe("OpenAI response");
      expect(result.provider).toBe("openai");
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      });
    });

    it("should handle OpenAI error", async () => {
      delete process.env.GEMINI_API_KEY;
      process.env.OPENAI_API_KEY = "test-openai-key";

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Invalid API Key"),
      });

      await expect(generateText("prompt")).rejects.toThrow(
        /All AI providers failed/,
      );
    });
  });

  describe("generateWithGroq", () => {
    it("should use Groq when others unavailable", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      process.env.GROQ_API_KEY = "test-groq-key";

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Groq response" } }],
          usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
        }),
      });

      const result = await generateText("prompt");
      expect(result.text).toBe("Groq response");
      expect(result.provider).toBe("groq");
    });
  });

  describe("generateEmbedding", () => {
    it("should generate embeddings using Gemini", async () => {
      const { generateEmbedding } =
        await import("@/lib/services/aiGenerationService");
      process.env.GEMINI_API_KEY = "test-gemini-key";

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          embedding: { values: [0.1, 0.2, 0.3] },
        }),
      });

      const result = await generateEmbedding("text to embed");
      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("text-embedding-004:embedContent"),
        expect.any(Object),
      );
    });

    it("should throw error on embedding failure", async () => {
      const { generateEmbedding } =
        await import("@/lib/services/aiGenerationService");
      process.env.GEMINI_API_KEY = "test-gemini-key";

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });

      await expect(generateEmbedding("text")).rejects.toThrow(
        /Embedding failed/,
      );
    });

    it("should throw error if Gemini API key is missing for embedding", async () => {
      const { generateEmbedding } =
        await import("@/lib/services/aiGenerationService");
      delete process.env.GEMINI_API_KEY;

      await expect(generateEmbedding("text")).rejects.toThrow(
        "Gemini API key missing",
      );
    });

    it("should handle invalid embedding response structure", async () => {
      const { generateEmbedding } =
        await import("@/lib/services/aiGenerationService");
      process.env.GEMINI_API_KEY = "test-key";
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foo: "bar" }),
      });
      await expect(generateEmbedding("text")).rejects.toThrow(
        "Invalid embedding response structure",
      );
    });
  });

  describe("API error handling", () => {
    it("should handle failed model fetch in Gemini", async () => {
      process.env.GEMINI_API_KEY = "test-key";
      // 1. Gemini Models fetch fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      // 2. Gemini Generation success (falls back to preferences)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "fallback text" }] } }],
        }),
      });

      const result = await generateText("prompt");
      expect(result.provider).toBe("gemini");
      expect(result.text).toBe("fallback text");
    });

    it("should handle empty response from Gemini", async () => {
      process.env.GEMINI_API_KEY = "test-key";
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            models: [
              {
                name: "gemini",
                supportedGenerationMethods: ["generateContent"],
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ candidates: [] }),
        });
      // Falls back to other providers or throws if all fail
      await expect(generateText("prompt")).rejects.toThrow();
    });

    it("should handle empty response from OpenAI", async () => {
      delete process.env.GEMINI_API_KEY;
      process.env.OPENAI_API_KEY = "test-key";
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [] }),
      });
      await expect(generateText("prompt")).rejects.toThrow();
    });

    it("should handle Groq API key missing", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.GROQ_API_KEY;
      process.env.HUGGINGFACE_TOKEN = "test-key";

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ generated_text: "hf" }),
      });

      const result = await generateText("prompt");
      expect(result.provider).toBe("huggingface");
    });
  });

  describe("Additional Coverage", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      process.env.GEMINI_API_KEY = "test-key";
      process.env.OPENAI_API_KEY = "test-key";
      process.env.GROQ_API_KEY = "test-key";
      process.env.HUGGINGFACE_TOKEN = "test-key";
    });

    it("should handle preference matching in selectBestModel", async () => {
      // Indirectly test selectBestModel by providing models that match preferences
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            {
              name: "models/gemini-1.5-pro",
              supportedGenerationMethods: ["generateContent"],
            },
          ],
          candidates: [{ content: { parts: [{ text: "success" }] } }],
        }),
      });
      const result = await generateText("prompt");
      expect(result.text).toBe("success");
    });

    it("should handle exhausted models with fallback in generateWithGemini", async () => {
      // Mock models fetch to return empty list, forcing fallback to preferences
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      });
      // Mock preferences to fail
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "Not Found",
      });

      await expect(generateText("prompt")).rejects.toThrow();
    });

    it("should handle non-404 error in Gemini", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            models: [
              {
                name: "gemini",
                supportedGenerationMethods: ["generateContent"],
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => "Internal Server Error",
        });

      await expect(generateText("prompt")).rejects.toThrow();
    });

    it("should handle Groq error response", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      await expect(generateText("prompt")).rejects.toThrow(
        "Groq API error (401): Unauthorized",
      );
    });

    it("should handle Groq missing text in response", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: {} }] }),
      });

      await expect(generateText("prompt")).rejects.toThrow(
        "No text generated from Groq",
      );
    });

    it("should handle HuggingFace error field and loading message", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.GROQ_API_KEY;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: "Model google/flan-t5-base is currently loading",
        }),
      });

      await expect(generateText("prompt")).rejects.toThrow(
        "Model is loading, please try again in a moment",
      );
    });

    it("should handle HuggingFace other error field", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.GROQ_API_KEY;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: "Some other HF error" }),
      });

      await expect(generateText("prompt")).rejects.toThrow(
        "HuggingFace error: Some other HF error",
      );
    });

    it("should handle HuggingFace array with empty text", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.GROQ_API_KEY;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [{}],
      });

      await expect(generateText("prompt")).rejects.toThrow(
        "No text generated from HuggingFace",
      );
    });

    it("should handle exhausted models and final Gemini error", async () => {
      // 1. Models fetch returns one model
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            {
              name: "models/gemini-pro",
              supportedGenerationMethods: ["generateContent"],
            },
          ],
        }),
      });
      // 2. Generation for that model fails with 404 (to trigger attemptedModels.add)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => "Not Found",
      });
      // 3. Pool is now empty, triggering refresh behavior (since usingFallback is false initially)
      // We will mock the refresh to return NO models
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      });

      // Now selection.usingFallback will be true, selection.models will be MODEL_PREFERENCES
      // We need it to fail for all preferences too
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "Not Found",
      });

      await expect(generateText("prompt")).rejects.toThrow();
    });

    it("should handle MAX_MODEL_REFRESH_ATTEMPTS limit", async () => {
      const getSystemConfig = require("@/lib/getSystemConfig");
      jest.spyOn(getSystemConfig, "getConstants").mockResolvedValue({
        AI_SERVICE: {
          MAX_MODEL_REFRESH_ATTEMPTS: 0,
          MODEL_CACHE_DURATION_MS: 0,
          MODEL_PREFERENCES: ["gemini-pro"],
          FALLBACK_MODEL: "gemini-pro",
        },
      });

      // 1. Models fetch success
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            {
              name: "models/gemini-pro",
              supportedGenerationMethods: ["generateContent"],
            },
          ],
        }),
      });
      // 2. Generation 404
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => "Not Found",
      });
      // 3. Pool empty, remoteRefreshes=0 >= limit=0 -> triggers 287-293
      // Then it will use fallback models and fail again
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "Not Found",
      });

      await expect(generateText("prompt")).rejects.toThrow();
    });

    it("should throw error if Gemini returns no models initially", async () => {
      invalidateModelCache();
      jest.spyOn(getSystemConfig, "getConstants").mockResolvedValue({
        AI_SERVICE: {
          MAX_MODEL_REFRESH_ATTEMPTS: 1,
          MODEL_PREFERENCES: [],
          FALLBACK_MODEL: "gemini-pro",
        } as any,
      } as any);
      process.env.GEMINI_API_KEY = "dummy_key";

      // Mock the model list fetch to return empty
      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes("models?key=")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });
        }
        // Make other providers fail with generic errors to see aggregate
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Global failure"),
        });
      });

      try {
        await generateText("hi");
        fail("Should have thrown");
      } catch (e: any) {
        expect(e.message).toContain(
          "Gemini API error: No supported models available",
        );
      }
    });

    it("should handle unknown provider in generateText", async () => {
      const {
        providerFallback,
      } = require("@/lib/services/ai/ProviderFallbackChain");
      const { aiCircuitBreaker } = require("@/lib/services/ai/CircuitBreaker");
      jest
        .spyOn(providerFallback, "getPrioritizedProviders")
        .mockReturnValue(["unknown-provider"]);
      jest
        .spyOn(aiCircuitBreaker, "recordFailure")
        .mockImplementation(() => {});

      await expect(generateText("prompt")).rejects.toThrow(
        "Unknown provider: unknown-provider",
      );
    });
  });
});
