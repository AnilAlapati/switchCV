import { NextRequest } from "next/server";
import {
  getAuthenticatedUserId,
  maybeGetAuthenticatedUserId,
  fetchResumeDocument,
  handleApiError,
  verifyResumeOwnership,
} from "./api-helpers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

// Mock NextRequest and NextResponse
jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");
  return {
    ...actual,
    NextResponse: {
      json: jest.fn((body, init) => ({
        body,
        status: init?.status || 200,
        json: async () => body,
      })),
    },
  };
});

// Mock firebase-admin
jest.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
  adminDb: {
    collection: jest.fn(),
  },
}));

describe("api-helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAuthenticatedUserId", () => {
    it("should return error if no authorization header", async () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest;

      const result = await getAuthenticatedUserId(req);
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(401);
    });

    it("should return error if authorization header is invalid", async () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue("InvalidToken"),
        },
      } as unknown as NextRequest;

      const result = await getAuthenticatedUserId(req);
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(401);
    });

    it("should return userId if token is valid", async () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue("Bearer valid-token"),
        },
      } as unknown as NextRequest;

      (adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({
        uid: "user-123",
      });

      const result = await getAuthenticatedUserId(req);
      expect(result.userId).toBe("user-123");
      expect(result.error).toBeUndefined();
    });

    it("should return error if token verification fails", async () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue("Bearer invalid-token"),
        },
      } as unknown as NextRequest;

      (adminAuth.verifyIdToken as jest.Mock).mockRejectedValue(
        new Error("Invalid token")
      );

      const result = await getAuthenticatedUserId(req);
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(401);
    });
  });

  describe("maybeGetAuthenticatedUserId", () => {
    it("should return null if no authorization header", async () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest;

      const result = await maybeGetAuthenticatedUserId(req);
      expect(result).toBeNull();
    });

    it("should return userId if token is valid", async () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue("Bearer valid-token"),
        },
      } as unknown as NextRequest;

      (adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({
        uid: "user-123",
      });

      const result = await maybeGetAuthenticatedUserId(req);
      expect(result).toBe("user-123");
    });

    it("should return null if token verification fails", async () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue("Bearer invalid-token"),
        },
      } as unknown as NextRequest;

      (adminAuth.verifyIdToken as jest.Mock).mockRejectedValue(
        new Error("Invalid token")
      );

      const result = await maybeGetAuthenticatedUserId(req);
      expect(result).toBeNull();
    });
  });

  describe("fetchResumeDocument", () => {
    const mockDoc = (exists: boolean, data: any) => ({
      exists,
      data: jest.fn().mockReturnValue(data),
      get: jest.fn().mockResolvedValue({
        exists,
        data: jest.fn().mockReturnValue(data),
      }),
    });

    it("should fetch from resumes collection if exists", async () => {
      const mockGet = jest.fn().mockResolvedValue(mockDoc(true, { id: "1" }));
      const mockDocRef = { get: mockGet };
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef),
      });

      const result = await fetchResumeDocument("1");
      expect(adminDb.collection).toHaveBeenCalledWith("resumes");
      expect(result).not.toBeNull();
      expect(result?.data).toEqual({ id: "1" });
    });

    it("should fallback to resumeProfiles collection if not in resumes", async () => {
      const mockGetResumes = jest
        .fn()
        .mockResolvedValue(mockDoc(false, undefined));
      const mockGetProfiles = jest
        .fn()
        .mockResolvedValue(mockDoc(true, { id: "1" }));

      (adminDb.collection as jest.Mock).mockImplementation((collection) => {
        if (collection === "resumes") {
          return { doc: jest.fn().mockReturnValue({ get: mockGetResumes }) };
        }
        if (collection === "resumeProfiles") {
          return { doc: jest.fn().mockReturnValue({ get: mockGetProfiles }) };
        }
        return { doc: jest.fn() };
      });

      const result = await fetchResumeDocument("1");
      expect(adminDb.collection).toHaveBeenCalledWith("resumes");
      expect(adminDb.collection).toHaveBeenCalledWith("resumeProfiles");
      expect(result).not.toBeNull();
      expect(result?.data).toEqual({ id: "1" });
    });

    it("should return null if not found in either collection", async () => {
      const mockGet = jest.fn().mockResolvedValue(mockDoc(false, undefined));
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet }),
      });

      const result = await fetchResumeDocument("1");
      expect(result).toBeNull();
    });
  });

  describe("handleApiError", () => {
    it("should return 500 status by default", () => {
      const error = new Error("Test error");
      const response = handleApiError(error);
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: "Internal server error",
        details: "Test error",
      });
    });

    it("should return custom status and message", () => {
      const error = "Some string error";
      const response = handleApiError(error, "Custom error", 400);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "Custom error",
        details: "Some string error",
      });
    });

    it("should handle non-error objects", () => {
      const response = handleApiError(null);
      // @ts-expect-error - accessing mocked body property
      expect(response.body.details).toBeUndefined();
    });
  });

  describe("verifyResumeOwnership", () => {
    it("should return error if authentication fails", async () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest;

      const result = await verifyResumeOwnership(req, "resume-1");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(401);
      }
    });

    it("should return error if resume not found", async () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue("Bearer valid-token"),
        },
      } as unknown as NextRequest;

      (adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({
        uid: "user-1",
      });

      // Mock fetchResumeDocument to return null
      // Since fetchResumeDocument is exported from the same file, we can't easily mock it if we are testing the file itself.
      // However, we can mock the underlying adminDb calls to simulate not found.
      const mockGet = jest.fn().mockResolvedValue({
        exists: false,
        data: jest.fn(),
      });
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet }),
      });

      const result = await verifyResumeOwnership(req, "resume-1");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(404);
      }
    });

    it("should return error if user does not own resume", async () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue("Bearer valid-token"),
        },
      } as unknown as NextRequest;

      (adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({
        uid: "user-1",
      });

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: jest.fn().mockReturnValue({ userId: "user-2" }),
      });
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet }),
      });

      const result = await verifyResumeOwnership(req, "resume-1");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(403);
      }
    });

    it("should return success if user owns resume", async () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue("Bearer valid-token"),
        },
      } as unknown as NextRequest;

      (adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({
        uid: "user-1",
      });

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: jest.fn().mockReturnValue({ userId: "user-1" }),
      });
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet }),
      });

      const result = await verifyResumeOwnership(req, "resume-1");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userId).toBe("user-1");
        expect(result.resumeData).toEqual({ userId: "user-1" });
      }
    });
  });
});
