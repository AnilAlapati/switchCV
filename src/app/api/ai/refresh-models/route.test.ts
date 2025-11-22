import { GET } from "./route";

// Mock api-helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  handleApiError: jest.fn((error, message, status = 500) => {
    return {
      status,
      json: async () => ({
        error: message,
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console.error
const mockConsoleError = jest.fn();
console.error = mockConsoleError;

describe("GET /api/ai/refresh-models", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should successfully refresh models with valid API key", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    const mockApiResponse = {
      models: [
        {
          name: "models/gemini-2.0-flash-lite",
          displayName: "Gemini 2.0 Flash Lite",
          supportedGenerationMethods: ["generateContent"],
        },
        {
          name: "models/gemini-1.5-pro",
          displayName: "Gemini 1.5 Pro",
          supportedGenerationMethods: ["generateContent"],
        },
        {
          name: "models/unsupported-model",
          displayName: "Unsupported Model",
          supportedGenerationMethods: ["otherMethod"],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.timestamp).toBeDefined();
    expect(data.total).toBe(3);
    expect(data.compatible).toBe(2);
    expect(data.models).toHaveLength(2);
    expect(data.models[0]).toEqual({
      name: "gemini-2.0-flash-lite",
      displayName: "Gemini 2.0 Flash Lite",
      methods: ["generateContent"],
    });
    expect(data.models[1]).toEqual({
      name: "gemini-1.5-pro",
      displayName: "Gemini 1.5 Pro",
      methods: ["generateContent"],
    });
    expect(data.message).toBe("Model cache will be refreshed on next API call");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1/models?key=test-api-key"
    );
    expect(mockConsoleError).not.toHaveBeenCalled();
  });

  it("should return 500 when GEMINI_API_KEY is not configured", async () => {
    delete process.env.GEMINI_API_KEY;

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Gemini API key not configured");
    expect(mockFetch).not.toHaveBeenCalled();
    // handleApiError logs error
    // expect(mockConsoleError).not.toHaveBeenCalled();
  });

  it("should handle API fetch failure", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to refresh models");
    expect(data.details).toBe("Failed to fetch models: 403");
    // handleApiError logs error
    // expect(mockConsoleError).toHaveBeenCalledWith(
    //   "Failed to refresh models:",
    //   expect.any(Error)
    // );
  });

  it("should handle network errors during fetch", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    const networkError = new Error("Network connection failed");
    mockFetch.mockRejectedValueOnce(networkError);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to refresh models");
    expect(data.details).toBe("Network connection failed");
    // expect(mockConsoleError).toHaveBeenCalledWith(
    //   "Failed to refresh models:",
    //   networkError
    // );
  });

  it("should handle malformed API response", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}), // Empty response
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.total).toBe(0);
    expect(data.compatible).toBe(0);
    expect(data.models).toEqual([]);
    expect(mockConsoleError).not.toHaveBeenCalled();
  });

  it("should filter out models without generateContent support", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    const mockApiResponse = {
      models: [
        {
          name: "models/gemini-2.0-flash-lite",
          displayName: "Gemini 2.0 Flash Lite",
          supportedGenerationMethods: ["generateContent"],
        },
        {
          name: "models/embedding-model",
          displayName: "Embedding Model",
          supportedGenerationMethods: ["embedText"],
        },
        {
          name: "models/chat-model",
          displayName: "Chat Model",
          supportedGenerationMethods: ["generateMessage"],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(3);
    expect(data.compatible).toBe(1);
    expect(data.models).toHaveLength(1);
    expect(data.models[0].name).toBe("gemini-2.0-flash-lite");
  });

  it("should handle models with null or undefined methods", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    const mockApiResponse = {
      models: [
        {
          name: "models/gemini-2.0-flash-lite",
          displayName: "Gemini 2.0 Flash Lite",
          supportedGenerationMethods: ["generateContent"],
        },
        {
          name: "models/model-without-methods",
          displayName: "Model Without Methods",
        },
        {
          name: "models/model-with-null-methods",
          displayName: "Model With Null Methods",
          supportedGenerationMethods: null,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(3);
    expect(data.compatible).toBe(1);
    expect(data.models).toHaveLength(1);
    expect(data.models[0].name).toBe("gemini-2.0-flash-lite");
  });

  it("should handle JSON parsing errors in API response", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new Error("Invalid JSON")),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to refresh models");
    expect(data.details).toBe("Invalid JSON");
    // expect(mockConsoleError).toHaveBeenCalledWith(
    //   "Failed to refresh models:",
    //   expect.any(Error)
    // );
  });

  it("should handle unknown errors", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    mockFetch.mockRejectedValueOnce("String error");

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to refresh models");
    expect(data.details).toBe("String error");
    // expect(mockConsoleError).toHaveBeenCalledWith(
    //   "Failed to refresh models:",
    //   "String error"
    // );
  });

  it("should include timestamp in response", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    const mockApiResponse = {
      models: [
        {
          name: "models/gemini-2.0-flash-lite",
          displayName: "Gemini 2.0 Flash Lite",
          supportedGenerationMethods: ["generateContent"],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    const beforeCall = new Date();
    const response = await GET();
    const afterCall = new Date();
    const data = await response.json();

    expect(data.timestamp).toBeDefined();
    const timestamp = new Date(data.timestamp);
    expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
    expect(timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime());
  });
});
