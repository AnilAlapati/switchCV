import { GET } from "./route";
import { NextRequest } from "next/server";

// Mock global fetch
global.fetch = jest.fn();

// Mock auth
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
jest.mock("@/lib/logger");

function createMockRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/ai/status", {
    method: "GET",
    headers: { authorization: "Bearer test-token" },
  });
}

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

  it("should return connected status when Gemini is configured", async () => {
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

    const res = await GET(createMockRequest());
    const data = await res.json();

    expect(data.connected).toBe(true);
    // Model and provider are no longer exposed to clients
    expect(data.model).toBeUndefined();
    expect(data.provider).toBeUndefined();
  });

  it("should return disconnected when no provider is configured", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.HUGGINGFACE_TOKEN;

    const res = await GET(createMockRequest());
    const data = await res.json();

    expect(data.connected).toBe(false);
    // Message no longer exposed
    expect(data.message).toBeUndefined();
  });

  it("should handle fetch errors for Gemini models gracefully", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Fetch error"));

    const res = await GET(createMockRequest());
    const data = await res.json();

    expect(data.connected).toBe(true);
  });
});
