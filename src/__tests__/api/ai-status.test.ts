import { GET } from "@/app/api/ai/status/route";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-helpers";

jest.mock("@/lib/logger");
jest.mock("@/lib/utils/api-helpers", () => ({
  handleApiError: jest.fn((err, msg, status) => ({
    status: status || 500,
    json: async () => ({ error: msg }),
  })),
}));

describe("AI Status API", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
    // Mock global fetch
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should return Gemini status when GEMINI_API_KEY is set", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          {
            name: "models/gemini-2.0-flash",
            supportedGenerationMethods: ["generateContent"],
          },
          {
            name: "models/gemini-2.5-flash-lite",
            supportedGenerationMethods: ["generateContent"],
          },
        ],
      }),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(true);
    expect(data.provider).toBe("Google Gemini");
    // gemini-2.5-flash-lite is higher in preference than gemini-2.0-flash
    expect(data.model).toBe("gemini-2.5-flash-lite");
  });

  it("should return fallback Gemini model if fetch fails", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.model).toBe("gemini-2.5-flash");
  });

  it("should return Hugging Face status when only HUGGINGFACE_TOKEN is set", async () => {
    delete process.env.GEMINI_API_KEY;
    process.env.HUGGINGFACE_TOKEN = "test-token";

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(true);
    expect(data.provider).toBe("Hugging Face");
    expect(data.model).toBe("mistralai/Mistral-7B-Instruct-v0.3");
  });

  it("should return disconnected status when no keys are set", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.HUGGINGFACE_TOKEN;

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(false);
    expect(data.message).toBe("No AI provider configured");
  });

  it("should return fallback model if no models are available", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [],
      }),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.model).toBe("gemini-2.5-flash");
  });

  it("should handle fetch throwing error in getBestGeminiModel", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Fetch failed"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.model).toBe("gemini-2.5-flash");
  });

  it("should handle generic errors in GET", async () => {
    // Force an error by making process.env access throw
    Object.defineProperty(process.env, "GEMINI_API_KEY", {
      get: () => {
        throw new Error("Env error");
      },
      configurable: true,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to check AI status");

    // Reset process.env
    delete (process.env as any).GEMINI_API_KEY;
  });
});
