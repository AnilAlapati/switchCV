import { GET } from "@/app/api/ai/status/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/logger");
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn().mockResolvedValue({
    userId: "test-user",
    error: undefined,
  }),
  handleApiError: jest.fn(
    (_err: unknown, msg: string) =>
      new Response(JSON.stringify({ error: msg }), { status: 500 }),
  ),
}));

function createMockRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/ai/status", {
    method: "GET",
    headers: { authorization: "Bearer test-token" },
  });
}

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

  it("should return connected when GEMINI_API_KEY is set", async () => {
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

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(true);
    // Model and provider no longer exposed to clients
    expect(data.model).toBeUndefined();
    expect(data.provider).toBeUndefined();
  });

  it("should return connected with fallback when Gemini fetch fails", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    });

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(true);
  });

  it("should return disconnected when no keys are set", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.HUGGINGFACE_TOKEN;

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(false);
  });

  it("should handle empty models list", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [],
      }),
    });

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(true);
  });

  it("should handle fetch throwing error in getBestGeminiModel", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Fetch failed"));

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(true);
  });

  it("should handle generic errors in GET", async () => {
    // Force an error by making process.env access throw
    Object.defineProperty(process.env, "GEMINI_API_KEY", {
      get: () => {
        throw new Error("Env error");
      },
      configurable: true,
    });

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to check AI status");

    // Reset process.env
    delete (process.env as Record<string, unknown>).GEMINI_API_KEY;
  });
});
