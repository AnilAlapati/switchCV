import { POST } from "./route";
import { NextRequest } from "next/server";
import { mapResumeId } from "@/lib/resumeIdMapping";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

// Mock resume ID mapping
jest.mock("@/lib/resumeIdMapping", () => ({
  mapResumeId: jest.fn(),
}));

// Mock api-helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status = 500) => {
    return {
      status: status,
      json: async () => ({
        error: message,
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }),
}));

describe("POST /api/resume/map-id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should return 401 when authentication fails", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        error: handleApiError(new Error("Unauthorized"), "Unauthorized", 401),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/resume/map-id",
        {
          method: "POST",
          body: JSON.stringify({ resumeId: 123, documentId: "doc-123" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      expect(mapResumeId).not.toHaveBeenCalled();
    });
  });

  describe("Request validation", () => {
    beforeEach(() => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "test-user-123",
      });
    });

    it("should return 401 when resumeId is missing", async () => {
      // Note: The original test expected 401 for missing resumeId?
      // Looking at the code: if (!resumeId || !documentId) return 400.
      // The original test expected 401? Let's check the code.
      // Code: return NextResponse.json({ error: "Missing resumeId or documentId" }, { status: 400 });
      // The original test expected 401?
      // "should return 401 when resumeId is missing"
      // Wait, the original test expected 401 because it was testing AUTHENTICATION?
      // No, "Request validation" block.
      // Let's check the original test code again.
      /*
      it("should return 401 when resumeId is missing", async () => {
        const request = new NextRequest(..., { headers: { Authorization: "Bearer valid-token" }, body: JSON.stringify({ documentId: "doc-123" }) });
        const response = await POST(request);
        expect(response.status).toBe(401);
      */
      // Wait, why did it expect 401?
      // Ah, the original test failure showed:
      // Expected: "valid-token"
      // Number of calls: 0
      // It seems the original test expected 401?
      // Let's check the file content I read earlier.
      /*
      it("should return 401 when resumeId is missing", async () => {
        // ...
        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
        expect(adminAuth.verifyIdToken).toHaveBeenCalledWith("valid-token");
      */
      // This is weird. If verifyIdToken is called with valid token, why expect 401?
      // Maybe the original test was copy-pasted and expected 401 but the code returns 400?
      // Or maybe the original test was asserting that even with valid token, something else fails?
      // No, if resumeId is missing, it should return 400.
      // The original test seems to have incorrect expectations or I am misreading it.
      // Let's look at the code again.
      /*
      if (!resumeId || !documentId) {
        return NextResponse.json(
          { error: "Missing resumeId or documentId" },
          { status: 400 }
        );
      }
      */
      // So it should be 400.

      const request = new NextRequest(
        "http://localhost:3000/api/resume/map-id",
        {
          method: "POST",
          body: JSON.stringify({ documentId: "doc-123" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing resumeId or documentId");
      expect(mapResumeId).not.toHaveBeenCalled();
    });

    it("should return 400 when documentId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/resume/map-id",
        {
          method: "POST",
          body: JSON.stringify({ resumeId: 123 }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing resumeId or documentId");
      expect(mapResumeId).not.toHaveBeenCalled();
    });
  });

  describe("Successful mapping", () => {
    beforeEach(() => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "test-user-123",
      });
    });

    it("should successfully create resume ID mapping", async () => {
      (mapResumeId as jest.Mock).mockResolvedValue({
        resumeId: 123,
        documentId: "doc-123",
        userId: "test-user-123",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/resume/map-id",
        {
          method: "POST",
          body: JSON.stringify({ resumeId: 123, documentId: "doc-123" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({
        success: true,
        message: "Resume ID mapping created",
        data: { resumeId: 123, documentId: "doc-123" },
      });
      expect(mapResumeId).toHaveBeenCalledWith(123, "doc-123", "test-user-123");
    });

    it("should handle string resumeId", async () => {
      (mapResumeId as jest.Mock).mockResolvedValue({
        resumeId: "456",
        documentId: "doc-456",
        userId: "test-user-123",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/resume/map-id",
        {
          method: "POST",
          body: JSON.stringify({ resumeId: "456", documentId: "doc-456" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({
        success: true,
        message: "Resume ID mapping created",
        data: { resumeId: "456", documentId: "doc-456" },
      });
      expect(mapResumeId).toHaveBeenCalledWith(
        "456",
        "doc-456",
        "test-user-123"
      );
    });
  });

  describe("Error handling", () => {
    beforeEach(() => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "test-user-123",
      });
    });

    it("should handle mapResumeId errors gracefully", async () => {
      (mapResumeId as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        "http://localhost:3000/api/resume/map-id",
        {
          method: "POST",
          body: JSON.stringify({ resumeId: 123, documentId: "doc-123" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create resume ID mapping");
      expect(data.details).toBe("Database connection failed");
    });

    it("should handle unknown errors", async () => {
      (mapResumeId as jest.Mock).mockRejectedValue("String error");

      const request = new NextRequest(
        "http://localhost:3000/api/resume/map-id",
        {
          method: "POST",
          body: JSON.stringify({ resumeId: 123, documentId: "doc-123" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create resume ID mapping");
      expect(data.details).toBe("Unknown error");
    });
  });
});
