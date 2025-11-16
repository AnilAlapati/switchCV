import { POST } from "./route";
import { NextRequest } from "next/server";

// Mock Firebase admin auth
jest.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
}));

// Mock resume ID mapping
jest.mock("@/lib/resumeIdMapping", () => ({
  mapResumeId: jest.fn(),
}));

import { adminAuth } from "@/lib/firebase-admin";
import { mapResumeId } from "@/lib/resumeIdMapping";

describe("POST /api/resume/map-id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should return 401 when Authorization header is missing", async () => {
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
      expect(adminAuth.verifyIdToken).not.toHaveBeenCalled();
      expect(mapResumeId).not.toHaveBeenCalled();
    });

    it("should return 401 when Authorization header doesn't start with Bearer", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/resume/map-id",
        {
          method: "POST",
          headers: { Authorization: "Basic token" },
          body: JSON.stringify({ resumeId: 123, documentId: "doc-123" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      expect(adminAuth.verifyIdToken).not.toHaveBeenCalled();
    });

    it("should return 401 when token verification fails", async () => {
      (adminAuth.verifyIdToken as jest.Mock).mockRejectedValue(
        new Error("Invalid token")
      );

      const request = new NextRequest(
        "http://localhost:3000/api/resume/map-id",
        {
          method: "POST",
          headers: { Authorization: "Bearer invalid-token" },
          body: JSON.stringify({ resumeId: 123, documentId: "doc-123" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      expect(adminAuth.verifyIdToken).toHaveBeenCalledWith("invalid-token");
      expect(mapResumeId).not.toHaveBeenCalled();
    });
  });

  describe("Request validation", () => {
    it("should return 401 when resumeId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/resume/map-id",
        {
          method: "POST",
          headers: { Authorization: "Bearer valid-token" },
          body: JSON.stringify({ documentId: "doc-123" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      expect(adminAuth.verifyIdToken).toHaveBeenCalledWith("valid-token");
      expect(mapResumeId).not.toHaveBeenCalled();
    });

    it("should return 401 when documentId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/resume/map-id",
        {
          method: "POST",
          headers: { Authorization: "Bearer valid-token" },
          body: JSON.stringify({ resumeId: 123 }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      expect(adminAuth.verifyIdToken).toHaveBeenCalledWith("valid-token");
      expect(mapResumeId).not.toHaveBeenCalled();
    });

    it("should return 401 when request body is empty", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/resume/map-id",
        {
          method: "POST",
          headers: { Authorization: "Bearer valid-token" },
          body: "",
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      expect(adminAuth.verifyIdToken).toHaveBeenCalledWith("valid-token");
      expect(mapResumeId).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid JSON in request body", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/resume/map-id",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer valid-token",
            "Content-Type": "application/json",
          },
          body: "invalid json",
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      expect(adminAuth.verifyIdToken).toHaveBeenCalledWith("valid-token");
      expect(mapResumeId).not.toHaveBeenCalled();
    });

    it("should return 401 when request body is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/resume/map-id",
        {
          method: "POST",
          headers: { Authorization: "Bearer valid-token" },
          body: null,
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      expect(adminAuth.verifyIdToken).toHaveBeenCalledWith("valid-token");
      expect(mapResumeId).not.toHaveBeenCalled();
    });
  });

  describe("Successful mapping", () => {
    beforeEach(() => {
      (adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({
        uid: "test-user-123",
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
          headers: { Authorization: "Bearer valid-token" },
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
      expect(adminAuth.verifyIdToken).toHaveBeenCalledWith("valid-token");
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
          headers: { Authorization: "Bearer valid-token" },
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
      (adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({
        uid: "test-user-123",
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
          headers: { Authorization: "Bearer valid-token" },
          body: JSON.stringify({ resumeId: 123, documentId: "doc-123" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create resume ID mapping");
      expect(data.details).toBe("Database connection failed");
      expect(adminAuth.verifyIdToken).toHaveBeenCalledWith("valid-token");
      expect(mapResumeId).toHaveBeenCalledWith(123, "doc-123", "test-user-123");
    });

    it("should handle unknown errors", async () => {
      (mapResumeId as jest.Mock).mockRejectedValue("String error");

      const request = new NextRequest(
        "http://localhost:3000/api/resume/map-id",
        {
          method: "POST",
          headers: { Authorization: "Bearer valid-token" },
          body: JSON.stringify({ resumeId: 123, documentId: "doc-123" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create resume ID mapping");
      expect(data.details).toBe("Unknown error");
      expect(mapResumeId).toHaveBeenCalledWith(123, "doc-123", "test-user-123");
    });
  });
});
