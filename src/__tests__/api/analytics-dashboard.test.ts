import { POST, GET } from "@/app/api/analytics/dashboard/route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { AnalyticsService } from "@/lib/analytics.service";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

jest.mock("@/lib/logger");
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        collection: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn(),
            })),
          })),
          get: jest.fn(),
        })),
      })),
    })),
  },
}));

jest.mock("@/lib/services/analyticsService", () => ({
  getDashboardAnalytics: jest.fn(),
  getAnalytics: jest.fn(),
  generateHeatmap: jest.fn(),
  aggregateToDashboard: jest.fn(),
}));

jest.mock("@/lib/dal", () => ({
  COLLECTIONS: {
    USERS: "users",
    RESUMES: "resumes",
    RESUME_PROFILES: "resumeProfiles",
  },
  collectionRef: jest.fn((name: string) => ({
    doc: jest.fn(() => ({
      get: jest.fn().mockResolvedValue(
        name === "users"
          ? { exists: true, data: () => ({ role: "jobseeker" }) }
          : name === "resumes"
            ? { exists: true, data: () => ({ userId: "user-123" }) }
            : { exists: false, data: () => undefined }
      ),
    })),
  })),
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status = 500) => {
    return Response.json(
      {
        error: message,
        details: error instanceof Error ? error.message : String(error),
      },
      { status }
    );
  }),
}));

import {
  getDashboardAnalytics,
  getAnalytics,
} from "@/lib/services/analyticsService";

describe("Analytics Dashboard API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    it("should return 401 if not authenticated", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: null,
        error: Response.json({ error: "Unauthorized" }, { status: 401 }),
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/analytics/dashboard"),
        {
          method: "POST",
          body: JSON.stringify({ resumeId: "resume-1" }),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(401);
    });

    it("should return dashboard data successfully", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      const mockDashboard = { summary: { totalViews: 10 } };
      (getDashboardAnalytics as jest.Mock).mockResolvedValue(mockDashboard);

      const req = new NextRequest(
        new URL("http://localhost:3000/api/analytics/dashboard"),
        {
          method: "POST",
          body: JSON.stringify({ resumeId: "resume-123" }),
        }
      );

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockDashboard);
    });

    it("should handle errors in POST", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      (getDashboardAnalytics as jest.Mock).mockRejectedValue(
        new Error("POST error")
      );

      const req = new NextRequest(
        new URL("http://localhost:3000/api/analytics/dashboard"),
        {
          method: "POST",
          body: JSON.stringify({ resumeId: "resume-123" }),
        }
      );

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to retrieve analytics dashboard");
    });
  });

  describe("GET", () => {
    it("should return 400 if resumeId is missing in GET", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/analytics/dashboard"),
        {
          method: "GET",
        }
      );

      const response = await GET(req);
      expect(response.status).toBe(400);
    });

    it("should return analytics data successfully", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      const mockResult = {
        analytics: {
          views: { count: 5, uniqueViewers: 3 },
          lastUpdatedAt: new Date().toISOString(),
        },
      };
      (getAnalytics as jest.Mock).mockResolvedValue(mockResult);

      const req = new NextRequest(
        new URL("http://localhost:3000/api/analytics/dashboard?resumeId=res-1"),
        {
          method: "GET",
        }
      );

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.viewCount).toBe(5);
      expect(data.data.uniqueViewCount).toBe(3);
    });

    it("should handle errors in GET", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      (getAnalytics as jest.Mock).mockRejectedValue(new Error("GET error"));

      const req = new NextRequest(
        new URL("http://localhost:3000/api/analytics/dashboard?resumeId=res-1"),
        {
          method: "GET",
        }
      );

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to retrieve analytics");
    });
  });
});
