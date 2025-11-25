import {
  getAnalytics,
  trackAnalyticsEvent,
  getEngagementMetrics,
  getRequestStatistics,
  getRecentEvents,
} from "@/lib/services/analyticsService";
import { getDoc, setDoc, updateDoc, getDocs } from "firebase/firestore";
import { logger } from "@/lib/logger";

// Mock Firebase
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => "mock-collection"),
  doc: jest.fn(() => "mock-doc"),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn((n) => ({ type: "increment", value: n })),
  getDocs: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

jest.mock("@/lib/firebase", () => ({
  db: {},
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
      const mockAnalyticsData = {
        views: { count: 10 },
      };
      const mockEngagementData = { avgSessionDuration: 120 };
      const mockRequestData = { totalRequests: 5 };

      (getDoc as jest.Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockAnalyticsData,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockEngagementData,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockRequestData,
        });

      const result = await getAnalytics(mockResumeId);

      expect(result).toEqual({
        analytics: mockAnalyticsData,
        engagement: mockEngagementData,
        requests: mockRequestData,
        resumeId: mockResumeId,
      });
    });

    it("should throw error when analytics do not exist", async () => {
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => false,
      });

      await expect(getAnalytics(mockResumeId)).rejects.toThrow(
        `No analytics found for resume: ${mockResumeId}`
      );
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

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const result = await trackAnalyticsEvent(request);

      expect(setDoc).toHaveBeenCalledTimes(2); // One for event, one for new analytics
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

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({}),
      });

      const result = await trackAnalyticsEvent(request);

      expect(setDoc).toHaveBeenCalledTimes(1); // Only for event
      expect(updateDoc).toHaveBeenCalledTimes(1); // Update analytics
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

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ avgSessionDuration: 30, totalSessions: 1 }),
      });

      await trackAnalyticsEvent(request);

      expect(updateDoc).toHaveBeenCalled();
    });

    it("should track session duration (create new)", async () => {
      const request = {
        resumeId: mockResumeId,
        eventType: "view" as const,
        metadata: { sessionDuration: 60 },
      };

      // First call for analytics check (exists=true)
      // Second call for engagement check (exists=false)
      (getDoc as jest.Mock)
        .mockResolvedValueOnce({ exists: () => true, data: () => ({}) })
        .mockResolvedValueOnce({ exists: () => false });

      await trackAnalyticsEvent(request);

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          avgSessionDuration: 60,
          totalSessions: 1,
        })
      );
    });

    it("should handle error in trackSessionDuration", async () => {
      const request = {
        resumeId: mockResumeId,
        eventType: "view" as const,
        metadata: { sessionDuration: 60 },
      };

      (getDoc as jest.Mock)
        .mockResolvedValueOnce({ exists: () => true, data: () => ({}) })
        .mockRejectedValueOnce(new Error("DB Error"));

      await trackAnalyticsEvent(request);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ resumeId: mockResumeId }),
        "Failed to track session duration"
      );
    });

    it("should update analytics for request event", async () => {
      const request = {
        resumeId: mockResumeId,
        eventType: "request" as const,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({}),
      });

      await trackAnalyticsEvent(request);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          "requests.totalRequests": expect.anything(),
          "requests.pendingRequests": expect.anything(),
        })
      );
    });

    it("should update analytics for approval event", async () => {
      const request = {
        resumeId: mockResumeId,
        eventType: "approval" as const,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({}),
      });

      await trackAnalyticsEvent(request);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          "requests.approvedRequests": expect.anything(),
          "requests.pendingRequests": expect.anything(),
        })
      );
    });

    it("should update top referrers when referrer is present", async () => {
      const request = {
        resumeId: mockResumeId,
        eventType: "view" as const,
        metadata: { referrer: "linkedin" },
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({}),
      });

      await trackAnalyticsEvent(request);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          "views.topReferrers.linkedin": expect.objectContaining({
            type: "increment",
            value: 1,
          }),
        })
      );
    });

    it("should handle view event without metadata", async () => {
      const request = {
        resumeId: mockResumeId,
        eventType: "view" as const,
        // metadata is undefined
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({}),
      });

      await trackAnalyticsEvent(request);

      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe("getEngagementMetrics", () => {
    it("should return metrics when they exist", async () => {
      const mockData = { avgSessionDuration: 100 };
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockData,
      });

      const result = await getEngagementMetrics(mockResumeId);
      expect(result).toEqual(mockData);
    });

    it("should return null when metrics do not exist", async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const result = await getEngagementMetrics(mockResumeId);
      expect(result).toBeNull();
    });

    it("should return null on error", async () => {
      (getDoc as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const result = await getEngagementMetrics(mockResumeId);
      expect(result).toBeNull();
    });
  });

  describe("getRequestStatistics", () => {
    it("should return stats when they exist", async () => {
      const mockData = { totalRequests: 10 };
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockData,
      });

      const result = await getRequestStatistics(mockResumeId);
      expect(result).toEqual(mockData);
    });

    it("should return null when stats do not exist", async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const result = await getRequestStatistics(mockResumeId);
      expect(result).toBeNull();
    });

    it("should return null on error", async () => {
      (getDoc as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const result = await getRequestStatistics(mockResumeId);
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ resumeId: mockResumeId }),
        "Error getting request statistics"
      );
    });
  });

  describe("getRecentEvents", () => {
    it("should return events list", async () => {
      const mockEvents = [{ eventId: "1" }, { eventId: "2" }];
      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockEvents.map((data) => ({ data: () => data })),
      });

      const result = await getRecentEvents(mockResumeId);
      expect(result).toEqual(mockEvents);
    });

    it("should return empty array on error", async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const result = await getRecentEvents(mockResumeId);
      expect(result).toEqual([]);
    });
  });
});
