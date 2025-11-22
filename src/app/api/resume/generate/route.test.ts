/* eslint-disable max-lines */
import { POST } from "./route";
import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { generateText } from "@/lib/services/aiGenerationService";
import { ResumeDataExtractor } from "@/lib/services/resumeDataExtractor";
import { ConversationManager } from "@/lib/services/conversationManager";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
import { adminDb } from "@/lib/firebase-admin";
import {
  buildConversationalPrompt,
  extractResumeJSON,
  isCompletionResponse,
} from "@/lib/services/resumePrompts";
import { getActiveConfig } from "@/lib/services/conversationConfig";

jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(),
}));

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
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

function setupMockConversationManager(overrides: any = {}) {
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
    (getAuth as jest.Mock).mockReturnValue({
      verifyIdToken: jest.fn().mockResolvedValue({ uid: "user123" }),
    });
  });

  it("should return 400 if message is missing", async () => {
    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Message is required");
  });

  it("should process conversation and return response", async () => {
    (ResumeDataExtractor.extractFromConversation as jest.Mock).mockReturnValue({
      data: { name: "John" },
      confidence: 0.9,
      extractedFields: ["name"],
      isComplete: false,
    });
    setupMockConversationManager();
    (generateText as jest.Mock).mockResolvedValue({
      text: "AI Response",
      model: "gpt-4",
    });

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({
        message: "My name is John",
        conversationHistory: [],
      }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.response).toBe("AI Response");
    expect(data.progress).toBe(50);
  });

  it("should create resume when ready", async () => {
    (ResumeDataExtractor.extractFromConversation as jest.Mock).mockReturnValue({
      data: { name: "John", email: "john@example.com" },
      confidence: 0.9,
      extractedFields: ["name", "email"],
      isComplete: true,
    });
    setupMockConversationManager({
      progress: {
        completenessPercentage: 100,
        isReadyToCreate: true,
        hasMinimumData: true,
      },
      data: { name: "John", email: "john@example.com" },
    });
    (generateText as jest.Mock).mockResolvedValue({
      text: "Resume created",
      model: "gpt-4",
    });
    (generateNumericResumeId as jest.Mock).mockResolvedValue(1001);

    const mockSet = jest.fn();
    const mockCollectionImpl = jest.fn((name) => {
      if (name === "resumes")
        return { doc: jest.fn().mockReturnValue({ set: mockSet }) };
      if (name === "users")
        return {
          doc: jest.fn().mockReturnValue({
            collection: jest.fn().mockReturnValue({
              doc: jest.fn().mockReturnValue({ set: mockSet }),
            }),
          }),
        };
      return { doc: jest.fn() };
    });
    (adminDb.collection as jest.Mock).mockImplementation(mockCollectionImpl);

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({
        message: "Create my resume",
        conversationHistory: [],
      }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.created).toBe(true);
    expect(data.resumeId).toBe("1001");
  });

  it("should handle authenticated requests correctly", async () => {
    (getAuth as jest.Mock).mockReturnValue({
      verifyIdToken: jest.fn().mockResolvedValue({ uid: "authenticated_user" }),
    });
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
    expect(res.status).toBe(200);
  });

  it("should handle invalid auth token gracefully", async () => {
    (getAuth as jest.Mock).mockReturnValue({
      verifyIdToken: jest.fn().mockRejectedValue(new Error("Invalid token")),
    });
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
    expect(res.status).toBe(200);
  });

  it("should update config when user specifies question limit", async () => {
    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({
        message: "I want only 5 questions",
        conversationHistory: [],
      }),
    });
    (generateText as jest.Mock).mockResolvedValue({
      text: "Response",
      model: "gpt-4",
    });
    await POST(req);
    expect(buildConversationalPrompt).toHaveBeenCalled();
    const configArg = (buildConversationalPrompt as jest.Mock).mock.calls[0][4];
    expect(configArg.maxQuestionsInBetaMode).toBe(true);
    expect(configArg.maxBetaQuestions).toBe(5);
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
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.created).toBeUndefined();
    expect(data.response).toContain("Email is required");
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
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.created).toBe(true);
    expect(data.resumeId).toBe("1002");
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
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.created).toBe(true);
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
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.error).toBe("resume_creation_failed");
  });

  it("should handle internal server error", async () => {
    (generateText as jest.Mock).mockRejectedValue(new Error("AI Service Down"));
    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({ message: "Hello", conversationHistory: [] }),
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
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.response).toBe("Please provide email");
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

    const mockSet = jest.fn();
    const mockCollectionImpl = jest.fn((name) => {
      if (name === "resumes")
        return { doc: jest.fn().mockReturnValue({ set: mockSet }) };
      if (name === "users")
        return {
          doc: jest.fn().mockReturnValue({
            collection: jest.fn().mockReturnValue({
              doc: jest.fn().mockReturnValue({ set: mockSet }),
            }),
          }),
        };
      return { doc: jest.fn() };
    });
    (adminDb.collection as jest.Mock).mockImplementation(mockCollectionImpl);

    const req = new NextRequest("http://localhost/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({
        message: "only 5 questions",
        conversationHistory: [],
      }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.created).toBe(true);
  });
});
