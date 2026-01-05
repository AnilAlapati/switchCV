/**
 * Tests for /api/profiles/check-access route
 */

import { GET } from "@/app/api/profiles/check-access/route";
import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";

// Mock api-helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest
    .fn()
    .mockResolvedValue({ userId: "test-user-123", error: null }),
  handleApiError: jest.requireActual("@/lib/utils/api-helpers").handleApiError,
}));

// Mock Firebase admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        collection: jest.fn(() => ({
          where: jest.fn(() => ({
            get: jest.fn(),
          })),
        })),
      })),
    })),
  },
}));

// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";

const mockCollection = adminDb.collection as jest.MockedFunction<
  typeof adminDb.collection
>;
const mockDoc = jest.fn();
const mockGet = jest.fn();
const mockSubCollection = jest.fn();
const mockWhere = jest.fn();
const mockSubGet = jest.fn();

mockCollection.mockReturnValue({
  doc: mockDoc,
} as any);

mockDoc.mockReturnValue({
  get: mockGet,
  collection: mockSubCollection,
} as any);

mockSubCollection.mockReturnValue({
  where: mockWhere,
} as any);

mockWhere.mockReturnValue({
  get: mockSubGet,
} as any);

describe("GET /api/profiles/check-access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "owner-123", published: false }),
    });
    mockSubGet.mockResolvedValue({
      empty: true,
      docs: [],
    });
  });

  it("should return 400 if resumeId is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Resume ID is required");
  });

  it("should return 404 if resume doesn't exist", async () => {
    mockGet.mockResolvedValue({
      exists: false,
      data: () => undefined,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=non-existent"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Resume not found");
  });

  it("should grant access to resume owner", async () => {
    // Mock current user as owner
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "owner-123",
      error: null,
    });

    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "owner-123", published: false }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=resume-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAccess).toBe(true);
    expect(data.accessType).toBe("owner");
  });

  it("should grant access for published resumes", async () => {
    // Mock current user as NOT owner
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "viewer-123",
      error: null,
    });

    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "owner-123", published: true }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=resume-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAccess).toBe(true);
    expect(data.accessType).toMatch(/(public|published)/);
  });

  it("should grant access with valid access grant", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "viewer-123",
      error: null,
    });

    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "owner-123", published: false }),
    });

    mockSubGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "grant-123",
          data: () => ({
            toUserId: "viewer-123",
            expiresAt: new Date(Date.now() + 86400000), // Future
          }),
        },
      ],
    });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=resume-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAccess).toBe(true);
    expect(data.accessType).toBe("granted");
  });

  it("should deny access without grant or published status", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "viewer-123",
      error: null,
    });

    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "owner-123", published: false }),
    });

    mockSubGet.mockResolvedValue({
      empty: true,
      docs: [],
    });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=resume-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAccess).toBe(false);
  });

  it("should deny access if grant is expired", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "viewer-123",
      error: null,
    });

    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "owner-123", published: false }),
    });

    mockSubGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "grant-123",
          data: () => ({
            toUserId: "viewer-123",
            expiresAt: new Date(Date.now() - 86400000), // Past
          }),
        },
      ],
    });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=resume-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAccess).toBe(false);
    expect(data.message).toContain("expired");
  });

  it("should handle database errors gracefully", async () => {
    mockGet.mockRejectedValue(new Error("Database connection error"));

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=resume-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to check access");
  });

  it("should include accessDuration in response when grant exists", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "viewer-123",
      error: null,
    });

    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ userId: "owner-123", published: false }),
    });

    mockSubGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "grant-123",
          data: () => ({
            toUserId: "viewer-123",
            expiresAt: new Date(Date.now() + 86400000),
            duration: "1week",
          }),
        },
      ],
    });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=resume-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAccess).toBe(true);
    expect(data.duration).toBe("1week");
  });
});
