import { POST, RateLimitError } from "@/app/api/ai/generate/route";
import { NextRequest } from "next/server";
import { generateText } from "@/lib/services/aiGenerationService";

// Mock Firebase Admin
const mockVerifyIdToken = jest.fn();
const mockFirestoreGet = jest.fn();
const mockFirestoreAdd = jest.fn();
const mockRunTransaction = jest.fn();

jest.mock("@/lib/firebase-admin", () => ({
  __esModule: true,
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
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
    mockVerifyIdToken.mockResolvedValue({ uid: "test-user-id" });
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
    expect(data.error).toBe("Prompt is required and must be a string");
  });

  it("should return 400 error when prompt is empty", async () => {
    const request = createRequest({ prompt: "" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Prompt is required and must be a string");
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
    expect(data.error).toBe("Internal server error");
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

  it("should return 401 error when Authorization header is missing", async () => {
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

  it("should return 401 error when Authorization header is invalid", async () => {
    const request = new NextRequest("http://localhost:3000/api/ai/generate", {
      method: "POST",
      headers: {
        Authorization: "InvalidToken",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: "Test" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized: Missing or invalid token");
  });

  it("should return 401 error when token verification fails", async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error("Invalid token"));

    const request = createRequest({ prompt: "Test" });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized: Invalid token");
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
    // Mock runTransaction to throw RateLimitError-like object or we can mock the helper if it was exported.
    // Since enforceRateLimit is internal, we have to mock runTransaction to throw.
    // But wait, the error is thrown INSIDE the transaction callback.
    // The current mockRunTransaction just returns a value.
    // We need to make mockRunTransaction execute the callback or simulate the error.

    // However, the route catches RateLimitError.
    // Let's mock runTransaction to throw a custom error that looks like RateLimitError?
    // No, RateLimitError is defined in the route file and not exported.
    // We can't instantiate it easily in the test.

    // Alternative: We can mock the implementation of runTransaction to throw an error
    // that has the same structure if we can't import the class.
    // Or we can rely on the fact that the route catches `RateLimitError`.

    // Actually, `enforceRateLimit` calls `runTransaction`.
    // If `runTransaction` throws, `enforceRateLimit` throws.
    // But `RateLimitError` is thrown FROM WITHIN the transaction callback.

    // Let's try to mock `runTransaction` to throw an error that has `retryAfterSeconds` property?
    // The `instanceof RateLimitError` check in `handleRouteError` will fail if it's not the same class.

    // Since `RateLimitError` is not exported, we can't use `instanceof` in our mock to throw it.
    // We might need to export `RateLimitError` from the route file to test it properly,
    // or we can test the behavior by mocking `adminDb.runTransaction` to execute the callback
    // and ensuring the callback logic throws.

    // Let's try to make `mockRunTransaction` execute the callback.
    mockRunTransaction.mockImplementation(async (callback) => {
      // We need to mock the transaction object passed to the callback
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

      // We can't easily make the callback throw the exact RateLimitError class instance
      // because the callback logic inside enforceRateLimit instantiates it.
      // But wait, if we execute the callback, it WILL throw the RateLimitError
      // because the logic inside the callback checks the count and throws.
      // So we just need to execute the callback!

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
    expect(data.error).toBe("Prompt exceeds maximum length of 2000 characters");
  });
});
