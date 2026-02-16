/**
 * @jest-environment node
 */

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

// Mock tokenGenerator
jest.mock("@/lib/tokenGenerator", () => ({
  tokenGenerator: {
    generateToken: jest.fn().mockReturnValue({
      token: "mock-jwt-token-12345",
      tokenHash: "mock-hash-12345",
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    }),
  },
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

describe("POST /api/recruiters/approve-contact", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
    const { NextResponse } = require("next/server");
    getAuthenticatedUserId.mockResolvedValueOnce({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/approve-contact",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "request-123",
          adminUserId: "admin-123",
        }),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when requestId is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/approve-contact",
      {
        method: "POST",
        body: JSON.stringify({ adminUserId: "admin-123" }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });

  it("should return 403 when adminUserId does not match authenticated user", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/approve-contact",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "request-123",
          adminUserId: "different-admin", // Different from authenticated user
        }),
      }
    );

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

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/approve-contact",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "request-123",
          adminUserId: "admin-123",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Only admins can approve");
  });

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
        data: () => null,
      });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/approve-contact",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "nonexistent-request",
          adminUserId: "admin-123",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Request not found");
  });

  it("should return 400 when request is already approved", async () => {
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
          id: "request-123",
          status: "approved",
          fromRecruiter: {
            recruiterId: "recruiter-123",
            name: "John Doe",
            email: "john@example.com",
            companyName: "Tech Corp",
          },
          toUserId: "user-456",
          toUserEmail: "user@example.com",
          requestedFields: ["email", "phone"],
          proposedDuration: "1day",
        }),
      });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/approve-contact",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "request-123",
          adminUserId: "admin-123",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Request status is not pending");
  });

  it("should successfully approve contact request", async () => {
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
          id: "request-123",
          status: "pending",
          fromRecruiter: {
            recruiterId: "recruiter-123",
            name: "John Doe",
            email: "john@example.com",
            companyName: "Tech Corp",
          },
          toUserId: "user-456",
          toUserEmail: "user@example.com",
          requestedFields: ["email", "phone"],
          proposedDuration: "1day",
          purpose: "Hiring for senior developer position",
        }),
      });

    const mockTokenRef = { id: "token-123", update: mockUpdate };
    mockAdd.mockResolvedValue(mockTokenRef);
    mockUpdate.mockResolvedValue(undefined);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/approve-contact",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "request-123",
          adminUserId: "admin-123",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.tokenId).toBe("token-123");
    expect(data.duration).toBe("1day");
    expect(mockAdd).toHaveBeenCalledTimes(4); // token + recruiter notification + candidate notification + audit log
    expect(mockUpdate).toHaveBeenCalledTimes(2); // token update + request update
  });

  it("should handle different durations correctly", async () => {
    const testCases = [
      { duration: "1hour", expectedSeconds: 3600 },
      { duration: "1day", expectedSeconds: 86400 },
      { duration: "1week", expectedSeconds: 604800 },
      { duration: "30days", expectedSeconds: 2592000 },
    ];

    for (const { duration, expectedSeconds } of testCases) {
      jest.clearAllMocks();

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
            id: "request-123",
            status: "pending",
            fromRecruiter: {
              recruiterId: "recruiter-123",
              name: "John Doe",
              email: "john@example.com",
              companyName: "Tech Corp",
            },
            toUserId: "user-456",
            toUserEmail: "user@example.com",
            requestedFields: ["email", "phone"],
            proposedDuration: "1day",
          }),
        });

      const mockTokenRef = { id: "token-123", update: mockUpdate };
      mockAdd.mockResolvedValue(mockTokenRef);
      mockUpdate.mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiters/approve-contact",
        {
          method: "POST",
          body: JSON.stringify({
            requestId: "request-123",
            adminUserId: "admin-123",
            duration,
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.duration).toBe(duration);
      expect(data.durationSeconds).toBe(expectedSeconds);
    }
  });

  it("should handle database errors gracefully", async () => {
    // Mock admin user exists with admin role
    mockGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ role: "admin" }),
      })
      // Mock database error
      .mockRejectedValueOnce(new Error("Database connection failed"));

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/approve-contact",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: "request-123",
          adminUserId: "admin-123",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to approve contact request");
  });
});
