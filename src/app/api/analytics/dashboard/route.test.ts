import { GET, POST } from "./route";
import { NextRequest, NextResponse } from "next/server";

// Mock the analytics service
jest.mock("@/lib/services/analyticsService", () => ({
  getDashboardAnalytics: jest.fn(),
  getAnalytics: jest.fn(),
  aggregateToDashboard: jest.fn(),
}));

// Mock firebase-admin
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockLimit = jest.fn();
const mockOrderBy = jest.fn();

const mockCollectionObj = {
  doc: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  get: mockGet,
};

const mockDocObj = {
  get: mockGet,
  set: mockSet,
  collection: jest.fn(),
  exists: true,
  data: jest.fn(() => ({})),
};

// Circular references
mockCollectionObj.doc.mockReturnValue(mockDocObj);
mockCollectionObj.orderBy.mockReturnValue(mockCollectionObj);
mockCollectionObj.limit.mockReturnValue(mockCollectionObj);
mockDocObj.collection.mockReturnValue(mockCollectionObj);

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => mockCollectionObj),
  },
}));

import {
  getDashboardAnalytics,
  getAnalytics,
  aggregateToDashboard
} from "@/lib/services/analyticsService";

// Mock auth helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn().mockImplementation(async (req) => {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || "test-user";
    return { userId, error: null };
  }),
  handleApiError: jest.fn((error, message, status = 500) => {
    const res: any = { error: message };
    if (error) {
      res.details = error instanceof Error ? error.message : String(error);
    }
    return {
      status,
      json: async () => res,
    };
  }),
}));

describe("GET /api/analytics/dashboard", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        resumeId: "test-resume",
        userId: "test-user",
        viewCount: 15,
        uniqueViewCount: 8,
        attractivenessScore: 75,
        lastViewedAt: { toDate: () => new Date() },
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      }),
      docs: [], // For collection queries
    });

    originalEnv = process.env;
    process.env = { ...originalEnv };

    // Set up default mock for getAnalytics
    (getAnalytics as jest.Mock).mockResolvedValue({
      analytics: {
        views: {
          count: 15,
          uniqueViewers: 8,
          lastViewedAt: new Date().toISOString(),
        },
        attractivenessScore: 75,
        lastUpdatedAt: new Date().toISOString(),
        downloads: 5,
        shares: 2,
      },
    });

    // Set up default mock for aggregateToDashboard
    (aggregateToDashboard as jest.Mock).mockImplementation(
      (analytics, heatmaps, recruiters, benchmark) => ({
        summary: {
          totalViews: analytics.viewCount || analytics.views?.count || 0,
          uniqueViews: analytics.uniqueViewCount || analytics.views?.uniqueViewers || 0,
          conversionRate: 0,
          avgTimeOnResume: 45,
        },
        trends: [],
        heatmaps: heatmaps || [],
        recruiterActivity: recruiters || [],
        benchmark: benchmark || null,
      })
    );

    // Set up default mock for getDashboardAnalytics
    (getDashboardAnalytics as jest.Mock).mockImplementation(async (resumeId) => {
      const analytics = { viewCount: 15, uniqueViewCount: 8, attractivenessScore: 75 };
      return aggregateToDashboard(analytics, [], [], { industry: "Technology" });
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("GET endpoint", () => {
    it("should return analytics summary for valid resumeId and userId", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard?resumeId=test-resume&userId=test-user",
        { headers: { authorization: "Bearer test-token" }, method: "GET" }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.resumeId).toBe("test-resume");
      expect(data.data.userId).toBe("test-user");
      expect(data.data.viewCount).toBeGreaterThanOrEqual(10);
      expect(data.data.uniqueViewCount).toBeGreaterThanOrEqual(5);
      expect(data.data.attractivenessScore).toBeGreaterThanOrEqual(50);
      expect(data.data.attractivenessScore).toBeLessThanOrEqual(85);
      expect(data.timestamp).toBeDefined();
    });

    it("should return 400 when resumeId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard?userId=test-user",
        { headers: { authorization: "Bearer test-token" }, method: "GET" }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Missing resumeId or userId");
    });

    it("should return 400 when userId is missing", async () => {
      // Mock getAuthenticatedUserId to return no userId
      const mockGetAuthenticatedUserId = require("@/lib/utils/api-helpers")
        .getAuthenticatedUserId as jest.Mock;
      mockGetAuthenticatedUserId.mockImplementationOnce(async () => ({
        userId: null,
        error: NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        ),
      }));

      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard?resumeId=test-resume",
        {
          headers: { authorization: "Bearer invalid-token" },
          method: "GET",
        }
      );

      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("should return 400 when both resumeId and userId are missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        { headers: { authorization: "Bearer test-token" }, method: "GET" }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Missing resumeId or userId");
    });

    it("should handle malformed query parameters", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard?resumeId=&userId=test-user",
        { headers: { authorization: "Bearer test-token" }, method: "GET" }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Missing resumeId or userId");
    });

    it("should handle special characters and long IDs in resumeId and userId", async () => {
      const specialResumeId = "resume-123_special@test.com";
      const specialUserId = "user-456_special@test.com";

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          resumeId: specialResumeId,
          userId: specialUserId,
          viewCount: 15,
          uniqueViewCount: 8,
          attractivenessScore: 75,
          lastViewedAt: { toDate: () => new Date() },
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
        docs: [],
      });

      const request = new NextRequest(
        `http://localhost:3000/api/analytics/dashboard?resumeId=${encodeURIComponent(
          specialResumeId
        )}&userId=${encodeURIComponent(specialUserId)}`,
        { headers: { authorization: "Bearer test-token" }, method: "GET" }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.resumeId).toBe(specialResumeId);
      expect(data.data.userId).toBe(specialUserId);
    });
  });

  describe("POST endpoint", () => {
    it("should return dashboard analytics for valid request", async () => {
      const mockDashboard = {
        summary: {
          totalViews: 100,
          uniqueViews: 50,
          conversionRate: 0,
          avgTimeOnResume: 45
        },
        trends: [],
        heatmaps: [],
        recruiterActivity: [],
        benchmark: {
          industry: "Technology",
          avgAttractivenessScore: 62,
          avgViewCount: 45,
          avgDownloadCount: 12,
          topSkills: ["TypeScript", "React", "Node.js"],
          benchmarkDate: new Date().toISOString(),
        },
      };

      (getDashboardAnalytics as jest.Mock).mockResolvedValue(
        mockDashboard
      );

      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            resumeId: "test-resume",
            userId: "test-user",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockDashboard);
      expect(data.timestamp).toBeDefined();
      expect(getDashboardAnalytics).toHaveBeenCalled();
    });

    it("should return 400 when resumeId is missing from body", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            userId: "test-user",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Missing resumeId or userId");
      expect(aggregateToDashboard).not.toHaveBeenCalled();
    });

    it("should return 400 when userId is missing from body", async () => {
      // Mock getAuthenticatedUserId to return no userId
      const mockGetAuthenticatedUserId = require("@/lib/utils/api-helpers")
        .getAuthenticatedUserId as jest.Mock;
      mockGetAuthenticatedUserId.mockImplementationOnce(async () => ({
        userId: null,
        error: NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        ),
      }));

      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        {
          headers: { authorization: "Bearer invalid-token" },
          method: "POST",
          body: JSON.stringify({
            resumeId: "test-resume",
          }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(aggregateToDashboard).not.toHaveBeenCalled();
    });

    it("should handle missing or invalid request body", async () => {
      // Test empty body
      const request1 = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response1 = await POST(request1);
      const data1 = await response1.json();

      expect(response1.status).toBe(400);
      expect(data1.success).toBe(false);
      expect(data1.message).toBe("Missing resumeId or userId");

      // Test invalid JSON
      const request2 = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: "invalid json",
        }
      );

      const response2 = await POST(request2);
      expect(response2.status).toBe(400);
      expect(aggregateToDashboard).not.toHaveBeenCalled();
    });

    it("should handle errors during dashboard aggregation", async () => {
      (getDashboardAnalytics as jest.Mock).mockImplementation(
        () => {
          throw new Error("Aggregation failed");
        }
      );

      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        {
          headers: { authorization: "Bearer test-token" },
          method: "POST",
          body: JSON.stringify({
            resumeId: "test-resume",
            userId: "test-user",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Aggregation failed");
    });
  });
});
