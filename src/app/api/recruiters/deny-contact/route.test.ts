import { NextRequest } from "next/server";
import { POST } from "./route";

// Mock Firebase Admin SDK
const mockGet = jest.fn();
const mockAdd = jest.fn();
const mockUpdate = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn();

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: (name: string) => {
      mockCollection(name);
      return {
        doc: (id: string) => {
          mockDoc(id);
          return {
            get: mockGet,
            update: mockUpdate,
          };
        },
        add: mockAdd,
      };
    },
  },
  adminAuth: {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: "admin-123" }),
  },
}));

// Mock api-helpers to return authenticated admin user
jest.mock("@/lib/utils/api-helpers", () => ({
  handleApiError: jest.fn((error, message, status = 500) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json(
      { error: message, details: error?.message },
      { status }
    );
  }),
  getAuthenticatedUserId: jest.fn().mockResolvedValue({ userId: "admin-123" }),
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("POST /api/recruiters/deny-contact", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should return 401 when not authenticated", async () => {
      const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
      const { NextResponse } = require("next/server");
      getAuthenticatedUserId.mockResolvedValueOnce({
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      });

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Not qualified",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 when adminUserId does not match authenticated user", async () => {
      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Not qualified",
          adminUserId: "different-admin", // Different from authenticated user
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("adminUserId must match authenticated user");
    });

    it("should return 403 when user is not an admin", async () => {
      // Mock user doc that is NOT an admin
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ role: "recruiter" }), // Not admin
      });

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Not qualified",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Only admins can deny");
    });
  });

  describe("Validation", () => {
    it("should return 400 when requestId is missing", async () => {
      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          reason: "Not qualified",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });

    it("should return 400 when reason is missing", async () => {
      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });

    it("should return 400 when adminUserId is missing", async () => {
      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Not qualified",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });
  });

  describe("Request Processing", () => {
    it("should return 404 when request does not exist", async () => {
      // Mock admin user exists with admin role
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ role: "admin" }),
        })
        // Mock request not found
        .mockResolvedValueOnce({
          exists: false,
        });

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "nonexistent-123",
          reason: "Not qualified",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Request not found");
    });

    it("should return 400 when request is already processed", async () => {
      // Mock admin user exists with admin role
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ role: "admin" }),
        })
        // Mock request already approved
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            status: "approved",
            fromRecruiter: {
              recruiterId: "recruiter-123",
              email: "recruiter@test.com",
            },
            toUserId: "user-456",
            toUserEmail: "user@test.com",
          }),
        });

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Not qualified",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Request is already approved");
    });
  });

  describe("Successful Denial", () => {
    it("should successfully deny contact request and create notification", async () => {
      // Mock admin user exists with admin role
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ role: "admin" }),
        })
        // Mock pending request
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            status: "pending",
            fromRecruiter: {
              recruiterId: "recruiter-123",
              email: "recruiter@test.com",
            },
            toUserId: "user-456",
            toUserEmail: "user@test.com",
          }),
        });

      mockUpdate.mockResolvedValue(undefined);
      mockAdd.mockResolvedValue({ id: "notification-123" });

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Candidate not interested in opportunities",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.requestId).toBe("req-123");
      expect(data.status).toBe("denied");
      expect(data.message).toBe("Request denied. Recruiter has been notified.");

      // Verify update and add were called
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockAdd).toHaveBeenCalledTimes(2); // Notification and audit log
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors during admin check", async () => {
      mockGet.mockRejectedValueOnce(new Error("Database connection failed"));

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Not qualified",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to deny contact request");
      expect(data.details).toBe("Database connection failed");
    });

    it("should handle database errors during request fetch", async () => {
      // Mock admin user exists
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ role: "admin" }),
        })
        // Mock database error
        .mockRejectedValueOnce(new Error("Database connection failed"));

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Not qualified",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to deny contact request");
      expect(data.details).toBe("Database connection failed");
    });

    it("should handle database errors during request update", async () => {
      // Mock admin user exists
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ role: "admin" }),
        })
        // Mock pending request
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            status: "pending",
            fromRecruiter: {
              recruiterId: "recruiter-123",
              email: "recruiter@test.com",
            },
            toUserId: "user-456",
            toUserEmail: "user@test.com",
          }),
        });

      mockUpdate.mockRejectedValueOnce(new Error("Update failed"));

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Not qualified",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to deny contact request");
      expect(data.details).toBe("Update failed");
    });

    it("should handle notification creation errors gracefully", async () => {
      // Mock admin user exists
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ role: "admin" }),
        })
        // Mock pending request
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            status: "pending",
            fromRecruiter: {
              recruiterId: "recruiter-123",
              email: "recruiter@test.com",
            },
            toUserId: "user-456",
            toUserEmail: "user@test.com",
          }),
        });

      mockUpdate.mockResolvedValue(undefined);
      mockAdd.mockRejectedValueOnce(new Error("Notification failed"));

      const request = new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          requestId: "req-123",
          reason: "Not qualified",
          adminUserId: "admin-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to deny contact request");
      expect(data.details).toBe("Notification failed");
    });
  });
});
