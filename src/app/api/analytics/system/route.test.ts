// Tests for System Analytics API

import { NextRequest, NextResponse } from "next/server";
import { GET } from "./route";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

// Mock analytics service
jest.mock("@/lib/services/analyticsService", () => ({
  getSystemAnalytics: jest.fn(),
}));

// Mock user service
jest.mock("@/lib/services/userService", () => ({
  verifyAdminRole: jest.fn(),
}));

// Mock auth helpers
jest.mock("@/lib/utils/api-helpers", () => {

  const { NextResponse } = require("next/server");
  return {
    getAuthenticatedUserId: jest.fn(),
    handleApiError: jest.fn((error, message, status = 500) => {
      const res: Record<string, unknown> = { error: message };
      if (error) {
        res.details = error instanceof Error ? error.message : String(error);
      }
      return NextResponse.json(res, { status });
    }),
    validateCorsRequest: jest.fn(() => null),
  };
});

import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { getSystemAnalytics } from "@/lib/services/analyticsService";
import { verifyAdminRole } from "@/lib/services/userService";

const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;
const mockVerifyAdminRole =
  verifyAdminRole as jest.MockedFunction<typeof verifyAdminRole>;

describe("System Analytics API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({
      userId: undefined,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/analytics/system",
      { headers: { authorization: "Bearer test-token" } }
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("should return 403 if user is not admin", async () => {
    const userId = "user123";
    mockGetAuthenticatedUserId.mockResolvedValue({ userId, error: undefined });
    mockVerifyAdminRole.mockResolvedValue(false);

    const request = new NextRequest(
      "http://localhost:3000/api/analytics/system",
      { headers: { authorization: "Bearer test-token" } }
    );
    const response = await GET(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("Admin access required");
  });

  it("should return analytics data for admin user", async () => {
    const userId = "admin123";
    mockGetAuthenticatedUserId.mockResolvedValue({ userId, error: undefined });
    mockVerifyAdminRole.mockResolvedValue(true);

    // Mock getSystemAnalytics to return expected data
    (getSystemAnalytics as jest.Mock).mockResolvedValue({
      totalUsers: 10,
      totalResumes: 15,
      activeRecruiters: 3,
      totalViews: 100,
      topIndustries: [{ name: "Technology", count: 5 }],
      recentActivity: [],
      subscriptionDistribution: { basic: 5, premium: 3, enterprise: 2 },
    });

    // Mock user doc with admin role
    const mockUserDoc = {
      exists: true,
      data: () => ({ role: "admin", tier: "enterprise" }),
    };

    // Mock Firestore collections
    const mockUsersSnapshot = {
      size: 150,
      forEach: (callback: (doc: { data: () => Record<string, unknown> }) => void) => {
        callback({ data: () => ({ role: "jobseeker", tier: "basic" }) });
        callback({
          data: () => ({
            role: "recruiter",
            tier: "premium",
            lastLoginAt: { toDate: () => new Date() },
          }),
        });
      },
    };

    const mockResumesSnapshot = {
      size: 300,
      forEach: (callback: (doc: { data: () => Record<string, unknown> }) => void) => {
        callback({ data: () => ({ industry: "Technology" }) });
        callback({ data: () => ({ industry: "Finance" }) });
      },
    };

    const mockAnalyticsSnapshot = {
      size: 250,
      forEach: (callback: (doc: { data: () => Record<string, unknown> }) => void) => {
        callback({
          data: () => ({
            viewCount: 100,
            attractivenessScore: 75,
          }),
        });
      },
    };

    const mockContactRequestsSnapshot = {
      size: 50,
    };

    const mockRecentResumes = {
      forEach: (callback: (doc: { data: () => Record<string, unknown> }) => void) => {
        callback({
          data: () => ({
            title: "Software Engineer Resume",
            createdAt: { toDate: () => new Date() },
          }),
        });
      },
    };

    const mockRecentRequests = {
      forEach: (callback: (doc: { data: () => Record<string, unknown> }) => void) => {
        callback({
          data: () => ({
            status: "pending",
            createdAt: { toDate: () => new Date() },
          }),
        });
      },
    };

    (adminDb.collection as jest.Mock).mockImplementation(
      (collectionName: string) => {
        const mockDoc = {
          get: jest.fn().mockResolvedValue(mockUserDoc),
        };

        const mockOrderBy = jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest
              .fn()
              .mockResolvedValue(
                collectionName === "resumes"
                  ? mockRecentResumes
                  : mockRecentRequests
              ),
          }),
        });

        return {
          doc: jest.fn(() => mockDoc),
          get: jest
            .fn()
            .mockResolvedValue(
              collectionName === "users"
                ? mockUsersSnapshot
                : collectionName === "resumes"
                  ? mockResumesSnapshot
                  : collectionName === "analytics"
                    ? mockAnalyticsSnapshot
                    : mockContactRequestsSnapshot
            ),
          orderBy: mockOrderBy,
        };
      }
    );

    const request = new NextRequest(
      "http://localhost:3000/api/analytics/system",
      { headers: { authorization: "Bearer test-token" } }
    );
    Object.defineProperty(request, "nextUrl", {
      value: { pathname: "/api/analytics/system" },
      writable: true,
      configurable: true,
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toHaveProperty("totalUsers");
    expect(data).toHaveProperty("totalResumes");
    expect(data).toHaveProperty("activeRecruiters");
    expect(data).toHaveProperty("totalViews");
    expect(data).toHaveProperty("topIndustries");
    expect(data).toHaveProperty("recentActivity");
    expect(data).toHaveProperty("subscriptionDistribution");
  });

  it("should return 403 for recruiter user (admin-only endpoint)", async () => {
    const userId = "recruiter123";
    mockGetAuthenticatedUserId.mockResolvedValue({ userId, error: undefined });
    mockVerifyAdminRole.mockResolvedValue(false);

    const request = new NextRequest(
      "http://localhost:3000/api/analytics/system",
      { headers: { authorization: "Bearer test-token" } }
    );
    const response = await GET(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("Admin access required");
  });
});
