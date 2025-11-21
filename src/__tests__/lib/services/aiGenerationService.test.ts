import { generateText } from "@/lib/services/aiGenerationService";

// Mock global fetch
global.fetch = jest.fn();

describe("aiGenerationService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (global.fetch as jest.Mock).mockClear();
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
      expect(result.provider).toBe("google");
      expect(result.model).toContain("gemini");
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should fallback to HuggingFace when Gemini fails", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.HUGGINGFACE_TOKEN = "test-hf-token";

      // Mock Gemini failure (models fetch fails or generation fails)
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Error")
      );

      // Mock HuggingFace success
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

      // Mock Gemini failure
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Gemini Error")
      );
      // Mock HuggingFace failure
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
  });
});
