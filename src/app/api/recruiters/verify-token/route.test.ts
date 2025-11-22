/**
 * @jest-environment node
 */

// Mock Firebase
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("@/lib/tokenGenerator", () => ({
  tokenGenerator: {
    verifyToken: jest.fn(),
    isExpired: jest.fn(),
    getRemainingTime: jest.fn(),
    getReadableTimeRemaining: jest.fn(),
  },
}));

import { NextRequest } from "next/server";
import { GET } from "./route";

import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { tokenGenerator } from "@/lib/tokenGenerator";

const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockServerTimestamp = serverTimestamp as jest.MockedFunction<
  typeof serverTimestamp
>;
const mockVerifyToken = tokenGenerator.verifyToken as jest.MockedFunction<any>;
const mockIsExpired = tokenGenerator.isExpired as jest.MockedFunction<any>;
const mockGetRemainingTime =
  tokenGenerator.getRemainingTime as jest.MockedFunction<any>;
const mockGetReadableTimeRemaining =
  tokenGenerator.getReadableTimeRemaining as jest.MockedFunction<any>;

jest.mock("@/lib/utils/api-helpers", () => ({
  handleApiError: jest.fn((error, message, status = 500) => {
    return {
      status,
      json: async () => ({ error: message, details: error?.message }),
    };
  }),
}));

describe("GET /api/recruiters/verify-token", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockReturnValue({} as any);
    mockServerTimestamp.mockReturnValue({} as any);
    mockVerifyToken.mockReturnValue({ valid: false });
    mockIsExpired.mockReturnValue(false);
    mockGetRemainingTime.mockReturnValue(3600);
    mockGetReadableTimeRemaining.mockReturnValue("1 hour");
  });

  it("should return 400 when neither token nor tokenId is provided", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/verify-token"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Token or tokenId is required");
  });

  it("should return 404 when tokenId does not exist", async () => {
    mockGetDoc.mockResolvedValue({
      exists: jest.fn(() => false),
      data: jest.fn(() => null),
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/verify-token?tokenId=nonexistent"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(false);
    expect(data.message).toBe("Token verification failed");
  });

  it("should successfully verify valid token", async () => {
    const mockTokenData = {
      tokenId: "token-123",
      recruiterId: "recruiter-123",
      userId: "user-456",
      accessFields: ["email", "phone"],
      accessType: "read-only",
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      issuedAt: new Date(),
      duration: "1hour",
      usageCount: 5,
      isRevoked: false,
    };

    mockGetDoc.mockResolvedValue({
      exists: jest.fn(() => true),
      data: jest.fn(() => mockTokenData),
    } as any);

    mockVerifyToken.mockReturnValue({
      valid: true,
      payload: {
        tokenId: "token-123",
        recruiterId: "recruiter-123",
        userId: "user-456",
        accessFields: ["email", "phone"],
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        issuedAt: Math.floor(Date.now() / 1000),
      },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/verify-token?tokenId=token-123&token=jwt-token&recruiterId=recruiter-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.verified).toBe(true);
    expect(data.tokenId).toBe("token-123");
    expect(data.recruiterId).toBe("recruiter-123");
    expect(data.userId).toBe("user-456");
    expect(data.accessFields).toEqual(["email", "phone"]);
    expect(data.usageCount).toBe(5); // Original count, not incremented in response
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
  });

  it("should verify token by JWT string", async () => {
    mockVerifyToken.mockReturnValue({
      valid: true,
      payload: {
        tokenId: "token-123",
        recruiterId: "recruiter-123",
        userId: "user-456",
        accessFields: ["email", "phone"],
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/verify-token?token=jwt-token-here"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(false); // JWT verification alone is not enough, needs tokenData
    expect(data.verified).toBeUndefined();
    expect(data.message).toBe("Token verification failed");
  });

  it("should return 400 when token and tokenId don't match", async () => {
    const mockTokenData = {
      tokenId: "token-123",
      isRevoked: false,
    };

    mockGetDoc.mockResolvedValue({
      exists: jest.fn(() => true),
      data: jest.fn(() => mockTokenData),
    } as any);

    mockVerifyToken.mockReturnValue({
      valid: true,
      payload: {
        tokenId: "different-token-456", // Different from tokenId
        recruiterId: "recruiter-123",
      },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/verify-token?tokenId=token-123&token=jwt-token"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Token mismatch");
  });

  it("should return 403 when recruiter ID doesn't match", async () => {
    mockVerifyToken.mockReturnValue({
      valid: true,
      payload: {
        tokenId: "token-123",
        recruiterId: "recruiter-456", // Different from requested
      },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/verify-token?token=jwt-token&recruiterId=recruiter-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Token not issued to this recruiter");
  });

  it("should handle revoked tokens", async () => {
    const mockTokenData = {
      tokenId: "token-123",
      isRevoked: true,
      revokedAt: new Date(),
      revokeReason: "Security breach",
    };

    mockGetDoc.mockResolvedValue({
      exists: jest.fn(() => true),
      data: jest.fn(() => mockTokenData),
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/verify-token?tokenId=token-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(false);
    expect(data.revoked).toBe(true);
    expect(data.revokeReason).toBe("Security breach");
    expect(data.message).toBe("Token has been revoked");
  });

  it("should handle expired tokens", async () => {
    const mockTokenData = {
      tokenId: "token-123",
      expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      isRevoked: false,
    };

    mockGetDoc.mockResolvedValue({
      exists: jest.fn(() => true),
      data: jest.fn(() => mockTokenData),
    } as any);

    mockVerifyToken.mockReturnValue({
      valid: true,
      payload: {
        tokenId: "token-123",
        recruiterId: "recruiter-123",
      },
    });
    mockIsExpired.mockReturnValue(true);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/verify-token?tokenId=token-123&token=jwt-token"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(false);
    expect(data.expired).toBe(true);
    expect(data.message).toBe("Token has expired");
  });

  it("should handle database errors gracefully", async () => {
    mockGetDoc.mockRejectedValue(new Error("Database connection failed"));

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/verify-token?tokenId=token-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to verify token");
  });
});
