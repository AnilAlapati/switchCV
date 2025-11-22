import { POST } from "@/app/api/ai/generate/route";
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
      Timestamp: {
        fromMillis: (ms: number) => ({ toMillis: () => ms }),
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
});
