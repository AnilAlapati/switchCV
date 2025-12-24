import { NextRequest } from "next/server";
import { GET } from "@/app/api/ai/refresh-models/route";
import {
  applyRateLimit,
  attachRateLimitHeaders,
  getAuthenticatedUserId,
  getClientIp,
} from "@/lib/utils/api-helpers";
import { getUserRole } from "@/lib/services/userService";

jest.mock("@/lib/utils/api-helpers", () => {
  const actual = jest.requireActual("@/lib/utils/api-helpers");
  return {
    ...actual,
    getAuthenticatedUserId: jest.fn(),
    getClientIp: jest.fn(),
    applyRateLimit: jest.fn(),
    attachRateLimitHeaders: jest.fn(),
  };
});

jest.mock("@/lib/services/userService", () => ({
  getUserRole: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

process.env.GEMINI_API_KEY = "test-gemini-key";

const createRequest = () =>
  ({
    headers: new Headers({
      authorization: "Bearer test-token",
      "x-forwarded-for": "203.0.113.10",
    }),
  } as unknown as NextRequest);

describe("/api/ai/refresh-models route", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    process.env.GEMINI_API_KEY = "test-gemini-key";
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "admin-user",
    });
    (getUserRole as jest.Mock).mockResolvedValue("admin");
    (getClientIp as jest.Mock).mockReturnValue("203.0.113.10");
    (applyRateLimit as jest.Mock).mockReturnValue({
      allowed: true,
      result: { limit: 5, remaining: 4, resetIn: 1000 },
    });
    (attachRateLimitHeaders as jest.Mock).mockImplementation(() => {});
  });

  it("should successfully refresh models list", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        models: [
          {
            name: "models/gemini-2.5-flash",
            displayName: "Gemini 2.5 Flash",
            supportedGenerationMethods: ["generateContent"],
          },
          {
            name: "models/gemini-2.0-flash-lite",
            displayName: "Gemini 2.0 Flash Lite",
            supportedGenerationMethods: ["generateContent"],
          },
          {
            name: "models/text-embedding-004",
            displayName: "Text Embedding 004",
            supportedGenerationMethods: ["embedContent"],
          },
        ],
      }),
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.total).toBe(3);
    expect(data.compatible).toBe(2);
    expect(data.models).toHaveLength(2);
  });

  it("should filter models to only include generateContent method", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        models: [
          {
            name: "models/gemini-2.5-flash",
            displayName: "Gemini 2.5 Flash",
            supportedGenerationMethods: ["generateContent"],
          },
          {
            name: "models/embedding-model",
            displayName: "Embedding Model",
            supportedGenerationMethods: ["embedContent"],
          },
        ],
      }),
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(data.total).toBe(2);
    expect(data.compatible).toBe(1);
    expect(data.models).toHaveLength(1);
  });

  it("should return empty models list when no compatible models", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        models: [
          {
            name: "models/embedding-model",
            displayName: "Embedding Model",
            supportedGenerationMethods: ["embedContent"],
          },
        ],
      }),
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.compatible).toBe(0);
    expect(data.models).toHaveLength(0);
  });

  it("should handle empty models response", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        models: [],
      }),
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.total).toBe(0);
    expect(data.compatible).toBe(0);
  });

  it("should handle null models field", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        models: null,
      }),
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.total).toBe(0);
  });

  it("should return error when API key is not configured", async () => {
    delete process.env.GEMINI_API_KEY;

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Gemini API key not configured");
  });

  it("should handle 401 unauthorized error from Gemini API", async () => {
    const mockResponse = {
      ok: false,
      status: 401,
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to refresh models");
  });

  it("should handle 500 server error from Gemini API", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to refresh models");
  });

  it("should handle 429 rate limit error", async () => {
    const mockResponse = {
      ok: false,
      status: 429,
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to refresh models");
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to refresh models");
  });

  it("should include timestamp in response", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        models: [],
      }),
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(data.timestamp).toBeDefined();
    expect(new Date(data.timestamp)).toBeInstanceOf(Date);
  });

  it("should call Gemini API with correct URL and API key", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        models: [],
      }),
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    await GET(createRequest());

    expect(mockFetch).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1/models?key=test-gemini-key"
    );
  });

  it("should include model display names in response", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        models: [
          {
            name: "models/gemini-2.5-flash",
            displayName: "Gemini 2.5 Flash - Latest",
            supportedGenerationMethods: ["generateContent"],
          },
          {
            name: "models/gemini-2.0-flash",
            displayName: "Gemini 2.0 Flash",
            supportedGenerationMethods: ["generateContent"],
          },
        ],
      }),
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(data.models[0].displayName).toBe("Gemini 2.5 Flash - Latest");
    expect(data.models[1].displayName).toBe("Gemini 2.0 Flash");
  });

  it("should include supported methods in response", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        models: [
          {
            name: "models/gemini-2.5-flash",
            displayName: "Gemini 2.5 Flash",
            supportedGenerationMethods: ["generateContent", "countTokens"],
          },
        ],
      }),
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(data.models[0].methods).toContain("generateContent");
    expect(data.models[0].methods).toContain("countTokens");
  });

  it("should be idempotent - calling multiple times returns consistent data", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        models: [
          {
            name: "models/gemini-2.5-flash",
            displayName: "Gemini 2.5 Flash",
            supportedGenerationMethods: ["generateContent"],
          },
        ],
      }),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const response1 = await GET(createRequest());
    const data1 = await response1.json();

    const response2 = await GET(createRequest());
    const data2 = await response2.json();

    expect(data1.compatible).toBe(data2.compatible);
    expect(data1.total).toBe(data2.total);
  });

  it("should return 401 when unauthorized", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: null,
    });

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when not an admin", async () => {
    (getUserRole as jest.Mock).mockResolvedValue("jobseeker");

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden: Admin access required");
  });

  it("should return 429 when rate limited", async () => {
    (applyRateLimit as jest.Mock).mockResolvedValue({
      allowed: false,
      response: new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
      }),
    });

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Too many requests");
  });
});
