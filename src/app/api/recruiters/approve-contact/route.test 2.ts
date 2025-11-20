import { NextRequest } from "next/server";
import { POST } from "./route";
import { jest } from "@jest/globals";

// Mock Firebase
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
}));

jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("@/lib/tokenGenerator", () => ({
  tokenGenerator: {
    generateToken: jest.fn(),
  },
}));

import {
  doc,
  updateDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { tokenGenerator } from "@/lib/tokenGenerator";

const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockServerTimestamp = serverTimestamp as jest.MockedFunction<
  typeof serverTimestamp
>;
const mockGenerateToken =
  tokenGenerator.generateToken as jest.MockedFunction<any>;

describe("POST /api/recruiters/approve-contact", () => {
  let callCount = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    callCount = 0;

    // Mock collection calls
    mockCollection.mockImplementation((db: any, collectionName: string) => {
      return { collectionName, db };
    });

    // Mock doc calls
    mockDoc.mockImplementation(
      (db: any, collectionName: string, id: string) => {
        return { collectionName, id, db };
      }
    );

    // Mock serverTimestamp
    mockServerTimestamp.mockReturnValue(new Date());

    // Mock token generation
    mockGenerateToken.mockReturnValue({
      token: "mock-jwt-token-12345",
      tokenHash: "mock-hash-12345",
      expiresAt: Math.floor(Date.now() / 1000) + 86400, // 1 day from now
    });
  });

  describe("Validation Tests", () => {
    it("should return 400 when requestId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiters/approve-contact",
        {
          method: "POST",
          body: JSON.stringify({
            adminUserId: "admin-123",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
      expect(data.required).toEqual(["requestId", "adminUserId"]);
    });

    it("should return 400 when adminUserId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiters/approve-contact",
        {
          method: "POST",
          body: JSON.stringify({
            requestId: "request-123",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
      expect(data.required).toEqual(["requestId", "adminUserId"]);
    });

    it("should return 404 when request does not exist", async () => {
      mockGetDoc.mockResolvedValue({
        exists: jest.fn(() => false),
        data: jest.fn(() => null),
      } as any);

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
      const mockRequestDoc = {
        exists: jest.fn(() => true),
        data: jest.fn(() => ({
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
        })),
      };

      mockGetDoc.mockResolvedValue(mockRequestDoc as any);

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
      expect(data.error).toBe("Request is already approved");
      expect(data.status).toBe("approved");
    });

    it("should return 400 for invalid duration", async () => {
      const mockRequestDoc = {
        exists: jest.fn(() => true),
        data: jest.fn(() => ({
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
        })),
      };

      mockGetDoc.mockResolvedValue(mockRequestDoc as any);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiters/approve-contact",
        {
          method: "POST",
          body: JSON.stringify({
            requestId: "request-123",
            adminUserId: "admin-123",
            duration: "invalid-duration",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid duration");
      expect(data.validDurations).toEqual(["1hour", "1day", "1week", "30days"]);
    });
  });

  describe("Successful Approval Tests", () => {
    const mockRequestDoc = {
      exists: jest.fn(() => true),
      data: jest.fn(() => ({
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
      })),
    };

    beforeEach(() => {
      mockGetDoc.mockResolvedValue(mockRequestDoc as any);
      mockAddDoc.mockResolvedValue({ id: "token-123" } as any);
    });

    it("should successfully approve contact request with default duration", async () => {
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
      expect(data.requestId).toBe("request-123");
      expect(data.duration).toBe("1day");
      expect(data.message).toContain("Contact request approved");

      // Verify token generation was called
      expect(mockGenerateToken).toHaveBeenCalledWith({
        tokenId: "request-123",
        recruiterId: "recruiter-123",
        userId: "user-456",
        resumeId: undefined,
        requestId: "request-123",
        accessFields: ["email", "phone"],
        expiresAt: expect.any(Number),
      });

      // Verify Firestore operations
      expect(mockAddDoc).toHaveBeenCalledTimes(3); // token, recruiter notification, candidate notification, audit log
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1); // update request status
    });

    it("should successfully approve contact request with custom duration", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiters/approve-contact",
        {
          method: "POST",
          body: JSON.stringify({
            requestId: "request-123",
            adminUserId: "admin-123",
            duration: "1week",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.duration).toBe("1week");
    });

    it("should handle 1hour duration correctly", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiters/approve-contact",
        {
          method: "POST",
          body: JSON.stringify({
            requestId: "request-123",
            adminUserId: "admin-123",
            duration: "1hour",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.duration).toBe("1hour");
      expect(data.durationSeconds).toBe(3600); // 1 hour in seconds
    });

    it("should handle 30days duration correctly", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiters/approve-contact",
        {
          method: "POST",
          body: JSON.stringify({
            requestId: "request-123",
            adminUserId: "admin-123",
            duration: "30days",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.duration).toBe("30days");
      expect(data.durationSeconds).toBe(2592000); // 30 days in seconds
    });

    it("should include IP address and user agent in audit log", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiters/approve-contact",
        {
          method: "POST",
          body: JSON.stringify({
            requestId: "request-123",
            adminUserId: "admin-123",
            ipAddress: "192.168.1.100",
            userAgent: "Mozilla/5.0...",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Verify audit log includes IP and user agent
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.objectContaining({ collectionName: "auditLogs" }),
        expect.objectContaining({
          ipAddress: "192.168.1.100",
          userAgent: "Mozilla/5.0...",
        })
      );
    });
  });

  describe("Error Handling Tests", () => {
    it("should handle database errors gracefully", async () => {
      mockGetDoc.mockRejectedValue(new Error("Database connection failed"));

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
      expect(data.message).toBe("Database connection failed");
    });

    it("should handle token generation errors", async () => {
      const mockRequestDoc = {
        exists: jest.fn(() => true),
        data: jest.fn(() => ({
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
        })),
      };

      mockGetDoc.mockResolvedValue(mockRequestDoc as any);
      mockGenerateToken.mockImplementation(() => {
        throw new Error("Token generation failed");
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

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to approve contact request");
      expect(data.message).toBe("Token generation failed");
    });

    it("should handle invalid JSON in request body", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiters/approve-contact",
        {
          method: "POST",
          body: "invalid json",
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to approve contact request");
    });
  });
});
