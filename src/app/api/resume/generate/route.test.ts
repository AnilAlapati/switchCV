import { POST } from "./route";
import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { generateText } from "@/lib/services/aiGenerationService";
import { ResumeDataExtractor } from "@/lib/services/resumeDataExtractor";
import { ConversationManager } from "@/lib/services/conversationManager";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
import { adminDb } from "@/lib/firebase-admin";

jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(),
}));

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn().mockReturnValue([]),
  cert: jest.fn(),
}));

jest.mock("@/lib/services/aiGenerationService");
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
    const mockExtractionResult = {
      data: { name: "John" },
      confidence: 0.9,
      extractedFields: ["name"],
      isComplete: false,
    };
    (ResumeDataExtractor.extractFromConversation as jest.Mock).mockReturnValue(
      mockExtractionResult
    );

    const mockConversationManager = {
      updateData: jest.fn(),
      getProgress: jest
        .fn()
        .mockReturnValue({
          completenessPercentage: 50,
          isReadyToCreate: false,
        }),
      getData: jest.fn().mockReturnValue({ name: "John" }),
      validate: jest.fn().mockReturnValue({ valid: true }),
    };
    (ConversationManager as unknown as jest.Mock).mockImplementation(
      () => mockConversationManager
    );

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
    const mockExtractionResult = {
      data: { name: "John", email: "john@example.com" },
      confidence: 0.9,
      extractedFields: ["name", "email"],
      isComplete: true,
    };
    (ResumeDataExtractor.extractFromConversation as jest.Mock).mockReturnValue(
      mockExtractionResult
    );

    const mockConversationManager = {
      updateData: jest.fn(),
      getProgress: jest
        .fn()
        .mockReturnValue({
          completenessPercentage: 100,
          isReadyToCreate: true,
          hasMinimumData: true,
        }),
      getData: jest
        .fn()
        .mockReturnValue({ name: "John", email: "john@example.com" }),
      validate: jest.fn().mockReturnValue({ valid: true }),
    };
    (ConversationManager as unknown as jest.Mock).mockImplementation(
      () => mockConversationManager
    );

    (generateText as jest.Mock).mockResolvedValue({
      text: "Resume created",
      model: "gpt-4",
    });

    (generateNumericResumeId as jest.Mock).mockResolvedValue(1001);

    const mockSet = jest.fn();

    // Mock nested collection for user
    const mockUserResumesDoc = { set: mockSet };
    const mockUserResumesCollection = {
      doc: jest.fn().mockReturnValue(mockUserResumesDoc),
    };
    const mockUserDoc = {
      collection: jest.fn().mockReturnValue(mockUserResumesCollection),
    };

    const mockCollectionImpl = jest.fn((name) => {
      if (name === "resumes")
        return { doc: jest.fn().mockReturnValue({ set: mockSet }) };
      if (name === "users")
        return { doc: jest.fn().mockReturnValue(mockUserDoc) };
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
});
