/* eslint-disable max-lines */
// src/app/api/profiles/analytics/route.test.ts
import { GET, POST } from "@/app/api/profiles/analytics/route";
import { NextRequest } from "next/server";

// Mock Firebase
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
    fromDate: jest.fn(),
  },
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

// Mock analytics service
jest.mock("@/lib/services/analyticsService", () => ({
  getAnalytics: jest.fn(),
  trackAnalyticsEvent: jest.fn(),
}));

// Mock auth helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest
    .fn()
    .mockResolvedValue({ userId: "user-123", error: null }),
  fetchResumeDocument: jest.fn().mockResolvedValue({
    data: { userId: "user-123" },
    docSnap: { exists: true },
    docRef: {},
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

import {
  getAnalytics,
  trackAnalyticsEvent,
} from "@/lib/services/analyticsService";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn() as any,
    set: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
  },
}));

const mockGetAnalytics = getAnalytics as jest.MockedFunction<
  typeof getAnalytics
>;
const mockTrackAnalyticsEvent = trackAnalyticsEvent as jest.MockedFunction<
  typeof trackAnalyticsEvent
>;

describe("GET /api/profiles/analytics", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    (adminDb.get as jest.Mock).mockResolvedValue({
      exists: true,
      data: () => ({ role: "admin" }),
    });
    mockRequest = new NextRequest("http://localhost:3000/api/profiles/analytics", {
      headers: {
        authorization: "Bearer test-token",
        "x-user-id": "user-123"
      },
    });
    // Ensure getAuthenticatedUserId returns user-123 consistently
    const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: "user-123", error: null });
  });

  it("should return analytics data for valid resumeId", async () => {
    const mockAnalyticsData = {
      analytics: {
        slug: "test-resume",
        resumeId: "resume-123",
        userId: "user-123",
        views: {
          count: 10,
          lastViewedAt: "2024-01-01T00:00:00.000Z",
          topReferrers: { "google.com": 5 },
          uniqueViewers: 8,
          avgSessionDuration: 120,
        },
        totalInteractions: 15,
        lastUpdatedAt: "2024-01-01T00:00:00.000Z",
      },
      engagement: {
        resumeId: "resume-123",
        totalViews: 10,
        uniqueViewers: 8,
        avgSessionDuration: 120,
        viewsBySource: {
          search: 5,
          direct: 3,
          link: 1,
          recruiter: 1,
          other: 0,
        },
        topReferrers: { "google.com": 5 },
        lastViewedAt: "2024-01-01T00:00:00.000Z",
        viewTrendLast7Days: [],
      },
      requests: {
        resumeId: "resume-123",
        totalRequests: 5,
        pendingRequests: 2,
        approvedRequests: 2,
        deniedRequests: 1,
        requestsBySource: { recruiter: 5 },
        lastRequestAt: "2024-01-01T00:00:00.000Z",
        requestTrendLast7Days: [],
      },
      resumeId: "resume-123",
      ownerName: "Unknown User",
      resumeTitle: "Resume #resume-123",
      recentEvents: [],
    };

    mockGetAnalytics.mockResolvedValue(mockAnalyticsData);

    mockRequest.nextUrl.searchParams.set("resumeId", "resume-123");

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockAnalyticsData);
    expect(mockGetAnalytics).toHaveBeenCalledWith("resume-123");
  });

  it("should return 400 error when resumeId parameter is missing", async () => {
    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("resumeId parameter is required");
    expect(mockGetAnalytics).not.toHaveBeenCalled();
  });

  it("should return 500 error when analytics service throws error", async () => {
    const errorMessage = "Database connection failed";
    mockGetAnalytics.mockRejectedValue(new Error(errorMessage));

    mockRequest.nextUrl.searchParams.set("resumeId", "resume-123");

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to retrieve analytics data from service");
    expect(data.details).toBe(errorMessage);
    expect(mockGetAnalytics).toHaveBeenCalledWith("resume-123");
  });

  it("should return 500 error with unknown error message for non-Error objects", async () => {
    mockGetAnalytics.mockRejectedValue("String error");

    mockRequest.nextUrl.searchParams.set("resumeId", "resume-123");

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to retrieve analytics data from service");
    expect(data.details).toBe("String error");
  });
});

describe("POST /api/profiles/analytics", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = new NextRequest("http://localhost:3000/api/profiles/analytics", {
      headers: {
        authorization: "Bearer test-token",
        "x-user-id": "user-123"
      },
      method: "POST",
    });
    // Ensure getAuthenticatedUserId returns user-123 consistently
    const { getAuthenticatedUserId } = require("@/lib/utils/api-helpers");
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: "user-123", error: null });
  });

  it("should successfully track analytics event with valid data", async () => {
    const trackingRequest = {
      resumeId: "resume-123",
      userId: "user-123",
      eventType: "view" as const,
      metadata: {
        viewedBy: "recruiter-789",
        source: "search" as const,
        sessionDuration: 120,
      },
    };

    const mockResult = {
      success: true,
      eventId: "event-123",
      eventType: "view" as const,
      timestamp: "2024-01-01T00:00:00.000Z",
      resumeId: "resume-123",
    };

    mockTrackAnalyticsEvent.mockResolvedValue(mockResult);

    // Mock request.json()
    mockRequest.json = jest.fn().mockResolvedValue(trackingRequest);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockResult);
    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith(trackingRequest);
  });

  it("should successfully track analytics event with minimal required data", async () => {
    const trackingRequest = {
      resumeId: "resume-123",
      eventType: "click" as const,
    };

    const mockResult = {
      success: true,
      eventId: "event-456",
      eventType: "click" as const,
      timestamp: "2024-01-01T00:00:00.000Z",
      resumeId: "resume-123",
    };

    mockTrackAnalyticsEvent.mockResolvedValue(mockResult);
    mockRequest.json = jest.fn().mockResolvedValue(trackingRequest);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockResult);
    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith(trackingRequest);
  });

  it("should return 400 error when resumeId is missing", async () => {
    const trackingRequest = {
      eventType: "view" as const,
    };

    mockRequest.json = jest.fn().mockResolvedValue(trackingRequest);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("resumeId and eventType are required");
    expect(mockTrackAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("should return 400 error when eventType is missing", async () => {
    const trackingRequest = {
      resumeId: "resume-123",
    };

    mockRequest.json = jest.fn().mockResolvedValue(trackingRequest);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("resumeId and eventType are required");
    expect(mockTrackAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("should return 400 error when both resumeId and eventType are missing", async () => {
    const trackingRequest = {
      metadata: { source: "direct" },
    };

    mockRequest.json = jest.fn().mockResolvedValue(trackingRequest);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("resumeId and eventType are required");
    expect(mockTrackAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("should return 500 error when analytics service throws error", async () => {
    const trackingRequest = {
      resumeId: "resume-123",
      eventType: "view" as const,
    };

    const errorMessage = "Database connection failed";
    mockTrackAnalyticsEvent.mockRejectedValue(new Error(errorMessage));
    mockRequest.json = jest.fn().mockResolvedValue(trackingRequest);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to track analytics");
    expect(data.details).toBe(errorMessage);
    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith(trackingRequest);
  });

  it("should return 500 error with unknown error message for non-Error objects", async () => {
    const trackingRequest = {
      resumeId: "resume-123",
      eventType: "share" as const,
    };

    mockTrackAnalyticsEvent.mockRejectedValue("String error");
    mockRequest.json = jest.fn().mockResolvedValue(trackingRequest);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to track analytics");
    expect(data.details).toBe("String error");
  });

  it("should handle different event types correctly", async () => {
    const eventTypes = [
      "view",
      "request",
      "approval",
      "click",
      "share",
    ] as const;

    for (const eventType of eventTypes) {
      const trackingRequest = {
        resumeId: "resume-123",
        eventType,
      };

      const mockResult = {
        success: true,
        eventId: `event-${eventType}`,
        eventType,
        timestamp: "2024-01-01T00:00:00.000Z",
        resumeId: "resume-123",
      };

      mockTrackAnalyticsEvent.mockResolvedValue(mockResult);
      mockRequest.json = jest.fn().mockResolvedValue(trackingRequest);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.eventType).toBe(eventType);
      expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith(trackingRequest);
    }
  });

  it("should handle complex metadata correctly", async () => {
    const trackingRequest = {
      resumeId: "resume-123",
      userId: "user-123",
      eventType: "view" as const,
      metadata: {
        viewedBy: "recruiter-789",
        viewerName: "John Doe",
        source: "recruiter" as const,
        referrer: "linkedin.com",
        sessionDuration: 300,
      },
    };

    const mockResult = {
      success: true,
      eventId: "event-complex",
      eventType: "view" as const,
      timestamp: "2024-01-01T00:00:00.000Z",
      resumeId: "resume-123",
    };

    mockTrackAnalyticsEvent.mockResolvedValue(mockResult);
    mockRequest.json = jest.fn().mockResolvedValue(trackingRequest);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockResult);
    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith(trackingRequest);
  });

  it("should handle request parsing errors", async () => {
    const errorMessage = "Invalid JSON";
    mockRequest.json = jest.fn().mockRejectedValue(new Error(errorMessage));

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to track analytics");
    expect(data.details).toBe(errorMessage);
    expect(mockTrackAnalyticsEvent).not.toHaveBeenCalled();
  });
});
