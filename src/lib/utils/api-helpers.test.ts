import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  maybeGetAuthenticatedUserId,
  fetchResumeDocument,
  handleApiError,
  verifyResumeOwnership,
  safeParseBody,
  applyRateLimit,
  attachRateLimitHeaders,
  getClientIp,
  handleSecureApiError,
  getSecureAuthErrorMessage,
  getSecureFirestoreErrorMessage,
} from "./api-helpers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/utils/rateLimit";

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
        headers: new Map(),
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

// Mock rateLimit
jest.mock("@/lib/utils/rateLimit", () => ({
  checkRateLimit: jest.fn(),
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
        method: "POST",
        nextUrl: { pathname: "/test" },
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
    const mockDoc = (
      exists: boolean,
      data: Record<string, unknown> | undefined,
    ) => ({
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
      });
    });

    it("should return custom status and message", () => {
      const error = "Some string error";
      const response = handleApiError(error, "Custom error", 400);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "Custom error",
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
        nextUrl: { pathname: "/test" },
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
        nextUrl: { pathname: "/test" },
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

  describe("safeParseBody", () => {
    it("should parse valid JSON body", async () => {
      const mockBody = { name: "Test" };
      const req = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
        json: jest.fn().mockResolvedValue(mockBody),
      } as unknown as NextRequest;

      const result = await safeParseBody(req);
      expect(result).toEqual(mockBody);
    });

    it("should throw error if body size exceeds limit", async () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue("2000"),
        },
      } as unknown as NextRequest;

      await expect(safeParseBody(req, 1000)).rejects.toThrow(
        "Request body too large"
      );
    });

    it("should throw SyntaxError if JSON is invalid", async () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
        json: jest.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
      } as unknown as NextRequest;

      await expect(safeParseBody(req)).rejects.toThrow(SyntaxError);
    });

    it("should wrap non-SyntaxError in SyntaxError", async () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
        json: jest.fn().mockRejectedValue(new Error("Generic error")),
      } as unknown as NextRequest;

      await expect(safeParseBody(req)).rejects.toThrow(SyntaxError);
      await expect(safeParseBody(req)).rejects.toThrow("Invalid JSON payload");
    });
  });

  describe("applyRateLimit", () => {
    it("should return allowed: true if within limit", async () => {
      const mockResult = {
        allowed: true,
        limit: 100,
        remaining: 99,
        resetIn: 1000,
      };
      (checkRateLimit as jest.Mock).mockResolvedValue(mockResult);

      const result = await applyRateLimit("user-1");
      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.result).toEqual(mockResult);
      }
    });

    it("should return allowed: false and 429 response if limit exceeded", async () => {
      const mockResult = {
        allowed: false,
        limit: 100,
        remaining: 0,
        resetIn: 5000,
      };
      (checkRateLimit as jest.Mock).mockResolvedValue(mockResult);

      const result = await applyRateLimit("user-1");
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.response.status).toBe(429);
        // @ts-expect-error - accessing mocked body
        expect(result.response.body.error).toBe("Too many requests");
      }
    });
  });

  describe("attachRateLimitHeaders", () => {
    it("should set X-RateLimit headers", () => {
      const response = {
        headers: {
          set: jest.fn(),
        },
      } as unknown as NextResponse;
      const result = {
        limit: 100,
        remaining: 50,
        resetIn: 10000,
      } as any;

      attachRateLimitHeaders(response, result);
      expect(response.headers.set).toHaveBeenCalledWith(
        "X-RateLimit-Limit",
        "100"
      );
      expect(response.headers.set).toHaveBeenCalledWith(
        "X-RateLimit-Remaining",
        "50"
      );
      expect(response.headers.set).toHaveBeenCalledWith(
        "X-RateLimit-Reset",
        expect.any(String)
      );
    });
  });

  describe("getClientIp", () => {
    it("should return IP from x-forwarded-for", () => {
      const req = {
        headers: {
          get: jest.fn().mockImplementation((name) => {
            if (name === "x-forwarded-for") return "1.2.3.4, 5.6.7.8";
            return null;
          }),
        },
      } as unknown as NextRequest;

      expect(getClientIp(req)).toBe("1.2.3.4");
    });

    it("should return IP from x-real-ip if x-forwarded-for is missing", () => {
      const req = {
        headers: {
          get: jest.fn().mockImplementation((name) => {
            if (name === "x-real-ip") return "9.9.9.9";
            return null;
          }),
        },
      } as unknown as NextRequest;

      expect(getClientIp(req)).toBe("9.9.9.9");
    });

    it("should return unknown if no IP headers found", () => {
      const req = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest;

      expect(getClientIp(req)).toBe("unknown");
    });
  });

  describe("handleSecureApiError", () => {
    it("should return generic message and 500 status by default", () => {
      const error = new Error("Secret database error");
      const response = handleSecureApiError(error);
      expect(response.status).toBe(500);
      // @ts-expect-error - accessing mocked body
      expect(response.body.error).toBe(
        "An error occurred processing your request"
      );
    });

    it("should return custom public message and status", () => {
      const error = new Error("Internal error");
      const response = handleSecureApiError(error, {
        publicMessage: "User friendly error",
        status: 400,
      });
      expect(response.status).toBe(400);
      // @ts-expect-error - accessing mocked body
      expect(response.body.error).toBe("User friendly error");
    });

    it("should handle non-Error objects", () => {
      const response = handleSecureApiError({ some: "object" });
      expect(response.status).toBe(500);
    });

    it("should handle string errors", () => {
      const response = handleSecureApiError("string error");
      expect(response.status).toBe(500);
    });

    it("should include requestId in development", () => {
      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = "development";
      const response = handleSecureApiError(new Error("err"));
      // @ts-expect-error - accessing mocked body
      expect(response.body.requestId).toBeDefined();
      (process.env as any).NODE_ENV = originalEnv;
    });

    it("should not log details if logDetails is false", () => {
      const response = handleSecureApiError(new Error("err"), {
        logDetails: false,
      });
      expect(response.status).toBe(500);
    });
  });

  describe("getSecureAuthErrorMessage", () => {
    it("should return specific message for known auth errors", () => {
      expect(getSecureAuthErrorMessage(new Error("auth/user-not-found"))).toBe(
        "Invalid email or password"
      );
      expect(getSecureAuthErrorMessage("auth/too-many-requests")).toBe(
        "Too many login attempts. Please try again later."
      );
    });

    it("should return default message for unknown auth errors", () => {
      expect(getSecureAuthErrorMessage(new Error("auth/unknown-code"))).toBe(
        "Authentication failed. Please try again."
      );
    });
  });

  describe("getSecureFirestoreErrorMessage", () => {
    it("should return specific message for known firestore errors", () => {
      expect(
        getSecureFirestoreErrorMessage(new Error("PERMISSION_DENIED"))
      ).toBe("You do not have permission to perform this action");
      expect(getSecureFirestoreErrorMessage("NOT_FOUND")).toBe(
        "The requested resource was not found"
      );
      expect(getSecureFirestoreErrorMessage("ALREADY_EXISTS")).toBe(
        "This resource already exists"
      );
      expect(getSecureFirestoreErrorMessage("FAILED_PRECONDITION")).toBe(
        "Cannot perform this operation at this time"
      );
      expect(getSecureFirestoreErrorMessage("RESOURCE_EXHAUSTED")).toBe(
        "Service limit exceeded. Please try again later."
      );
      expect(getSecureFirestoreErrorMessage("UNAVAILABLE")).toBe(
        "Service temporarily unavailable. Please try again later."
      );
    });

    it("should return default message for unknown firestore errors", () => {
      expect(getSecureFirestoreErrorMessage(new Error("UNKNOWN_ERROR"))).toBe(
        "Unable to process your request. Please try again."
      );
    });
  });
});
