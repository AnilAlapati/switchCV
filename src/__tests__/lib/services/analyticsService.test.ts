import {
  getAnalytics,
  trackAnalyticsEvent,
  getEngagementMetrics,
  getRequestStatistics,
  getRecentEvents,
} from "@/lib/services/analyticsService";
import { adminDb } from "@/lib/firebase-admin";

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => {
  const mockDocRef = {
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  };

  const mockCollectionRef = {
    doc: jest.fn().mockReturnValue(mockDocRef),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };

  return {
    adminDb: {
      collection: jest.fn().mockReturnValue(mockCollectionRef),
      doc: jest.fn().mockReturnValue(mockDocRef),
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      __mockDocRef__: mockDocRef,
      __mockCollectionRef__: mockCollectionRef,
    },
  };
});

// Mock FieldValue
jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: jest.fn((n) => ({ type: "increment", value: n })),
  },
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe("analyticsService", () => {
  const mockResumeId = "test-resume-id";
  const mockUserId = "test-user-id";
  const mockTimestamp = "2023-01-01T00:00:00.000Z";

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(mockTimestamp));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("getAnalytics", () => {
    it("should return analytics data when it exists", async () => {
      const mockAnalyticsData = { views: { count: 10 } };
      const mockEngagementRawData = { totalSessions: 2, totalTimeSpent: 240 };
      const mockEngagementResult = {
        ...mockEngagementRawData,
        avgSessionDuration: 120,
      };
      const mockRequestData = { totalRequests: 5 };

      const mockDocRef = require("@/lib/firebase-admin").adminDb.__mockDocRef__;
      mockDocRef.get = jest
        .fn()
        .mockResolvedValueOnce({ exists: true, data: () => mockAnalyticsData })
        .mockResolvedValueOnce({
          exists: true,
          data: () => mockEngagementRawData,
        })
        .mockResolvedValueOnce({ exists: true, data: () => mockRequestData })
        .mockResolvedValueOnce({ exists: false, data: () => [] }); // for recentEvents

      const result = await getAnalytics(mockResumeId);

      expect(result).toEqual({
        analytics: {
          ...mockAnalyticsData,
          engagement: mockEngagementResult,
          requests: mockRequestData,
        },
        engagement: mockEngagementResult,
        requests: mockRequestData,
        recentEvents: [],
        resumeId: mockResumeId,
      });
    });

    it("should return default analytics when not found", async () => {
      const mockDocRef = require("@/lib/firebase-admin").adminDb.__mockDocRef__;
      mockDocRef.get = jest
        .fn()
        .mockResolvedValueOnce({ exists: false })
        .mockResolvedValueOnce({ exists: false })
        .mockResolvedValueOnce({ exists: false })
        .mockResolvedValueOnce({ exists: false });

      const result = await getAnalytics(mockResumeId);
      expect(result.resumeId).toBe(mockResumeId);
      expect(result.analytics.views.count).toBe(0);
    });
  });

  describe("trackAnalyticsEvent", () => {
    it("should track a new event and create analytics if not exists", async () => {
      const request = {
        resumeId: mockResumeId,
        userId: mockUserId,
        eventType: "view" as const,
        metadata: { referrer: "google" },
      };

      const mockDocRef = require("@/lib/firebase-admin").adminDb.__mockDocRef__;
      mockDocRef.get = jest.fn().mockResolvedValue({
        exists: false,
      });
      mockDocRef.set = jest.fn().mockResolvedValue({});
      mockDocRef.update = jest.fn().mockResolvedValue({});

      const result = await trackAnalyticsEvent(request);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe("view");
    });

    it("should track a new event and update existing analytics", async () => {
      const request = {
        resumeId: mockResumeId,
        userId: mockUserId,
        eventType: "view" as const,
        metadata: { referrer: "google" },
      };

      const mockDocRef = require("@/lib/firebase-admin").adminDb.__mockDocRef__;
      mockDocRef.get = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({}),
      });
      mockDocRef.set = jest.fn().mockResolvedValue({});
      mockDocRef.update = jest.fn().mockResolvedValue({});

      const result = await trackAnalyticsEvent(request);

      expect(result.success).toBe(true);
    });

    it("should throw error if resumeId or eventType is missing", async () => {
      const request = {
        resumeId: "",
        eventType: "view" as const,
      };

      await expect(trackAnalyticsEvent(request)).rejects.toThrow(
        "resumeId and eventType are required"
      );
    });

    it("should track session duration for view events", async () => {
      const request = {
        resumeId: mockResumeId,
        eventType: "view" as const,
        metadata: { sessionDuration: 60 },
      };

      const mockDocRef = require("@/lib/firebase-admin").adminDb.__mockDocRef__;
      mockDocRef.get = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ avgSessionDuration: 30, totalSessions: 1 }),
      });
      mockDocRef.update = jest.fn().mockResolvedValue({});
      mockDocRef.set = jest.fn().mockResolvedValue({});

      await trackAnalyticsEvent(request);

      expect(mockDocRef.get).toHaveBeenCalled();
    });

    it("should handle error in trackSessionDuration", async () => {
      const request = {
        resumeId: mockResumeId,
        eventType: "view" as const,
        metadata: { sessionDuration: 60 },
      };

      const mockDocRef = require("@/lib/firebase-admin").adminDb.__mockDocRef__;
      mockDocRef.get = jest
        .fn()
        .mockResolvedValueOnce({ exists: true, data: () => ({}) })
        .mockRejectedValueOnce(new Error("DB Error"));
      mockDocRef.update = jest.fn().mockResolvedValue({});
      mockDocRef.set = jest.fn().mockResolvedValue({});

      // Should not throw even if there's an error in session duration
      await expect(trackAnalyticsEvent(request)).resolves.toBeDefined();
    });

    it("should update analytics for request event", async () => {
      const request = {
        resumeId: mockResumeId,
        eventType: "request" as const,
      };

      const mockDocRef = require("@/lib/firebase-admin").adminDb.__mockDocRef__;
      mockDocRef.get = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({}),
      });
      mockDocRef.update = jest.fn().mockResolvedValue({});
      mockDocRef.set = jest.fn().mockResolvedValue({});

      await trackAnalyticsEvent(request);

      expect(mockDocRef.get).toHaveBeenCalled();
    });

    it("should update top referrers when referrer is present", async () => {
      const request = {
        resumeId: mockResumeId,
        eventType: "view" as const,
        metadata: { referrer: "linkedin" },
      };

      const mockDocRef = require("@/lib/firebase-admin").adminDb.__mockDocRef__;
      mockDocRef.get = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({}),
      });
      mockDocRef.update = jest.fn().mockResolvedValue({});
      mockDocRef.set = jest.fn().mockResolvedValue({});

      await trackAnalyticsEvent(request);

      expect(mockDocRef.get).toHaveBeenCalled();
    });
  });

  describe("getEngagementMetrics", () => {
    it("should return metrics when they exist", async () => {
      const mockData = { totalSessions: 2, totalTimeSpent: 200 };
      const expectedResult = { ...mockData, avgSessionDuration: 100 };

      const mockDocRef = require("@/lib/firebase-admin").adminDb.__mockDocRef__;
      mockDocRef.get = jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockData,
      });

      const result = await getEngagementMetrics(mockResumeId);
      expect(result).toEqual(expectedResult);
    });

    it("should return null when metrics do not exist", async () => {
      const mockDocRef = require("@/lib/firebase-admin").adminDb.__mockDocRef__;
      mockDocRef.get = jest.fn().mockResolvedValue({
        exists: false,
      });

      const result = await getEngagementMetrics(mockResumeId);
      expect(result).toBeNull();
    });
  });

  describe("getRequestStatistics", () => {
    it("should return stats when they exist", async () => {
      const mockData = { totalRequests: 10 };
      const mockDocRef = require("@/lib/firebase-admin").adminDb.__mockDocRef__;
      mockDocRef.get = jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockData,
      });

      const result = await getRequestStatistics(mockResumeId);
      expect(result).toEqual(mockData);
    });

    it("should return null when stats do not exist", async () => {
      const mockDocRef = require("@/lib/firebase-admin").adminDb.__mockDocRef__;
      mockDocRef.get = jest.fn().mockResolvedValue({
        exists: false,
      });

      const result = await getRequestStatistics(mockResumeId);
      expect(result).toBeNull();
    });
  });

  describe("getRecentEvents", () => {
    it("should return events list", async () => {
      const mockEvents = [{ eventId: "1" }, { eventId: "2" }];
      const mockDocRef = require("@/lib/firebase-admin").adminDb.__mockDocRef__;
      const mockCollectionRef = require("@/lib/firebase-admin").adminDb
        .__mockCollectionRef__;

      // Setup the chaining for collection().doc().collection()
      mockCollectionRef.doc = jest.fn().mockReturnValue(mockDocRef);
      mockDocRef.collection = jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: mockEvents.map((data) => ({ data: () => data })),
        }),
      });

      const result = await getRecentEvents(mockResumeId);
      expect(result).toEqual(mockEvents);
    });

    it("should return empty array on error", async () => {
      const mockCollectionRef = require("@/lib/firebase-admin").adminDb
        .__mockCollectionRef__;
      mockCollectionRef.doc = jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockRejectedValue(new Error("DB Error")),
        }),
      });

      const result = await getRecentEvents(mockResumeId);
      expect(result).toEqual([]);
    });
  });
});
