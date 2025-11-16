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

import { AnalyticsService } from "@/lib/analytics.service";

describe("GET /api/analytics/dashboard", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
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

    it("should handle special characters in resumeId and userId", async () => {
      const specialResumeId = "resume-123_special@test.com";
      const specialUserId = "user-456_special@test.com";

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

    it("should handle very long resumeId and userId", async () => {
      const longResumeId = "a".repeat(200);
      const longUserId = "b".repeat(200);

      const request = new NextRequest(
        `http://localhost:3000/api/analytics/dashboard?resumeId=${encodeURIComponent(
          longResumeId
        )}&userId=${encodeURIComponent(longUserId)}`,
        { method: "GET" }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.resumeId).toBe(longResumeId);
      expect(data.data.userId).toBe(longUserId);
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

    it("should return 400 when request body is empty", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Missing resumeId or userId");
    });

    it("should handle invalid JSON in request body", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        {
          method: "POST",
          body: "invalid json",
        }
      );

      const response = await POST(request);

      // Next.js handles JSON parsing automatically
      expect(response.status).toBe(400);
      expect(AnalyticsService.aggregateToDashboard).not.toHaveBeenCalled();
    });

    it("should handle missing request body", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        {
          method: "POST",
          body: null,
        }
      );

      const response = await POST(request);

      // Next.js handles missing body
      expect(response.status).toBe(400);
      expect(AnalyticsService.aggregateToDashboard).not.toHaveBeenCalled();
    });

    it("should handle extreme parameter values", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        {
          method: "POST",
          body: JSON.stringify({
            resumeId: "a".repeat(50), // Long resumeId
            userId: "b".repeat(50), // Long userId
          }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(AnalyticsService.aggregateToDashboard).toHaveBeenCalled();
    });

    it("should handle special characters in resumeId and userId", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard",
        {
          method: "POST",
          body: JSON.stringify({
            resumeId: "resume@test.com",
            userId: "user@test.com",
          }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(AnalyticsService.aggregateToDashboard).toHaveBeenCalled();
    });
  });
});
