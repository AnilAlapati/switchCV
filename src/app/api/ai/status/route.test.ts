import { GET } from "./route";

// Mock global fetch
global.fetch = jest.fn();

describe("GET /api/ai/status", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (global.fetch as jest.Mock).mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should return Gemini status when configured", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.HUGGINGFACE_TOKEN;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          {
            name: "models/gemini-2.5-flash-lite",
            supportedGenerationMethods: ["generateContent"],
          },
        ],
      }),
    });

    const res = await GET();
    const data = await res.json();

    expect(data.connected).toBe(true);
    expect(data.provider).toBe("Google Gemini");
    expect(data.model).toBe("gemini-2.5-flash-lite");
  });

  it("should return disconnected when no provider is configured", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.HUGGINGFACE_TOKEN;

    const res = await GET();
    const data = await res.json();

    expect(data.connected).toBe(false);
    expect(data.message).toBe("No AI provider configured");
  });

  it("should handle fetch errors for Gemini models gracefully", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Fetch error"));

    const res = await GET();
    const data = await res.json();

    expect(data.connected).toBe(true);
    expect(data.provider).toBe("Google Gemini");
    expect(data.model).toBe("gemini-2.5-flash"); // Fallback
  });
});
