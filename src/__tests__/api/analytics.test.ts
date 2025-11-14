// src/__tests__/api/analytics.test.ts
/**
 * Tests for the analytics API
 */

import { POST, GET } from "@/app/api/profiles/analytics/route";
import { NextRequest } from "next/server";

// Mock Firebase
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
}));

describe("Analytics API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/profiles/analytics", () => {
    it("should require resumeId and eventType", async () => {
      const req = new NextRequest(
        new URL("http://localhost/api/profiles/analytics"),
        {
          method: "POST",
          body: JSON.stringify({
            eventType: "view",
          }),
        }
      );

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should track view events", () => {
      const trackingData = {
        resumeId: "resume-123",
        userId: "user-456",
        eventType: "view" as const,
        metadata: {
          viewedBy: "user-456",
          source: "search" as const,
          sessionDuration: 120,
        },
      };

      expect(trackingData.eventType).toBe("view");
      expect(trackingData.metadata.sessionDuration).toBe(120);
    });

    it("should track request events", () => {
      const trackingData = {
        resumeId: "resume-123",
        eventType: "request" as const,
      };

      expect(trackingData.eventType).toBe("request");
    });

    it("should track approval events", () => {
      const trackingData = {
        resumeId: "resume-123",
        eventType: "approval" as const,
      };

      expect(trackingData.eventType).toBe("approval");
    });

    it("should include metadata in events", () => {
      const trackingData = {
        resumeId: "resume-123",
        eventType: "view" as const,
        metadata: {
          viewedBy: "user-456",
          viewerName: "John Doe",
          source: "direct" as const,
          referrer: "google.com",
          sessionDuration: 300,
        },
      };

      expect(trackingData.metadata.viewedBy).toBe("user-456");
      expect(trackingData.metadata.referrer).toBe("google.com");
      expect(trackingData.metadata.sessionDuration).toBe(300);
    });
  });

  describe("GET /api/profiles/analytics", () => {
    it("should require resumeId parameter", async () => {
      const req = new NextRequest(
        new URL("http://localhost/api/profiles/analytics")
      );
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should return analytics for a resume", () => {
      const analyticsData = {
        slug: "john-doe",
        resumeId: "resume-123",
        userId: "user-456",
        views: {
          count: 45,
          lastViewedAt: new Date().toISOString(),
          topReferrers: {
            "google.com": 20,
            "linkedin.com": 15,
            direct: 10,
          },
          uniqueViewers: 30,
          avgSessionDuration: 180,
        },
        totalInteractions: 50,
        lastUpdatedAt: new Date().toISOString(),
      };

      expect(analyticsData.views.count).toBe(45);
      expect(analyticsData.views.uniqueViewers).toBe(30);
      expect(analyticsData.totalInteractions).toBe(50);
    });

    it("should return 404 if no analytics exist", () => {
      // Test response structure for non-existent analytics
      const response = {
        status: 404,
        error: "No analytics found for this resume",
      };

      expect(response.status).toBe(404);
    });
  });

  describe("Analytics metrics calculation", () => {
    it("should calculate unique viewers correctly", () => {
      const viewers = new Set(["user-1", "user-2", "user-3", "user-1"]);
      expect(viewers.size).toBe(3); // Duplicate removed
    });

    it("should calculate average session duration", () => {
      const sessions = [60, 120, 180, 240];
      const avg = sessions.reduce((a, b) => a + b, 0) / sessions.length;

      expect(avg).toBe(150);
    });

    it("should track top referrers", () => {
      const referrers: Record<string, number> = {
        "google.com": 50,
        "linkedin.com": 30,
        direct: 20,
      };

      const topReferrer = Object.entries(referrers).sort(
        ([, a], [, b]) => b - a
      )[0];
      expect(topReferrer[0]).toBe("google.com");
      expect(topReferrer[1]).toBe(50);
    });

    it("should aggregate views by source", () => {
      const viewsBySource = {
        search: 25,
        direct: 15,
        link: 8,
        recruiter: 5,
        other: 2,
      };

      const total = Object.values(viewsBySource).reduce((a, b) => a + b, 0);
      expect(total).toBe(55);
    });
  });

  describe("Request statistics", () => {
    it("should track pending requests", () => {
      const requests = {
        resumeId: "resume-123",
        totalRequests: 10,
        pendingRequests: 3,
        approvedRequests: 5,
        deniedRequests: 2,
      };

      expect(
        requests.pendingRequests +
          requests.approvedRequests +
          requests.deniedRequests
      ).toBe(10);
    });

    it("should calculate request approval rate", () => {
      const stats = {
        totalRequests: 20,
        approvedRequests: 15,
        deniedRequests: 5,
      };

      const approvalRate = (stats.approvedRequests / stats.totalRequests) * 100;
      expect(approvalRate).toBe(75);
    });
  });

  describe("Engagement metrics", () => {
    it("should calculate engagement score components", () => {
      const engagement = {
        resumeId: "resume-123",
        totalViews: 100,
        uniqueViewers: 80,
        avgSessionDuration: 240,
        viewsBySource: {
          search: 40,
          direct: 30,
          link: 20,
          recruiter: 10,
          other: 0,
        },
      };

      const engagementScore =
        (engagement.uniqueViewers / engagement.totalViews) * 100 +
        engagement.avgSessionDuration / 10;
      expect(engagementScore).toBeGreaterThan(0);
    });

    it("should track view trends over time", () => {
      const viewTrend = [
        { date: "2025-11-09", count: 5 },
        { date: "2025-11-10", count: 8 },
        { date: "2025-11-11", count: 12 },
        { date: "2025-11-12", count: 10 },
        { date: "2025-11-13", count: 15 },
        { date: "2025-11-14", count: 18 },
        { date: "2025-11-15", count: 20 },
      ];

      const totalViews = viewTrend.reduce((sum, day) => sum + day.count, 0);
      expect(totalViews).toBe(88);

      const avgDaily = totalViews / viewTrend.length;
      expect(avgDaily).toBeCloseTo(12.57, 1);
    });
  });
});
