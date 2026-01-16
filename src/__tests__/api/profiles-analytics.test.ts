import { GET, POST } from "@/app/api/profiles/analytics/route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as analyticsService from "@/lib/services/analyticsService";
import * as metricsService from "@/lib/services/metricsService";
import { getAuthenticatedUserId, fetchResumeDocument } from "@/lib/utils/api-helpers";

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn() as any,
  },
}));

jest.mock("@/lib/services/analyticsService");
jest.mock("@/lib/services/metricsService");
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => ({
    status: status || 500,
    json: async () => ({ error: msg }),
  })),
  fetchResumeDocument: jest.fn(),
}));

describe("Profiles Analytics API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: null,
        error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/profiles/analytics?resumeId=res-1")
      );
      const response = await GET(req);
      expect(response.status).toBe(401);
    });

    it("should return 400 if resumeId is missing", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-1",
        error: null,
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/profiles/analytics")
      );
      const response = await GET(req);
      expect(response.status).toBe(400);
    });

    it("should return 404 if resume not found", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-1",
        error: null,
      });
      (fetchResumeDocument as jest.Mock).mockResolvedValue(null);

      const req = new NextRequest(
        new URL("http://localhost:3000/api/profiles/analytics?resumeId=res-1")
      );
      const response = await GET(req);
      expect(response.status).toBe(404);
    });

    it("should return 403 if user does not own resume and is not admin", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-1",
        error: null,
      });
      ((adminDb as any).get as jest.Mock).mockResolvedValue({
        exists: true,
        data: () => ({ role: "jobseeker" }),
      });
      (fetchResumeDocument as jest.Mock).mockResolvedValue({
        data: { userId: "other-user" },
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/profiles/analytics?resumeId=res-1")
      );
      const response = await GET(req);
      expect(response.status).toBe(403);
    });

    it("should return analytics if user owns resume", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-1",
        error: null,
      });
      (fetchResumeDocument as jest.Mock).mockResolvedValue({
        data: { userId: "user-1" },
      });
      (analyticsService.getAnalytics as jest.Mock).mockResolvedValue({
        views: 10,
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/profiles/analytics?resumeId=res-1")
      );
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.views).toBe(10);
    });

    it("should return analytics if user is admin", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "admin-1",
        error: null,
      });
      ((adminDb as any).get as jest.Mock).mockResolvedValue({
        exists: true,
        data: () => ({ role: "admin" }),
      });
      (fetchResumeDocument as jest.Mock).mockResolvedValue({
        data: { userId: "user-1" },
      });
      (analyticsService.getAnalytics as jest.Mock).mockResolvedValue({
        views: 10,
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/profiles/analytics?resumeId=res-1")
      );
      const response = await GET(req);
      expect(response.status).toBe(200);
    });

    it("should handle errors in GET", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-1",
        error: null,
      });
      (fetchResumeDocument as jest.Mock).mockRejectedValue(
        new Error("Firestore error")
      );

      const req = new NextRequest(
        new URL("http://localhost:3000/api/profiles/analytics?resumeId=res-1")
      );
      const response = await GET(req);
      expect(response.status).toBe(500);
    });
  });

  describe("POST", () => {
    it("should return 400 if resumeId or eventType is missing", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-1",
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/profiles/analytics"),
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await POST(req);
      expect(response.status).toBe(400);
    });

    it("should return 403 if userId mismatch", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-1",
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/profiles/analytics"),
        {
          method: "POST",
          body: JSON.stringify({
            resumeId: "res-1",
            eventType: "view",
            userId: "other-user",
          }),
        }
      );
      const response = await POST(req);
      expect(response.status).toBe(403);
    });

    it("should track event and update metrics for view", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-1",
      });
      (analyticsService.trackAnalyticsEvent as jest.Mock).mockResolvedValue({
        success: true,
      });
      ((adminDb as any).get as jest.Mock).mockResolvedValue({
        exists: true,
        data: () => ({ userId: "owner-1" }),
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/profiles/analytics"),
        {
          method: "POST",
          body: JSON.stringify({
            resumeId: "res-1",
            eventType: "view",
            userId: "user-1",
          }),
        }
      );
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(metricsService.incrementJobSeekerMetric).toHaveBeenCalledWith(
        "owner-1",
        "profileViews"
      );
      expect(metricsService.incrementRecruiterMetric).toHaveBeenCalledWith(
        "user-1",
        "profilesViewed"
      );
    });

    it("should track event and update metrics for download", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-1",
      });
      (analyticsService.trackAnalyticsEvent as jest.Mock).mockResolvedValue({
        success: true,
      });
      ((adminDb as any).get as jest.Mock).mockResolvedValue({
        exists: true,
        data: () => ({ userId: "owner-1" }),
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/profiles/analytics"),
        {
          method: "POST",
          body: JSON.stringify({
            resumeId: "res-1",
            eventType: "download",
            userId: "user-1",
          }),
        }
      );
      const response = await POST(req);
      expect(response.status).toBe(200);
      expect(metricsService.incrementJobSeekerMetric).toHaveBeenCalledWith(
        "owner-1",
        "downloads"
      );
    });

    it("should handle metric update errors gracefully", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-1",
      });
      (analyticsService.trackAnalyticsEvent as jest.Mock).mockResolvedValue({
        success: true,
      });
      ((adminDb as any).get as jest.Mock).mockRejectedValue(
        new Error("Metric error")
      );

      const req = new NextRequest(
        new URL("http://localhost:3000/api/profiles/analytics"),
        {
          method: "POST",
          body: JSON.stringify({
            resumeId: "res-1",
            eventType: "view",
            userId: "user-1",
          }),
        }
      );
      const response = await POST(req);
      expect(response.status).toBe(200); // Should still succeed
    });

    it("should handle errors in POST", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-1",
      });
      const req = {
        json: jest.fn().mockRejectedValue(new Error("JSON error")),
      } as any;

      const response = await POST(req);
      expect(response.status).toBe(500);
    });
  });
});
