import { GET, POST } from "./route";
import { NextRequest } from "next/server";

// Mock the analytics service
jest.mock("@/lib/analytics.service", () => ({
  AnalyticsService: {
    generateHeatmap: jest.fn(),
    aggregateToDashboard: jest.fn(),
  },
}));

// Mock the analytics types
jest.mock("@/lib/analytics.types", () => ({
  // Mock types as needed
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

import { AnalyticsService } from "@/lib/analytics.service";

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

    // Set up default mock for aggregateToDashboard
    (AnalyticsService.aggregateToDashboard as jest.Mock).mockImplementation(
      (analytics, heatmaps, recruiters, benchmark) => ({
        resumeId: analytics.resumeId,
        userId: analytics.userId,
        totalViews: analytics.viewCount,
        uniqueViews: analytics.uniqueViewCount,
        attractivenessScore: analytics.attractivenessScore,
        topSections: heatmaps || [],
        topRecruiters: recruiters || [],
        benchmark: benchmark
          ? {
              ...benchmark,
              benchmarkDate:
                benchmark.benchmarkDate?.toISOString() ||
                new Date().toISOString(),
            }
          : null,
      })
    );
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("GET endpoint", () => {
    it("should return analytics summary for valid resumeId and userId", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard?resumeId=test-resume&userId=test-user",
        { method: "GET" }
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
        { method: "GET" }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Missing resumeId or userId");
    });

    it("should return 400 when userId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard?resumeId=test-resume",
        { method: "GET" }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Missing resumeId or userId");
    });

    it("should return 400 when both resumeId and userId are missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        { method: "GET" }
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
        { method: "GET" }
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
        { method: "GET" }
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
        resumeId: "test-resume",
        userId: "test-user",
        totalViews: 100,
        uniqueViews: 50,
        attractivenessScore: 75,
        topSections: [],
        topRecruiters: [],
        benchmark: {
          industry: "Technology",
          avgAttractivenessScore: 62,
          avgViewCount: 45,
          avgDownloadCount: 12,
          topSkills: ["TypeScript", "React", "Node.js"],
          benchmarkDate: new Date().toISOString(), // Convert to string to match JSON serialization
        },
      };

      (AnalyticsService.aggregateToDashboard as jest.Mock).mockReturnValue(
        mockDashboard
      );

      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        {
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
      expect(AnalyticsService.aggregateToDashboard).toHaveBeenCalled();
    });

    it("should return 400 when resumeId is missing from body", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        {
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
      expect(AnalyticsService.aggregateToDashboard).not.toHaveBeenCalled();
    });

    it("should return 400 when userId is missing from body", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        {
          method: "POST",
          body: JSON.stringify({
            resumeId: "test-resume",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Missing resumeId or userId");
      expect(AnalyticsService.aggregateToDashboard).not.toHaveBeenCalled();
    });

    it("should handle missing or invalid request body", async () => {
      // Test empty body
      const request1 = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        {
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
          method: "POST",
          body: "invalid json",
        }
      );

      const response2 = await POST(request2);
      expect(response2.status).toBe(400);
      expect(AnalyticsService.aggregateToDashboard).not.toHaveBeenCalled();
    });

    it("should handle errors during dashboard aggregation", async () => {
      (AnalyticsService.aggregateToDashboard as jest.Mock).mockImplementation(
        () => {
          throw new Error("Aggregation failed");
        }
      );

      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        {
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
