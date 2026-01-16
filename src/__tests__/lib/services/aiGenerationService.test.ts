// Mock global fetch
global.fetch = jest.fn();

jest.mock("@/lib/utils/retry", () => ({
  withRetry: jest.fn((fn) => fn()),
}));

describe("aiGenerationService", () => {
  const originalEnv = process.env;
  let generateText: any;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (global.fetch as jest.Mock).mockReset();

    // Re-import module to ensure fresh state (empty cache)
    const aiModule = await import("@/lib/services/aiGenerationService");
    generateText = aiModule.generateText;
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
        new Error("Gemini Models Error")
      );

      // 2. Gemini Generation fetch fails (since models fetch failure is caught)
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Generation Error")
      );

      // 3. OpenAI fetch fails
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("OpenAI Error")
      );

      // 4. Groq fetch fails
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Groq Error")
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
        new Error("Gemini Models Error")
      );
      // 2. Gemini Generation fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Generation Error")
      );
      // 3. OpenAI fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("OpenAI Error")
      );
      // 4. Groq fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Groq Error")
      );
      // 5. HuggingFace failure
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("HF Error"));

      await expect(generateText("prompt")).rejects.toThrow(
        "All AI providers failed"
      );
    });

    it("should handle missing API keys", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.HUGGINGFACE_TOKEN;

      await expect(generateText("prompt")).rejects.toThrow(
        "All AI providers failed"
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
        new Error("Gemini Models Error")
      );
      // 2. Gemini Generation fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Generation Error")
      );
      // 3. OpenAI fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("OpenAI Error")
      );
      // 4. Groq fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Groq Error")
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
        new Error("Gemini Models Error")
      );
      // 2. Gemini Generation fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Generation Error")
      );
      // 3. OpenAI fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("OpenAI Error")
      );
      // 4. Groq fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Groq Error")
      );

      // 5. HF returns loading error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: "Model is loading" }),
      });

      try {
        await generateText("prompt");
        fail("Should have thrown error");
      } catch (error: any) {
        expect(error.message).toContain("All AI providers failed");
        expect(error.message).toContain("Model is loading");
      }
    });

    it("should handle HuggingFace other error", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.HUGGINGFACE_TOKEN = "test-hf-token";
      process.env.OPENAI_API_KEY = "test-openai-key";
      process.env.GROQ_API_KEY = "test-groq-key";

      // 1. Gemini Models fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Models Error")
      );
      // 2. Gemini Generation fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Generation Error")
      );
      // 3. OpenAI fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("OpenAI Error")
      );
      // 4. Groq fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Groq Error")
      );

      // 5. HF returns generic error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: "Some other error" }),
      });

      try {
        await generateText("prompt");
        fail("Should have thrown error");
      } catch (error: any) {
        expect(error.message).toContain("All AI providers failed");
        expect(error.message).toContain("Some other error");
      }
    });

    it("should handle HuggingFace unexpected format", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.HUGGINGFACE_TOKEN = "test-hf-token";
      process.env.OPENAI_API_KEY = "test-openai-key";
      process.env.GROQ_API_KEY = "test-groq-key";

      // 1. Gemini Models fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Models Error")
      );
      // 2. Gemini Generation fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Generation Error")
      );
      // 3. OpenAI fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("OpenAI Error")
      );
      // 4. Groq fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Groq Error")
      );

      // 5. HF returns unexpected json
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foo: "bar" }),
      });

      try {
        await generateText("prompt");
        fail("Should have thrown error");
      } catch (error: any) {
        expect(error.message).toContain("All AI providers failed");
        expect(error.message).toContain(
          "Unexpected HuggingFace response format"
        );
      }
    });
  });
});
