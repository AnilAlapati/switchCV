// Tests for System Analytics API

import { NextRequest } from "next/server";
import { GET } from "./route";
import { adminDb } from "@/lib/firebase-admin";

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

// Mock auth helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn(
    (err, msg) => new Response(JSON.stringify({ error: msg }), { status: 500 })
  ),
}));

import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";

const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;

describe("System Analytics API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({
      userId: null,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/analytics/system"
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("should return 403 if user is not admin or recruiter", async () => {
    const userId = "user123";
    mockGetAuthenticatedUserId.mockResolvedValue({ userId, error: null });

    // Mock user doc with jobseeker role
    const mockUserDoc = {
      exists: true,
      data: () => ({ role: "jobseeker", tier: "basic" }),
    };

    (adminDb.collection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockUserDoc),
      }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/analytics/system"
    );
    const response = await GET(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("Unauthorized");
  });

  it("should return analytics data for admin user", async () => {
    const userId = "admin123";
    mockGetAuthenticatedUserId.mockResolvedValue({ userId, error: null });

    // Mock user doc with admin role
    const mockUserDoc = {
      exists: true,
      data: () => ({ role: "admin", tier: "enterprise" }),
    };

    // Mock Firestore collections
    const mockUsersSnapshot = {
      size: 150,
      forEach: (callback: any) => {
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
      forEach: (callback: any) => {
        callback({ data: () => ({ industry: "Technology" }) });
        callback({ data: () => ({ industry: "Finance" }) });
      },
    };

    const mockAnalyticsSnapshot = {
      size: 250,
      forEach: (callback: any) => {
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
      forEach: (callback: any) => {
        callback({
          data: () => ({
            title: "Software Engineer Resume",
            createdAt: { toDate: () => new Date() },
          }),
        });
      },
    };

    const mockRecentRequests = {
      forEach: (callback: any) => {
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
      "http://localhost:3000/api/analytics/system"
    );
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

  it("should return analytics data for recruiter user", async () => {
    const userId = "recruiter123";
    mockGetAuthenticatedUserId.mockResolvedValue({ userId, error: null });

    // Mock user doc with recruiter role
    const mockUserDoc = {
      exists: true,
      data: () => ({ role: "recruiter", tier: "premium" }),
    };

    // Simplified mocks for recruiter test
    (adminDb.collection as jest.Mock).mockImplementation(() => ({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockUserDoc),
      }),
      get: jest.fn().mockResolvedValue({ size: 0, forEach: () => {} }),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    }));

    const request = new NextRequest(
      "http://localhost:3000/api/analytics/system"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
