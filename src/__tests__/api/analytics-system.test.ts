import { GET } from "@/app/api/analytics/system/route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

jest.mock("@/lib/logger");
jest.mock("@/lib/services/analyticsService", () => ({
  getSystemAnalytics: jest.fn(),
}));
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
      })),
      get: jest.fn(),
      orderBy: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
    })),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => ({
    status: status || 500,
    json: async () => ({ error: msg }),
  })),
  validateCorsRequest: jest.fn(() => null),
}));

import { getSystemAnalytics } from "@/lib/services/analyticsService";

describe("System Analytics API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = () => {
    const req = new NextRequest(
      new URL("http://localhost:3000/api/analytics/system"),
      {
        method: "GET",
      }
    );
    // Add nextUrl for CORS validation
    Object.defineProperty(req, "nextUrl", {
      value: { pathname: "/api/analytics/system" },
      writable: true,
      configurable: true,
    });
    return req;
  };

  it("should return 401 if not authenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const req = createRequest();
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it("should return 404 if user not found", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
      error: null,
    });

    (getSystemAnalytics as jest.Mock).mockRejectedValue(
      new Error("User not found")
    );

    (adminDb.collection as jest.Mock).mockReturnValue({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ exists: false }),
      })),
    });

    const req = createRequest();
    const response = await GET(req);
    expect(response.status).toBe(404);
  });

  it("should return 403 if user is not admin or recruiter", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
      error: null,
    });

    (getSystemAnalytics as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    (adminDb.collection as jest.Mock).mockReturnValue({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ role: "jobseeker" }),
        }),
      })),
    });

    const req = createRequest();
    const response = await GET(req);
    expect(response.status).toBe(403);
  });

  it("should return system analytics successfully", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "admin-123",
      error: null,
    });

    // Mock getSystemAnalytics to return expected data
    (getSystemAnalytics as jest.Mock).mockResolvedValue({
      totalUsers: 3,
      totalResumes: 3,
      activeRecruiters: 2,
      totalViews: 10,
      averageAttractiveness: 80,
      subscriptionDistribution: {
        basic: 0,
        premium: 1,
        enterprise: 1,
      },
      topIndustries: [
        { name: "Tech", count: 5 },
        { name: "Finance", count: 3 },
        { name: "Other", count: 2 },
      ],
      recentActivity: [],
    });

    const mockUsers = [
      {
        data: () => ({
          role: "recruiter",
          lastLoginAt: { toDate: () => new Date() },
          tier: "premium",
        }),
      },
      { data: () => ({ role: "jobseeker", tier: "basic" }) },
      {
        data: () => ({
          role: "admin",
          tier: "enterprise",
          lastLoginAt: { toDate: () => new Date() },
        }),
      },
    ];

    const mockResumes = [
      {
        data: () => ({
          industry: "Tech",
          title: "Resume 1",
          createdAt: { toDate: () => new Date() },
        }),
      },
      {
        data: () => ({
          targetIndustry: "Finance",
          title: "Resume 2",
          createdAt: { toDate: () => new Date() },
        }),
      },
      {
        data: () => ({
          title: "Resume 3",
          createdAt: { toDate: () => new Date() },
        }),
      },
    ];

    const mockAnalytics = [
      { data: () => ({ viewCount: 10, attractivenessScore: 80 }) },
    ];

    const mockContactRequests = [
      {
        data: () => ({
          status: "pending",
          createdAt: { toDate: () => new Date() },
        }),
      },
    ];

    (adminDb.collection as jest.Mock).mockImplementation((col) => {
      if (col === "users") {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "admin" }),
            }),
          })),
          get: jest.fn().mockResolvedValue({
            size: 3,
            forEach: (cb: any) => mockUsers.forEach(cb),
          }),
        };
      }
      if (col === "resumes") {
        return {
          get: jest.fn().mockResolvedValue({
            size: 3,
            forEach: (cb: any) => mockResumes.forEach(cb),
          }),
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                forEach: (cb: any) => mockResumes.forEach(cb),
              }),
            })),
          })),
        };
      }
      if (col === "analytics") {
        return {
          get: jest.fn().mockResolvedValue({
            forEach: (cb: any) => mockAnalytics.forEach(cb),
          }),
        };
      }
      if (col === "contactRequests") {
        return {
          get: jest.fn().mockResolvedValue({
            size: 1,
            forEach: (cb: any) => mockContactRequests.forEach(cb),
          }),
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                forEach: (cb: any) => mockContactRequests.forEach(cb),
              }),
            })),
          })),
        };
      }
    });

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    if (response.status !== 200) {
      console.log(
        "Analytics system test error:",
        JSON.stringify(data, null, 2)
      );
    }

    expect(response.status).toBe(200);
    expect(data.totalUsers).toBe(3);
    expect(data.totalResumes).toBe(3);
    expect(data.activeRecruiters).toBe(2);
    expect(data.totalViews).toBe(10);
    expect(data.averageAttractiveness).toBe(80);
    expect(data.subscriptionDistribution.premium).toBe(1);
    expect(data.subscriptionDistribution.enterprise).toBe(1);
    expect(data.topIndustries[0].name).toBe("Tech");
    expect(data.topIndustries[1].name).toBe("Finance");
    expect(data.topIndustries[2].name).toBe("Other");
  });

  it("should handle errors", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "admin-123",
      error: null,
    });
    (getSystemAnalytics as jest.Mock).mockRejectedValue(
      new Error("Database error")
    );
    (adminDb.collection as jest.Mock).mockImplementation(() => {
      throw new Error("DB error");
    });

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to fetch system analytics");
  });
});
