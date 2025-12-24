// src/__tests__/api/analytics.test.ts
/**
 * Tests for the analytics API
 */

import { POST, GET } from "@/app/api/profiles/analytics/route";
import { NextRequest } from "next/server";
import {
  getAnalytics,
  trackAnalyticsEvent,
} from "@/lib/services/analyticsService";
import {
  incrementJobSeekerMetric,
  incrementRecruiterMetric,
} from "@/lib/services/metricsService";
import { adminDb } from "@/lib/firebase-admin";

// Mock Services
jest.mock("@/lib/services/analyticsService", () => ({
  getAnalytics: jest.fn(),
  trackAnalyticsEvent: jest.fn(),
}));

jest.mock("@/lib/services/metricsService", () => ({
  incrementJobSeekerMetric: jest.fn(),
  incrementRecruiterMetric: jest.fn(),
}));

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
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

    it("should track view events and update metrics", async () => {
      const trackingData = {
        resumeId: "resume-123",
        userId: "viewer-456",
        eventType: "view",
      };

      (trackAnalyticsEvent as jest.Mock).mockResolvedValue({ success: true });
      (adminDb.get as jest.Mock).mockResolvedValue({
        data: () => ({ userId: "owner-789" }),
      });

      const req = new NextRequest(
        new URL("http://localhost/api/profiles/analytics"),
        {
          method: "POST",
          body: JSON.stringify(trackingData),
        }
      );

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(trackAnalyticsEvent).toHaveBeenCalledWith(trackingData);
      expect(incrementJobSeekerMetric).toHaveBeenCalledWith(
        "owner-789",
        "profileViews"
      );
      expect(incrementRecruiterMetric).toHaveBeenCalledWith(
        "viewer-456",
        "profilesViewed"
      );
    });

    it("should track download events and update metrics", async () => {
      const trackingData = {
        resumeId: "resume-123",
        eventType: "download",
      };

      (trackAnalyticsEvent as jest.Mock).mockResolvedValue({ success: true });
      (adminDb.get as jest.Mock).mockResolvedValue({
        data: () => ({ userId: "owner-789" }),
      });

      const req = new NextRequest(
        new URL("http://localhost/api/profiles/analytics"),
        {
          method: "POST",
          body: JSON.stringify(trackingData),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(200);
      expect(incrementJobSeekerMetric).toHaveBeenCalledWith(
        "owner-789",
        "downloads"
      );
    });

    it("should handle errors in metric updates gracefully", async () => {
      const trackingData = {
        resumeId: "resume-123",
        eventType: "view",
      };

      (trackAnalyticsEvent as jest.Mock).mockResolvedValue({ success: true });
      (adminDb.get as jest.Mock).mockRejectedValue(
        new Error("Firestore error")
      );

      const req = new NextRequest(
        new URL("http://localhost/api/profiles/analytics"),
        {
          method: "POST",
          body: JSON.stringify(trackingData),
        }
      );

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200); // Should still succeed
      expect(data.success).toBe(true);
    });

    it("should handle tracking service errors", async () => {
      (trackAnalyticsEvent as jest.Mock).mockRejectedValue(
        new Error("Tracking failed")
      );

      const req = new NextRequest(
        new URL("http://localhost/api/profiles/analytics"),
        {
          method: "POST",
          body: JSON.stringify({ resumeId: "123", eventType: "view" }),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(500);
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

    it("should return analytics for a resume", async () => {
      const mockAnalytics = { views: 100, downloads: 5 };
      (getAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      const req = new NextRequest(
        new URL("http://localhost/api/profiles/analytics?resumeId=resume-123")
      );
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockAnalytics);
      expect(getAnalytics).toHaveBeenCalledWith("resume-123");
    });

    it("should handle analytics service errors", async () => {
      (getAnalytics as jest.Mock).mockRejectedValue(new Error("Not found"));

      const req = new NextRequest(
        new URL("http://localhost/api/profiles/analytics?resumeId=resume-123")
      );
      const response = await GET(req);
      expect(response.status).toBe(500);
    });
  });
});
