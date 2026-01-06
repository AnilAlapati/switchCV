import { NextRequest, NextResponse } from "next/server";
import { GET, POST } from "./route";
import { generateText } from "@/lib/services/aiGenerationService";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { BillingService } from "@/lib/services/billingService";
import {
  buildResumeEditPrompt,
  extractResumeEditJSON,
  getResumeEditGreeting,
  isResumeEditCompletion,
  stripEditArtifacts,
} from "@/lib/services/resumeEditPrompts";
import {
  mergeProfileIntoResume,
  normalizeResumeForEditor,
  sanitizeResumePayload,
} from "@/lib/utils/resumeEditor";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";

const mockDoc: any = {
  get: jest.fn(),
  set: jest.fn(),
  collection: jest.fn(),
  id: "mock-doc-id",
};
const mockCollection: any = { doc: jest.fn(() => mockDoc) };
mockDoc.collection.mockReturnValue(mockCollection);

jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: jest.fn((body, init) => ({ body, init })) },
}));
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn((name) => {
      if (name === "users") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ subscriptionTier: "premium" }),
            }),
          })),
        };
      }
      return mockCollection;
    }),
  },
}));
jest.mock("@/lib/utils/distributedRateLimit");
jest.mock("@/lib/services/billingService", () => ({
  BillingService: {
    checkBudget: jest.fn(),
    trackUsage: jest.fn(),
  },
}));
jest.mock("@/lib/services/aiGenerationService", () => ({
  generateText: jest.fn(),
}));
jest.mock("@/lib/services/resumeEditPrompts", () => ({
  buildResumeEditPrompt: jest.fn(),
  extractResumeEditJSON: jest.fn(),
  getResumeEditGreeting: jest.fn(),
  isResumeEditCompletion: jest.fn(),
  stripEditArtifacts: jest.fn(),
}));
jest.mock("@/lib/utils/resumeEditor", () => ({
  mergeProfileIntoResume: jest.fn(),
  normalizeResumeForEditor: jest.fn(),
  sanitizeResumePayload: jest.fn(),
}));
jest.mock("@/lib/utils/api-helpers", () => ({
  handleApiError: jest.fn(),
  getAuthenticatedUserId: jest.fn(),
}));

describe("Resume Chat API", () => {
  const mockResumeId = "resume-123";
  const mockUserId = "user-123";
  const mockParams = Promise.resolve({ id: mockResumeId });

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockUserId,
    });
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      current: 1,
      limit: 10,
      resetIn: 60000,
      remaining: 9,
    });
    (BillingService.checkBudget as jest.Mock).mockResolvedValue(true);
    (handleApiError as jest.Mock).mockImplementation(
      (error, message, status) => ({ error, message, status })
    );
    mockDoc.get.mockReset();
    mockDoc.set.mockReset();
    mockDoc.collection.mockReturnValue(mockCollection);
    mockCollection.doc.mockReturnValue(mockDoc);
  });

  describe("GET", () => {
    it("should return 400 if resume ID is missing", async () => {
      await GET({} as NextRequest, { params: Promise.resolve({ id: "" }) });
      expect(handleApiError).toHaveBeenCalledWith(
        expect.any(Error),
        "Resume ID is required",
        400
      );
    });

    it("should return auth error if user is not authenticated", async () => {
      const authError = { status: 401, message: "Unauthorized" };
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        error: authError,
      });
      expect(await GET({} as NextRequest, { params: mockParams })).toEqual(
        authError
      );
    });

    it("should return 403 if user does not own the resume", async () => {
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ userId: "other-user" }),
      });
      await GET({} as NextRequest, { params: mockParams });
      expect(handleApiError).toHaveBeenCalledWith(
        expect.any(Error),
        "Permission denied",
        403
      );
    });

    it("should return resume data if user owns it", async () => {
      const mockResumeData = { userId: mockUserId, title: "My Resume" };
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockResumeData,
      });
      const mockNormalized = { profile: { title: "Dev" } };
      (normalizeResumeForEditor as jest.Mock).mockReturnValue(mockNormalized);
      (getResumeEditGreeting as jest.Mock).mockReturnValue("Hello");

      await GET({} as NextRequest, { params: mockParams });
      expect(NextResponse.json).toHaveBeenCalledWith({
        resumeExists: true,
        resume: { ...mockResumeData, id: mockResumeId },
        snapshot: mockNormalized,
        greeting: "Hello",
        metadata: { numericId: expect.anything(), updatedAt: null },
      });
    });

    it("should handle non-existent resume", async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      (getResumeEditGreeting as jest.Mock).mockReturnValue("Welcome");
      await GET({} as NextRequest, { params: mockParams });
      expect(NextResponse.json).toHaveBeenCalledWith(
        { resumeExists: false, greeting: "Welcome" },
        { status: 200 }
      );
    });

    it("should handle errors gracefully", async () => {
      (getAuthenticatedUserId as jest.Mock).mockRejectedValue(
        new Error("Auth failed")
      );
      await GET({} as NextRequest, { params: mockParams });
      expect(handleApiError).toHaveBeenCalledWith(
        expect.any(Error),
        "Internal server error"
      );
    });
  });

  describe("POST", () => {
    it("should return 400 if message is missing", async () => {
      await POST(
        { json: jest.fn().mockResolvedValue({}) } as unknown as NextRequest,
        { params: mockParams }
      );
      expect(handleApiError).toHaveBeenCalledWith(
        expect.any(Error),
        "Message is required",
        400
      );
    });

    it("should return 400 if resume ID is missing", async () => {
      await POST({} as NextRequest, { params: Promise.resolve({ id: "" }) });
      expect(handleApiError).toHaveBeenCalledWith(
        expect.any(Error),
        "Resume ID is required",
        400
      );
    });

    it("should process AI response and update resume", async () => {
      const req = {
        json: jest.fn().mockResolvedValue({ message: "Update my title" }),
      } as unknown as NextRequest;
      const mockResumeData = { userId: mockUserId, title: "Old Title" };
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockResumeData,
      });
      mockDoc.set.mockResolvedValue(undefined);

      (normalizeResumeForEditor as jest.Mock).mockReturnValue({ profile: {} });
      (buildResumeEditPrompt as jest.Mock).mockReturnValue("prompt");
      (generateText as jest.Mock).mockResolvedValue({
        text: "response",
        model: "gpt-4",
        provider: "openai",
      });
      (isResumeEditCompletion as jest.Mock).mockReturnValue(true);
      (extractResumeEditJSON as jest.Mock).mockReturnValue({
        updatedProfile: { title: "New Title" },
        changeSummary: "Updated title",
      });
      (stripEditArtifacts as jest.Mock).mockReturnValue("Done");
      (mergeProfileIntoResume as jest.Mock).mockReturnValue({
        ...mockResumeData,
        title: "New Title",
      });
      (sanitizeResumePayload as jest.Mock).mockReturnValue({
        title: "New Title",
      });

      await POST(req, { params: mockParams });
      expect(mockDoc.set).toHaveBeenCalled();
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          completed: true,
          response: "Updated title — all set!",
        })
      );
    });

    it("should handle incomplete AI response", async () => {
      const req = {
        json: jest.fn().mockResolvedValue({ message: "Help me" }),
      } as unknown as NextRequest;
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ userId: mockUserId }),
      });
      (generateText as jest.Mock).mockResolvedValue({
        text: "Sure?",
        model: "gpt-4",
        provider: "openai",
      });
      (isResumeEditCompletion as jest.Mock).mockReturnValue(false);
      (stripEditArtifacts as jest.Mock).mockReturnValue("Sure?");

      await POST(req, { params: mockParams });
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ completed: false, response: "Sure?" })
      );
    });

    it("should return 200 with fallback if resume not found", async () => {
      const req = {
        json: jest.fn().mockResolvedValue({ message: "Hello" }),
      } as unknown as NextRequest;
      mockDoc.get.mockResolvedValue({ exists: false });
      (getResumeEditGreeting as jest.Mock).mockReturnValue("Fallback");
      await POST(req, { params: mockParams });
      expect(NextResponse.json).toHaveBeenCalledWith(
        { response: "Fallback", resumeMissing: true },
        { status: 200 }
      );
    });

    it("should return 403 if user does not own the resume", async () => {
      const req = {
        json: jest.fn().mockResolvedValue({ message: "Hello" }),
      } as unknown as NextRequest;
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ userId: "other-user" }),
      });
      await POST(req, { params: mockParams });
      expect(handleApiError).toHaveBeenCalledWith(
        expect.any(Error),
        "Permission denied",
        403
      );
    });

    it("should handle invalid updatedProfile from AI", async () => {
      const req = {
        json: jest.fn().mockResolvedValue({ message: "Update" }),
      } as unknown as NextRequest;
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ userId: mockUserId }),
      });
      (generateText as jest.Mock).mockResolvedValue({
        text: "response",
        model: "gpt-4",
        provider: "openai",
      });
      (isResumeEditCompletion as jest.Mock).mockReturnValue(true);
      (extractResumeEditJSON as jest.Mock).mockReturnValue({
        updatedProfile: null,
      });

      await POST(req, { params: mockParams });
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          completed: false,
          response: expect.stringContaining("incorrect"),
        })
      );
    });

    it("should handle subcollection update failure gracefully", async () => {
      const req = {
        json: jest.fn().mockResolvedValue({ message: "Update" }),
      } as unknown as NextRequest;
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ userId: mockUserId, numericId: 123 }),
      });
      mockDoc.set
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Subcollection update failed"))
        .mockResolvedValueOnce(undefined);
      (isResumeEditCompletion as jest.Mock).mockReturnValue(true);
      (extractResumeEditJSON as jest.Mock).mockReturnValue({
        updatedProfile: {},
      });

      await POST(req, { params: mockParams });
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ completed: true })
      );
    });

    it("should handle global index update failure gracefully", async () => {
      const req = {
        json: jest.fn().mockResolvedValue({ message: "Update" }),
      } as unknown as NextRequest;
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ userId: mockUserId, numericId: 123 }),
      });
      mockDoc.set
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Global index update failed"));
      (isResumeEditCompletion as jest.Mock).mockReturnValue(true);
      (extractResumeEditJSON as jest.Mock).mockReturnValue({
        updatedProfile: {},
      });

      await POST(req, { params: mockParams });
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ completed: true })
      );
    });

    it("should handle general errors in POST", async () => {
      const req = {
        json: jest.fn().mockRejectedValue(new Error("JSON error")),
      } as unknown as NextRequest;
      await POST(req, { params: mockParams });
      expect(handleApiError).toHaveBeenCalledWith(
        expect.any(Error),
        "Failed to process resume edit"
      );
    });
  });
});
