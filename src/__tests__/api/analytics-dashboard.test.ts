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

jest.mock("@/lib/analytics.service", () => ({
  AnalyticsService: {
    generateHeatmap: jest.fn(),
    aggregateToDashboard: jest.fn(),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => ({
    status: status || 500,
    json: async () => ({ error: msg }),
  })),
}));

describe("Analytics Dashboard API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    it("should return 401 if not authenticated", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: null,
        error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/analytics/dashboard"),
        {
          method: "POST",
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(401);
    });

    it("should return 403 if accessing another user's data and not admin", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      (adminDb.collection as jest.Mock).mockImplementation((col) => {
        if (col === "users") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                data: () => ({ role: "jobseeker" }),
              }),
            })),
          };
        }
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/analytics/dashboard"),
        {
          method: "POST",
          body: JSON.stringify({ resumeId: "resume-1", userId: "other-user" }),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(403);
    });

    it("should allow admin to access another user's data", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "admin-123",
        error: null,
      });

      (adminDb.collection as jest.Mock).mockImplementation((col) => {
        if (col === "users") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                data: () => ({ role: "admin" }),
              }),
            })),
          };
        }
        if (col === "analytics") {
          return {
            doc: jest.fn(() => ({
              get: jest
                .fn()
                .mockResolvedValue({ exists: true, data: () => ({}) }),
              collection: jest.fn(() => ({
                orderBy: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({ docs: [] }),
                  })),
                })),
                get: jest.fn().mockResolvedValue({ docs: [] }),
              })),
            })),
          };
        }
        if (col === "benchmarks") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({ exists: false }),
            })),
          };
        }
      });

      (AnalyticsService.aggregateToDashboard as jest.Mock).mockReturnValue({});

      const req = new NextRequest(
        new URL("http://localhost:3000/api/analytics/dashboard"),
        {
          method: "POST",
          body: JSON.stringify({ resumeId: "resume-1", userId: "other-user" }),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(200);
    });

    it("should return 400 if resumeId is missing", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/analytics/dashboard"),
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(400);
    });

    it("should return dashboard data successfully", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      const mockAnalytics = {
        exists: true,
        data: () => ({
          userId: "user-123",
          viewCount: 10,
          lastViewedAt: { toDate: () => new Date() },
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      const mockViewEvents = {
        docs: [
          {
            id: "event-1",
            data: () => ({
              viewerId: "viewer-1",
              viewedAt: { toDate: () => new Date() },
              duration: 30,
            }),
          },
        ],
      };

      const mockHeatmaps = {
        docs: [
          {
            id: "summary",
            data: () => ({
              viewCount: 5,
              avgTimeSpent: 10,
            }),
          },
        ],
      };

      const mockRecruiters = {
        docs: [
          {
            id: "recruiter-1",
            data: () => ({
              recruiterId: "rec-1",
              viewCount: 2,
              lastInteractedAt: { toDate: () => new Date() },
            }),
          },
        ],
      };

      (adminDb.collection as jest.Mock).mockImplementation((col) => {
        if (col === "analytics") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(mockAnalytics),
              collection: jest.fn((sub) => {
                if (sub === "viewEvents") {
                  return {
                    orderBy: jest.fn(() => ({
                      limit: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue(mockViewEvents),
                      })),
                    })),
                  };
                }
                if (sub === "heatmaps") {
                  return { get: jest.fn().mockResolvedValue(mockHeatmaps) };
                }
                if (sub === "recruiterEngagement") {
                  return {
                    orderBy: jest.fn(() => ({
                      limit: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue(mockRecruiters),
                      })),
                    })),
                  };
                }
              }),
            })),
          };
        }
        if (col === "benchmarks") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  industry: "Technology",
                  avgAttractivenessScore: 60,
                }),
              }),
            })),
          };
        }
      });

      (AnalyticsService.aggregateToDashboard as jest.Mock).mockReturnValue({
        summary: { totalViews: 10 },
      });

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
    });

    it("should create initial analytics if not found", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      (adminDb.collection as jest.Mock).mockImplementation((col) => {
        if (col === "analytics") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({ exists: false }),
              set: jest.fn().mockResolvedValue(undefined),
              collection: jest.fn(() => ({
                orderBy: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({ docs: [] }),
                  })),
                })),
                get: jest.fn().mockResolvedValue({ docs: [] }),
              })),
            })),
          };
        }
        if (col === "benchmarks") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({ exists: false }),
            })),
          };
        }
      });

      (AnalyticsService.generateHeatmap as jest.Mock).mockReturnValue([]);
      (AnalyticsService.aggregateToDashboard as jest.Mock).mockReturnValue({});

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
    });

    it("should handle errors in POST", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      (adminDb.collection as jest.Mock).mockImplementation(() => {
        throw new Error("POST error");
      });

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
      expect(data.success).toBe(false);
      expect(data.message).toBe("POST error");
    });
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: null,
        error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/analytics/dashboard"),
        {
          method: "GET",
        }
      );

      const response = await GET(req);
      expect(response.status).toBe(401);
    });

    it("should return 403 if accessing another user's data and not admin in GET", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      (adminDb.collection as jest.Mock).mockImplementation((col) => {
        if (col === "users") {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                data: () => ({ role: "jobseeker" }),
              }),
            })),
          };
        }
      });

      const req = new NextRequest(
        new URL(
          "http://localhost:3000/api/analytics/dashboard?resumeId=res-1&userId=other-user"
        ),
        {
          method: "GET",
        }
      );

      const response = await GET(req);
      expect(response.status).toBe(403);
    });

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

      (adminDb.collection as jest.Mock).mockImplementation((col) => ({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              userId: "user-123",
              viewCount: 5,
            }),
          }),
        })),
      }));

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
    });

    it("should handle errors in GET", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      (adminDb.collection as jest.Mock).mockImplementation(() => {
        throw new Error("GET error");
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/analytics/dashboard?resumeId=res-1"),
        {
          method: "GET",
        }
      );

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("GET error");
    });
  });
});
