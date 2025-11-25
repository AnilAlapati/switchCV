import { POST } from "@/app/api/ai/generate/route";
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/services/aiGenerationService";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";

// Mock Firebase Admin
const mockFirestoreGet = jest.fn();
const mockFirestoreAdd = jest.fn();
const mockRunTransaction = jest.fn();

jest.mock("@/lib/firebase-admin", () => ({
  __esModule: true,
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: mockFirestoreGet,
      })),
      add: mockFirestoreAdd,
    })),
    runTransaction: (...args: any[]) => mockRunTransaction(...args),
  },
  default: {
    firestore: {
      Timestamp: class {
        static fromMillis(ms: number) {
          return { toMillis: () => ms };
        }
      },
      FieldValue: {
        serverTimestamp: () => "SERVER_TIMESTAMP",
      },
    },
  },
}));

jest.mock("@/lib/services/aiGenerationService");
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status = 500) => {
    const headers = new Map();
    return {
      status,
      headers: {
        set: (key: string, value: string) => headers.set(key, value),
        get: (key: string) => headers.get(key),
      },
      json: async () => ({
        error: message,
        details: error instanceof Error ? error.message : undefined,
      }),
    };
  }),
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockedGenerateText = jest.mocked(generateText);

const createRequest = (body: any) => {
  return new NextRequest("http://localhost:3000/api/ai/generate", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token-12345",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
};

describe("/api/ai/generate route", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "test-user-id",
    });
    mockFirestoreGet.mockResolvedValue({
      exists: true,
      data: () => ({ subscriptionTier: "premium" }),
    });
    mockRunTransaction.mockResolvedValue({
      remaining: 10,
      resetTime: Date.now() + 60000,
    });
  });

  it("should successfully generate text with valid prompt", async () => {
    const mockResult = {
      text: "Generated resume bullet point",
      model: "gemini-2.5-flash",
      provider: "google",
    };

    mockedGenerateText.mockResolvedValueOnce(mockResult);

    const request = createRequest({
      prompt: "Create a professional resume bullet",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.text).toBe("Generated resume bullet point");
    expect(data.provider).toBe("google");
  });

  it("should return 400 error when prompt is missing", async () => {
    const request = createRequest({});

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("expected string"); // Zod error for missing required field
  });

  it("should return 400 error when prompt is empty", async () => {
    const request = createRequest({ prompt: "" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Prompt is required");
  });

  it("should pass custom maxTokens and temperature to service", async () => {
    const mockResult = {
      text: "Response",
      model: "gemini-2.0-flash",
      provider: "google",
    };

    mockedGenerateText.mockResolvedValueOnce(mockResult);

    const request = createRequest({
      prompt: "Test",
      maxTokens: 300,
      temperature: 0.5,
    });

    const response = await POST(request);
    await response.json();

    expect(mockedGenerateText).toHaveBeenCalledWith("Test", 300, 0.5);
  });

  it("should handle errors from generateText", async () => {
    mockedGenerateText.mockRejectedValueOnce(new Error("All providers failed"));

    const request = createRequest({ prompt: "Test" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("AI text generation failed");
  });

  it("should handle HuggingFace fallback provider", async () => {
    const mockResult = {
      text: "HuggingFace generated",
      model: "FLAN-T5 Base",
      provider: "huggingface",
    };

    mockedGenerateText.mockResolvedValueOnce(mockResult);

    const request = createRequest({ prompt: "Test" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.provider).toBe("huggingface");
  });

  it("should use default parameters when not provided", async () => {
    const mockResult = {
      text: "Response",
      model: "gemini-2.0-flash",
      provider: "google",
    };

    mockedGenerateText.mockResolvedValueOnce(mockResult);

    const request = createRequest({ prompt: "Test prompt" });

    const response = await POST(request);
    await response.json();

    expect(mockedGenerateText).toHaveBeenCalledWith("Test prompt", 150, 0.9);
  });

  it("should handle special characters in prompts", async () => {
    const mockResult = {
      text: "Response",
      model: "gemini-2.5-flash",
      provider: "google",
    };

    mockedGenerateText.mockResolvedValueOnce(mockResult);

    const specialPrompt = 'Create: "bullet" with @#$% & characters!';
    const request = createRequest({ prompt: specialPrompt });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(200);
    expect(mockedGenerateText).toHaveBeenCalledWith(specialPrompt, 150, 0.9);
  });

  it("should handle very long prompts", async () => {
    const mockResult = {
      text: "Response",
      model: "gemini-2.5-flash",
      provider: "google",
    };

    mockedGenerateText.mockResolvedValueOnce(mockResult);

    const longPrompt = "A".repeat(1000);
    const request = createRequest({ prompt: longPrompt });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(200);
  });

  it("should handle malformed JSON gracefully", async () => {
    const request = new NextRequest("http://localhost:3000/api/ai/generate", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token-12345",
        "Content-Type": "application/json",
      },
      body: "invalid json",
    });

    // Override json() to throw
    Object.defineProperty(request, "json", {
      value: jest.fn().mockRejectedValueOnce(new SyntaxError("Invalid JSON")),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(500);
  });

  it("should return 401 error when authentication fails", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      error: NextResponse.json(
        { error: "Unauthorized: Missing or invalid token" },
        { status: 401 }
      ),
    });

    const request = new NextRequest("http://localhost:3000/api/ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: "Test" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized: Missing or invalid token");
  });

  it("should return 403 error when user is on basic plan", async () => {
    mockFirestoreGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ subscriptionTier: "basic" }),
    });

    const request = createRequest({ prompt: "Test" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe(
      "AI text generation requires a premium or enterprise plan."
    );
  });

  it("should default to basic plan if user not found and return 403", async () => {
    mockFirestoreGet.mockResolvedValueOnce({
      exists: false,
      data: () => undefined,
    });

    const request = createRequest({ prompt: "Test" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe(
      "AI text generation requires a premium or enterprise plan."
    );
  });

  it("should return 429 error when rate limit is exceeded", async () => {
    mockRunTransaction.mockImplementation(async (callback) => {
      const mockTx = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            count: 100, // Exceed limit
            windowStart: Date.now(), // Current window
          }),
        }),
        set: jest.fn(),
      };
      return callback(mockTx);
    });

    const request = createRequest({ prompt: "Test" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Too many requests. Please try again later.");
    expect(response.headers.get("Retry-After")).toBeDefined();
  });

  it("should return 400 error when prompt is too long", async () => {
    const longPrompt = "a".repeat(2001);
    const request = createRequest({ prompt: longPrompt });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain(
      "Prompt exceeds maximum length of 2000 characters"
    );
  });
});
