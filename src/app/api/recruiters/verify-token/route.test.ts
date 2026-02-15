/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { GET } from "./route";
import { tokenGenerator } from "@/lib/tokenGenerator";

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    update: jest.fn(),
  },
  __esModule: true,
  default: {
    firestore: {
      FieldValue: {
        serverTimestamp: jest.fn(() => "mock-timestamp"),
      },
    },
  },
}));

// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";

jest.mock("@/lib/tokenGenerator", () => ({
  tokenGenerator: {
    verifyToken: jest.fn(),
    isExpired: jest.fn(),
    getRemainingTime: jest.fn(),
    getReadableTimeRemaining: jest.fn(),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  handleApiError: jest.fn((error, message, status = 500) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: message, details: error?.message }, { status });
  }),
  getAuthenticatedUserId: jest.fn().mockResolvedValue({ userId: "recruiter-123" }),
}));

// Mock Zod schema validation
jest.mock("@/lib/schemas/api", () => ({
  VerifyRecruiterTokenSchema: {
    safeParse: jest.fn((data: any) => {
      if (!data.token && !data.tokenId) {
        return { success: false, error: { issues: [{ message: "Token or tokenId is required" }] } };
      }
      return { success: true, data };
    }),
  },
}));

const mockVerifyToken = tokenGenerator.verifyToken as jest.Mock;
const mockIsExpired = tokenGenerator.isExpired as jest.Mock;
const mockGetRemainingTime = tokenGenerator.getRemainingTime as jest.Mock;
const mockGetReadableTimeRemaining = tokenGenerator.getReadableTimeRemaining as jest.Mock;

describe("GET /api/recruiters/verify-token", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyToken.mockReturnValue({ valid: false });
    mockIsExpired.mockReturnValue(false);
    mockGetRemainingTime.mockReturnValue(3600);
    mockGetReadableTimeRemaining.mockReturnValue("1 hour");

    ((adminDb as any).get as jest.Mock).mockResolvedValue({ exists: false });
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

  it("should successfully verify valid token", async () => {
    const mockTokenData = {
      tokenId: "token-123",
      recruiterId: "recruiter-123",
      userId: "user-456",
      accessFields: ["email", "phone"],
      accessType: "read-only",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      issuedAt: Math.floor(Date.now() / 1000),
      usageCount: 5,
      isRevoked: false,
    };

    ((adminDb as any).get as jest.Mock).mockResolvedValue({
      exists: true,
      data: () => mockTokenData,
    });

    mockVerifyToken.mockReturnValue({
      valid: true,
      payload: {
        tokenId: "token-123",
        recruiterId: "recruiter-123",
        userId: "user-456",
        accessFields: ["email", "phone"],
        expiresAt: mockTokenData.expiresAt,
        issuedAt: mockTokenData.issuedAt,
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
    expect(data.usageCount).toBe(5);
    expect((adminDb as any).update).toHaveBeenCalled();
  });

  it("should verify token using tokenId-only flow", async () => {
    const mockTokenData = {
      tokenId: "token-123",
      recruiterId: "recruiter-123",
      userId: "user-456",
      resumeId: "resume-789",
      accessFields: ["email", "phone"],
      accessType: "read-only",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      issuedAt: Math.floor(Date.now() / 1000),
      usageCount: 2,
      isRevoked: false,
    };

    ((adminDb as any).get as jest.Mock).mockResolvedValue({
      exists: true,
      data: () => mockTokenData,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/verify-token?tokenId=token-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.verified).toBe(true);
    expect(data.tokenId).toBe("token-123");
    expect(data.recruiterId).toBe("recruiter-123");
    expect(data.userId).toBe("user-456");
    expect(data.resumeId).toBe("resume-789");
    expect((adminDb as any).update).toHaveBeenCalled();
  });

  it("should verify a valid raw token without tokenId", async () => {
    const now = Math.floor(Date.now() / 1000);
    mockVerifyToken.mockReturnValue({
      valid: true,
      payload: {
        tokenId: "embedded-token-id",
        recruiterId: "recruiter-123",
        userId: "user-456",
        resumeId: "resume-789",
        accessFields: ["email"],
        issuedAt: now,
        expiresAt: now + 1800,
      },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/verify-token?token=jwt-token"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.verified).toBe(true);
    expect(data.recruiterId).toBe("recruiter-123");
    expect(data.accessFields).toEqual(["email"]);
  });

  it("should return 400 when token and tokenId don't match", async () => {
    mockVerifyToken.mockReturnValue({
      valid: true,
      payload: { tokenId: "different-token", recruiterId: "recruiter-123" },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/verify-token?tokenId=token-123&token=jwt-token"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Token mismatch");
  });

  it("should handle expired tokens", async () => {
    const mockTokenData = {
      tokenId: "token-123",
      recruiterId: "recruiter-123",
      expiresAt: Math.floor(Date.now() / 1000) - 3600,
      isRevoked: false,
    };

    ((adminDb as any).get as jest.Mock).mockResolvedValue({
      exists: true,
      data: () => mockTokenData,
    });

    mockVerifyToken.mockReturnValue({
      valid: true,
      payload: { tokenId: "token-123", recruiterId: "recruiter-123" },
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

  it("should return 403 when authenticated user does not own the token", async () => {
    const mockTokenData = {
      tokenId: "token-123",
      recruiterId: "other-recruiter", // Different from authUserId
      userId: "user-456",
      accessFields: ["email"],
      accessType: "read-only",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      issuedAt: Math.floor(Date.now() / 1000),
      usageCount: 0,
      isRevoked: false,
    };

    ((adminDb as any).get as jest.Mock).mockResolvedValue({
      exists: true,
      data: () => mockTokenData,
    });

    mockVerifyToken.mockReturnValue({
      valid: true,
      payload: {
        tokenId: "token-123",
        recruiterId: "other-recruiter",
        userId: "user-456",
        accessFields: ["email"],
        expiresAt: mockTokenData.expiresAt,
        issuedAt: mockTokenData.issuedAt,
      },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiters/verify-token?tokenId=token-123&token=jwt-token"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden: Token does not belong to authenticated user");
  });
});
