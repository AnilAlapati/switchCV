import { GET } from "@/app/api/ai/refresh-models/route";

const mockFetch = jest.fn();
global.fetch = mockFetch;

process.env.GEMINI_API_KEY = "test-gemini-key";

describe("/api/ai/refresh-models route", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    process.env.GEMINI_API_KEY = "test-gemini-key";
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

    const response = await GET();
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

    const response = await GET();
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

    const response = await GET();
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

    const response = await GET();
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

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.total).toBe(0);
  });

  it("should return error when API key is not configured", async () => {
    delete process.env.GEMINI_API_KEY;

    const response = await GET();
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

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch models");
  });

  it("should handle 500 server error from Gemini API", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch models");
  });

  it("should handle 429 rate limit error", async () => {
    const mockResponse = {
      ok: false,
      status: 429,
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch models");
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch models");
  });

  it("should include timestamp in response", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        models: [],
      }),
    };

    mockFetch.mockResolvedValueOnce(mockResponse);

    const response = await GET();
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

    await GET();

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

    const response = await GET();
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

    const response = await GET();
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

    const response1 = await GET();
    const data1 = await response1.json();

    const response2 = await GET();
    const data2 = await response2.json();

    expect(data1.compatible).toBe(data2.compatible);
    expect(data1.total).toBe(data2.total);
  });
});
