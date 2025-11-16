/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { POST } from "./route";

// Mock Firebase
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn(),
  serverTimestamp: jest.fn(),
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
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue({} as any);
    mockDoc.mockReturnValue({} as any);
    mockServerTimestamp.mockReturnValue({} as any);
    mockGenerateToken.mockReturnValue({
      token: "mock-jwt-token-12345",
      tokenHash: "mock-hash-12345",
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    });
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
  });

  it("should successfully approve contact request", async () => {
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

    mockGetDoc.mockResolvedValue(mockRequestDoc as any);
    mockAddDoc.mockResolvedValue({ id: "token-123" } as any);

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
    expect(mockGenerateToken).toHaveBeenCalled();
    expect(mockAddDoc).toHaveBeenCalledTimes(4);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
  });

  it("should handle different durations correctly", async () => {
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
    mockAddDoc.mockResolvedValue({ id: "token-123" } as any);

    const testCases = [
      { duration: "1hour", expectedSeconds: 3600 },
      { duration: "1day", expectedSeconds: 86400 },
      { duration: "1week", expectedSeconds: 604800 },
      { duration: "30days", expectedSeconds: 2592000 },
    ];

    for (const { duration, expectedSeconds } of testCases) {
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
  });
});
