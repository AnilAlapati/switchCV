import { GET, POST } from "./route";
import { NextRequest, NextResponse } from "next/server";
import {
  getDashboardAnalytics,
  getAnalytics,
  aggregateToDashboard,
} from "@/lib/services/analyticsService";

// ---------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------

// 1. Mock api-helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status = 500) => {
    return {
      status,
      json: async () => ({ success: false, message, error: String(error) }),
    };
  }),
}));

// 2. Mock analyticsService
jest.mock("@/lib/services/analyticsService", () => ({
  getDashboardAnalytics: jest.fn(),
  getAnalytics: jest.fn(),
  aggregateToDashboard: jest.fn(),
}));

// 3. Mock Logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// 4. Mock Firebase Admin (Firestore)
jest.mock("@/lib/dal", () => ({
  COLLECTIONS: {
    USERS: "users",
  },
  collectionRef: jest.fn(),
}));

import { collectionRef } from "@/lib/dal";

// Helper to access the mock
const mockCollectionRef = collectionRef as jest.Mock;
const mockDoc = jest.fn();
const mockGet = jest.fn();
const mockCollectionObj = {
  doc: mockDoc,
};
const mockDocObj = {
  get: mockGet,
};

// ---------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------

describe("Analytics Dashboard API", () => {
  const mockGetAuthenticatedUserId = require("@/lib/utils/api-helpers")
    .getAuthenticatedUserId as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: Authenticated user is "user-123"
    mockGetAuthenticatedUserId.mockResolvedValue({
      userId: "user-123",
      error: null,
    });

    // Default: Firestore returns empty/generic data (overridden in specific tests)
    mockCollectionRef.mockReturnValue(mockCollectionObj);
    mockDoc.mockReturnValue(mockDocObj);
  });

  describe("POST /api/analytics/dashboard", () => {
    it("should return dashboard data for valid owner", async () => {
      // Mock Service Response
      (getDashboardAnalytics as jest.Mock).mockResolvedValue({
        summary: { totalViews: 10 },
      });

      const req = new NextRequest("http://localhost/api/analytics/dashboard", {
        method: "POST",
        body: JSON.stringify({ resumeId: "resume-abc", userId: "user-123" }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.summary.totalViews).toBe(10);
    });

    it("should return 400 for invalid JSON", async () => {
      const req = new NextRequest("http://localhost/api/analytics/dashboard", {
        method: "POST",
        body: "invalid-json{",
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.message).toMatch(/Missing resumeId or userId/);
    });

    it("should return 400 for missing resumeId", async () => {
      const req = new NextRequest("http://localhost/api/analytics/dashboard", {
        method: "POST",
        body: JSON.stringify({ userId: "user-123" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 403 if accessing another user's data as non-admin", async () => {
      // Auth user is "user-123", but requesting data for "user-456"
      const req = new NextRequest("http://localhost/api/analytics/dashboard", {
        method: "POST",
        body: JSON.stringify({ resumeId: "resume-xyz", userId: "user-456" }),
      });

      // Mock user role lookup -> Not admin
      mockGet.mockResolvedValue({
        data: () => ({ role: "seeker" }),
      });

      const res = await POST(req);
      // const data = await res.json();

      expect(res.status).toBe(403);
      expect(mockCollectionRef).toHaveBeenCalledWith("users");
      expect(mockDoc).toHaveBeenCalledWith("user-123"); // Checks requester's role
    });

    it("should allow admin to access another user's data", async () => {
      const req = new NextRequest("http://localhost/api/analytics/dashboard", {
        method: "POST",
        body: JSON.stringify({ resumeId: "resume-xyz", userId: "user-456" }),
      });

      // Mock user role lookup -> Admin
      mockGet.mockResolvedValue({
        data: () => ({ role: "admin" }),
      });

      (getDashboardAnalytics as jest.Mock).mockResolvedValue({
        summary: { totalViews: 999 },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.summary.totalViews).toBe(999);
    });

    it("should propagate auth errors", async () => {
      mockGetAuthenticatedUserId.mockResolvedValue({
        userId: null,
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      });

      const req = new NextRequest("http://localhost/api/analytics/dashboard", {
        method: "POST",
        body: JSON.stringify({ resumeId: "123" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should return 500 if service throws", async () => {
      (getDashboardAnalytics as jest.Mock).mockRejectedValue(new Error("Service Bomb"));

      const req = new NextRequest("http://localhost/api/analytics/dashboard", {
        method: "POST",
        body: JSON.stringify({ resumeId: "resume-abc", userId: "user-123" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });

  describe("GET /api/analytics/dashboard", () => {
    it("should return analytics summary for owner", async () => {
      // Mock Service Response with full data
      (getAnalytics as jest.Mock).mockResolvedValue({
        analytics: {
          views: { count: 50, uniqueViewers: 10, lastViewedAt: "2023-01-01" },
          attractivenessScore: 90,
          downloads: 5,
          shares: 2,
          lastUpdatedAt: "2023-01-01",
        },
      });

      const req = new NextRequest(
        "http://localhost/api/analytics/dashboard?resumeId=resume-abc&userId=user-123"
      );

      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.viewCount).toBe(50);
      expect(data.data.uniqueViewCount).toBe(10);
      expect(data.data.attractivenessScore).toBe(90);
    });

    it("should handle missing optional analytics fields (robustness)", async () => {
      // Mock Service Response with partial data
      (getAnalytics as jest.Mock).mockResolvedValue({
        analytics: {
          // views is undefined
          // downloads/shares undefined
          // score undefined
          lastUpdatedAt: null,
        },
      });

      const req = new NextRequest(
        "http://localhost/api/analytics/dashboard?resumeId=resume-abc&userId=user-123"
      );

      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      // Should fallback to 0
      expect(data.data.viewCount).toBe(0);
      expect(data.data.uniqueViewCount).toBe(0);
      expect(data.data.downloadCount).toBe(0);
      expect(data.data.attractivenessScore).toBe(0);
      expect(data.data.lastViewedAt).toBeNull();
    });

    it("should return 400 if resumeId is missing", async () => {
      const req = new NextRequest(
        "http://localhost/api/analytics/dashboard?userId=user-123"
      );
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it("should return 403 if accessing another user as non-admin", async () => {
      const req = new NextRequest(
        "http://localhost/api/analytics/dashboard?resumeId=resume-xyz&userId=user-456"
      );

      // Auth user is user-123 (default). Target is user-456.
      // Mock role -> seeker
      mockGet.mockResolvedValue({
        data: () => ({ role: "seeker" }),
      });

      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("should allow admin to access another user via GET", async () => {
      const req = new NextRequest(
        "http://localhost/api/analytics/dashboard?resumeId=resume-xyz&userId=user-456"
      );

      // Mock role -> admin
      mockGet.mockResolvedValue({
        data: () => ({ role: "admin" }),
      });
      (getAnalytics as jest.Mock).mockResolvedValue({ analytics: {} });

      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it("should return 500 on service error", async () => {
      (getAnalytics as jest.Mock).mockRejectedValue(new Error("DB Error"));
      const req = new NextRequest(
        "http://localhost/api/analytics/dashboard?resumeId=resume-abc&userId=user-123"
      );
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });
});
