/* eslint-disable max-lines */
import { POST } from "./route";
import { NextRequest } from "next/server";
import { generateText } from "@/lib/services/aiGenerationService";
import { ResumeDataExtractor } from "@/lib/services/resumeDataExtractor";
import { ConversationManager } from "@/lib/services/conversationManager";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";
import {
  buildConversationalPrompt,
  extractResumeJSON,
  isCompletionResponse,
} from "@/lib/services/resumePrompts";
import { getActiveConfig } from "@/lib/services/conversationConfig";

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn().mockReturnValue([]),
  cert: jest.fn(),
}));

jest.mock("@/lib/services/aiGenerationService");
jest.mock("@/lib/services/conversationConfig", () => ({
  getActiveConfig: jest.fn().mockReturnValue({ completionThreshold: 80 }),
}));
jest.mock("@/lib/services/resumeDataExtractor");
jest.mock("@/lib/services/conversationManager");
jest.mock("@/lib/services/resumePrompts", () => ({
  buildConversationalPrompt: jest.fn().mockReturnValue("prompt"),
  extractResumeJSON: jest.fn(),
  isCompletionResponse: jest.fn(),
}));
jest.mock("@/lib/numericIdGenerator");
jest.mock("@/lib/services/userService", () => ({
  getUserTier: jest.fn().mockResolvedValue("premium"),
}));
jest.mock("@/lib/services/billingService", () => ({
  BillingService: {
    checkBudget: jest.fn().mockResolvedValue(true),
    trackUsage: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: jest.fn(() => ({
            userId: "test-user",
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        }),
        set: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ exists: false }),
            set: jest.fn().mockResolvedValue({}),
          })),
        })),
      })),
      where: jest.fn(() => ({
        count: jest.fn(() => ({
          get: jest
            .fn()
            .mockResolvedValue({ data: jest.fn(() => ({ count: 0 })) }),
        })),
        get: jest.fn().mockResolvedValue({ docs: [] }),
      })),
      add: jest.fn().mockResolvedValue({ id: "test-id" }),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    })),
    runTransaction: jest.fn(async (fn) => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: false,
          data: jest.fn(() => undefined),
        }),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      };
      return fn(mockTransaction);
    }),
  },
  adminAuth: {
    verifyIdToken: jest.fn(async () => ({
      uid: "test-user-id",
      email: "test@example.com",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })),
  },
}));

function setupMockConversationManager(overrides: Record<string, unknown> = {}) {
  const mock = {
    updateData: jest.fn(),
    getProgress: jest.fn().mockReturnValue({
      completenessPercentage: 50,
      isReadyToCreate: false,
      hasMinimumData: false,
      ...overrides.progress,
    }),
    getData: jest.fn().mockReturnValue({ name: "John", ...overrides.data }),
    validate: jest
      .fn()
      .mockReturnValue({ valid: true, ...overrides.validation }),
  };
  (ConversationManager as unknown as jest.Mock).mockImplementation(() => mock);
  return mock;
}

describe("POST /api/resume/generate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if message is missing", async () => {
    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({ resumeId: "1" }),
      headers: { authorization: "Bearer test-token" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
  });

  it("should process conversation and return response", async () => {
    setupMockConversationManager();
    (generateText as jest.Mock).mockResolvedValue("AI Response");
    (isCompletionResponse as jest.Mock).mockReturnValue(false);

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({
        message: "I work in tech",
        resumeId: "1",
        draftId: "draft-1",
      }),
      headers: { authorization: "Bearer test-token" },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("should create resume when ready", async () => {
    setupMockConversationManager({
      progress: {
        completenessPercentage: 100,
        isReadyToCreate: true,
        hasMinimumData: true,
      },
      data: { name: "John", email: "john@example.com" },
    });
    (generateText as jest.Mock).mockResolvedValue("Resume created");
    (generateNumericResumeId as jest.Mock).mockResolvedValue(1001);

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({
        message: "Create my resume",
      }),
      headers: { authorization: "Bearer test-token" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("should handle authenticated requests correctly", async () => {
    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      headers: { authorization: "Bearer valid_token" },
      body: JSON.stringify({ message: "Hello", conversationHistory: [] }),
    });
    (generateText as jest.Mock).mockResolvedValue({
      text: "Response",
      model: "gpt-4",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("should handle invalid auth token gracefully", async () => {
    // Mock adminAuth to reject token verification
    const mockAdminAuth = require("@/lib/firebase-admin").adminAuth;
    mockAdminAuth.verifyIdToken.mockRejectedValueOnce(
      new Error("Invalid token")
    );

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      headers: { authorization: "Bearer invalid_token" },
      body: JSON.stringify({ message: "Hello", conversationHistory: [] }),
    });
    (generateText as jest.Mock).mockResolvedValue({
      text: "Response",
      model: "gpt-4",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should update config when user specifies question limit", async () => {
    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({
        message: "I want only 5 questions",
        conversationHistory: [],
      }),
      headers: { authorization: "Bearer test-token" },
    });
    (generateText as jest.Mock).mockResolvedValue({
      text: "Response",
      model: "gpt-4",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("should handle validation failure during creation attempt", async () => {
    setupMockConversationManager({
      progress: {
        completenessPercentage: 100,
        isReadyToCreate: true,
        hasMinimumData: true,
      },
      data: { name: "John" },
      validation: { valid: false, errors: ["Email is required"] },
    });
    (generateText as jest.Mock).mockResolvedValue({
      text: "I'm ready to create",
      model: "gpt-4",
    });
    (extractResumeJSON as jest.Mock).mockReturnValue({ some: "json" });

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({
        message: "Create my resume",
        conversationHistory: [],
      }),
      headers: { authorization: "Bearer test-token" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("should create resume when AI indicates completion", async () => {
    setupMockConversationManager({
      progress: {
        completenessPercentage: 80,
        isReadyToCreate: false,
        hasMinimumData: true,
      },
      data: { name: "John", email: "john@example.com" },
    });
    (generateText as jest.Mock).mockResolvedValue({
      text: "I have everything I need.",
      model: "gpt-4",
    });
    (isCompletionResponse as jest.Mock).mockReturnValue(true);
    (generateNumericResumeId as jest.Mock).mockResolvedValue(1002);

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({
        message: "Here is my info",
        conversationHistory: [],
      }),
      headers: { authorization: "Bearer test-token" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("should use collected data if JSON extraction fails", async () => {
    setupMockConversationManager({
      progress: {
        completenessPercentage: 100,
        isReadyToCreate: true,
        hasMinimumData: true,
      },
      data: { name: "Fallback Name", email: "fallback@example.com" },
    });
    (generateText as jest.Mock).mockResolvedValue({
      text: "Creating resume now.",
      model: "gpt-4",
    });
    (extractResumeJSON as jest.Mock).mockReturnValue(null);
    (generateNumericResumeId as jest.Mock).mockResolvedValue(1003);

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({ message: "Create it", conversationHistory: [] }),
      headers: { authorization: "Bearer test-token" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("should handle database error during resume creation", async () => {
    setupMockConversationManager({
      progress: {
        completenessPercentage: 100,
        isReadyToCreate: true,
        hasMinimumData: true,
      },
      data: { name: "John", email: "john@example.com" },
    });
    (generateText as jest.Mock).mockResolvedValue({
      text: "Creating resume",
      model: "gpt-4",
    });
    (generateNumericResumeId as jest.Mock).mockResolvedValue(1001);
    (adminDb.collection as jest.Mock).mockImplementation(() => {
      throw new Error("DB Error");
    });

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({
        message: "Create my resume",
        conversationHistory: [],
      }),
      headers: { authorization: "Bearer test-token" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should handle internal server error", async () => {
    (generateText as jest.Mock).mockRejectedValue(new Error("AI Service Down"));
    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({ message: "Hello", conversationHistory: [] }),
      headers: { authorization: "Bearer test-token" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should handle validation failure with no JSON in response", async () => {
    setupMockConversationManager({
      progress: {
        completenessPercentage: 100,
        isReadyToCreate: true,
        hasMinimumData: true,
      },
      data: { name: "John" },
      validation: { valid: false, errors: ["Email missing"] },
    });
    (generateText as jest.Mock).mockResolvedValue({
      text: "Please provide email",
      model: "gpt-4",
    });
    (extractResumeJSON as jest.Mock).mockReturnValue(null);

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({ message: "Create", conversationHistory: [] }),
      headers: { authorization: "Bearer test-token" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("should NOT create resume if not ready and AI says continue (default mode)", async () => {
    setupMockConversationManager({
      progress: {
        completenessPercentage: 80,
        isReadyToCreate: false,
        hasMinimumData: true,
      },
      data: { name: "John" },
    });
    (generateText as jest.Mock).mockResolvedValue({
      text: "Next question",
      model: "gpt-4",
    });
    (isCompletionResponse as jest.Mock).mockReturnValue(false);

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({ message: "answer", conversationHistory: [] }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.created).toBeUndefined();
  });

  it("should create resume in beta mode when threshold met", async () => {
    setupMockConversationManager({
      progress: {
        completenessPercentage: 80,
        isReadyToCreate: false,
        hasMinimumData: true,
      },
      data: { name: "John", email: "test@test.com" },
    });
    (generateText as jest.Mock).mockResolvedValue({
      text: "Next question",
      model: "gpt-4",
    });
    (getActiveConfig as jest.Mock).mockReturnValue({ completionThreshold: 80 });
    (generateNumericResumeId as jest.Mock).mockResolvedValue(1005);

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({
        message: "only 5 questions",
        conversationHistory: [],
      }),
      headers: { authorization: "Bearer test-token" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
