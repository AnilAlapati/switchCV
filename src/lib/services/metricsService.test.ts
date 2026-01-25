/**
 * Tests for metricsService.ts
 * Tests the metrics service functions for job seekers and recruiters
 */

import {
  incrementJobSeekerMetric,
  decrementJobSeekerMetric,
  incrementRecruiterMetric,
  updateRecruiterAccessMetric,
  getJobSeekerMetrics,
  getRecruiterMetrics,
} from "@/lib/services/metricsService";

// Mock Firebase admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    collectionGroup: jest.fn(),
  },
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe("Metrics Service", () => {
  let mockCollection: jest.Mock;
  let mockCollectionGroup: jest.Mock;
  let mockDoc: jest.Mock;
  let mockSet: jest.Mock;
  let mockGet: jest.Mock;
  let mockWhere: jest.Mock;
  let mockCount: jest.Mock;
  let mockLoggerError: jest.Mock;
  let mockLoggerInfo: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    const { adminDb } = require("@/lib/firebase-admin");
    const { logger } = require("@/lib/logger");

    mockCollection = adminDb.collection;
    mockCollectionGroup = adminDb.collectionGroup;
    mockLoggerError = logger.error;
    mockLoggerInfo = logger.info;

    mockSet = jest.fn().mockResolvedValue(undefined);
    mockGet = jest.fn();
    mockWhere = jest.fn();
    mockCount = jest.fn();

    mockDoc = jest.fn(() => ({
      set: mockSet,
      get: mockGet,
      collection: jest.fn(() => ({
        where: mockWhere,
      })),
    }));

    mockCollection.mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
    });

    mockCollectionGroup.mockReturnValue({
      where: mockWhere,
    });

    mockWhere.mockReturnValue({
      get: mockGet,
      where: mockWhere,
      count: mockCount,
    });

    mockCount.mockReturnValue({
      get: mockGet,
    });
  });

  describe("incrementJobSeekerMetric", () => {
    it("should increment a job seeker metric successfully", async () => {
      const userId = "user123";
      const metric = "profileViews";
      const value = 5;

      await incrementJobSeekerMetric(userId, metric, value);

      expect(mockCollection).toHaveBeenCalledWith("jobSeekerMetrics");
      expect(mockDoc).toHaveBeenCalledWith(userId);
      expect(mockSet).toHaveBeenCalledWith(
        {
          [metric]: expect.any(Object), // FieldValue.increment
          lastUpdated: expect.any(Object), // FieldValue.serverTimestamp
        },
        { merge: true },
      );
    });

    it("should use default value of 1 when not specified", async () => {
      const userId = "user123";
      const metric = "contactRequests";

      await incrementJobSeekerMetric(userId, metric);

      expect(mockSet).toHaveBeenCalledWith(
        {
          [metric]: expect.any(Object),
          lastUpdated: expect.any(Object),
        },
        { merge: true },
      );
    });

    it("should do nothing when userId is empty", async () => {
      await incrementJobSeekerMetric("", "profileViews", 1);

      expect(mockCollection).not.toHaveBeenCalled();
      expect(mockDoc).not.toHaveBeenCalled();
      expect(mockSet).not.toHaveBeenCalled();
    });

    it("should do nothing when userId is null", async () => {
      await incrementJobSeekerMetric(null as any, "profileViews", 1);

      expect(mockCollection).not.toHaveBeenCalled();
      expect(mockDoc).not.toHaveBeenCalled();
      expect(mockSet).not.toHaveBeenCalled();
    });

    it("should do nothing when userId is undefined", async () => {
      await incrementJobSeekerMetric(undefined as any, "profileViews", 1);

      expect(mockCollection).not.toHaveBeenCalled();
      expect(mockDoc).not.toHaveBeenCalled();
      expect(mockSet).not.toHaveBeenCalled();
    });

    it("should handle all valid job seeker metrics", async () => {
      const userId = "user123";
      const metrics: Array<
        "profileViews" | "contactRequests" | "downloads" | "quality"
      > = ["profileViews", "contactRequests", "downloads", "quality"];

      for (const metric of metrics) {
        await incrementJobSeekerMetric(userId, metric, 1);
      }

      expect(mockSet).toHaveBeenCalledTimes(metrics.length);
    });

    it("should log error when Firestore operation fails", async () => {
      const userId = "user123";
      const metric = "profileViews";
      const error = new Error("Firestore error");

      mockSet.mockRejectedValue(error);

      await incrementJobSeekerMetric(userId, metric, 1);

      expect(mockLoggerError).toHaveBeenCalledWith(
        { err: error, userId, metric, value: 1 },
        "Failed to increment job seeker metric",
      );
    });
  });

  describe("decrementJobSeekerMetric", () => {
    it("should decrement a job seeker metric successfully", async () => {
      const userId = "user123";
      const metric = "downloads";
      const value = 3;

      await decrementJobSeekerMetric(userId, metric, value);

      expect(mockCollection).toHaveBeenCalledWith("jobSeekerMetrics");
      expect(mockDoc).toHaveBeenCalledWith(userId);
      expect(mockSet).toHaveBeenCalledWith(
        {
          [metric]: expect.any(Object), // FieldValue.increment with negative value
          lastUpdated: expect.any(Object),
        },
        { merge: true },
      );
    });

    it("should use default value of 1 when not specified", async () => {
      const userId = "user123";
      const metric = "quality";

      await decrementJobSeekerMetric(userId, metric);

      expect(mockSet).toHaveBeenCalledWith(
        {
          [metric]: expect.any(Object),
          lastUpdated: expect.any(Object),
        },
        { merge: true },
      );
    });

    it("should do nothing when userId is empty", async () => {
      await decrementJobSeekerMetric("", "downloads", 1);

      expect(mockCollection).not.toHaveBeenCalled();
      expect(mockDoc).not.toHaveBeenCalled();
      expect(mockSet).not.toHaveBeenCalled();
    });

    it("should log error when Firestore operation fails", async () => {
      const userId = "user123";
      const metric = "contactRequests";
      const error = new Error("Firestore error");

      mockSet.mockRejectedValue(error);

      await decrementJobSeekerMetric(userId, metric, 1);

      expect(mockLoggerError).toHaveBeenCalledWith(
        { err: error, userId, metric, value: 1 },
        "Failed to decrement job seeker metric",
      );
    });
  });

  describe("incrementRecruiterMetric", () => {
    it("should increment a recruiter metric successfully", async () => {
      const userId = "recruiter123";
      const metric = "searchQueries";
      const value = 10;

      await incrementRecruiterMetric(userId, metric, value);

      expect(mockCollection).toHaveBeenCalledWith("recruiterMetrics");
      expect(mockDoc).toHaveBeenCalledWith(userId);
      expect(mockSet).toHaveBeenCalledWith(
        {
          [metric]: expect.any(Object),
          lastUpdated: expect.any(Object),
        },
        { merge: true },
      );
    });

    it("should use default value of 1 when not specified", async () => {
      const userId = "recruiter123";
      const metric = "profilesViewed";

      await incrementRecruiterMetric(userId, metric);

      expect(mockSet).toHaveBeenCalledWith(
        {
          [metric]: expect.any(Object),
          lastUpdated: expect.any(Object),
        },
        { merge: true },
      );
    });

    it("should do nothing when userId is empty", async () => {
      await incrementRecruiterMetric("", "contactRequests", 1);

      expect(mockCollection).not.toHaveBeenCalled();
      expect(mockDoc).not.toHaveBeenCalled();
      expect(mockSet).not.toHaveBeenCalled();
    });

    it("should handle all valid recruiter metrics", async () => {
      const userId = "recruiter123";
      const metrics: Array<
        | "searchQueries"
        | "profilesViewed"
        | "contactRequests"
        | "resumesShortlisted"
      > = [
        "searchQueries",
        "profilesViewed",
        "contactRequests",
        "resumesShortlisted",
      ];

      for (const metric of metrics) {
        await incrementRecruiterMetric(userId, metric, 1);
      }

      expect(mockSet).toHaveBeenCalledTimes(metrics.length);
    });

    it("should log error when Firestore operation fails", async () => {
      const userId = "recruiter123";
      const metric = "searchQueries";
      const error = new Error("Firestore error");

      mockSet.mockRejectedValue(error);

      await incrementRecruiterMetric(userId, metric, 1);

      expect(mockLoggerError).toHaveBeenCalledWith(
        { err: error, userId, metric, value: 1 },
        "Failed to increment recruiter metric",
      );
    });
  });

  describe("updateRecruiterAccessMetric", () => {
    it("should update recruiter access metric successfully", async () => {
      const userId = "recruiter123";
      const status = "approved";
      const change = 5;

      await updateRecruiterAccessMetric(userId, status, change);

      expect(mockCollection).toHaveBeenCalledWith("recruiterMetrics");
      expect(mockDoc).toHaveBeenCalledWith(userId);
      expect(mockSet).toHaveBeenCalledWith(
        {
          [`accessRequests.${status}`]: expect.any(Object),
          lastUpdated: expect.any(Object),
        },
        { merge: true },
      );
    });

    it("should handle all valid status types", async () => {
      const userId = "recruiter123";
      const statuses: Array<"pending" | "approved" | "denied"> = [
        "pending",
        "approved",
        "denied",
      ];

      for (const status of statuses) {
        await updateRecruiterAccessMetric(userId, status, 1);
      }

      expect(mockSet).toHaveBeenCalledTimes(statuses.length);
    });

    it("should handle positive and negative changes", async () => {
      const userId = "recruiter123";

      // Positive change
      await updateRecruiterAccessMetric(userId, "approved", 5);
      // Negative change
      await updateRecruiterAccessMetric(userId, "denied", -2);

      expect(mockSet).toHaveBeenCalledTimes(2);
    });

    it("should do nothing when userId is empty", async () => {
      await updateRecruiterAccessMetric("", "pending", 1);

      expect(mockCollection).not.toHaveBeenCalled();
      expect(mockDoc).not.toHaveBeenCalled();
      expect(mockSet).not.toHaveBeenCalled();
    });

    it("should log error when Firestore operation fails", async () => {
      const userId = "recruiter123";
      const status = "pending";
      const change = 3;
      const error = new Error("Firestore error");

      mockSet.mockRejectedValue(error);

      await updateRecruiterAccessMetric(userId, status, change);

      expect(mockLoggerError).toHaveBeenCalledWith(
        { err: error, userId, status, change },
        "Failed to update recruiter access metric",
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle Firestore collection errors gracefully", async () => {
      const error = new Error("Collection access denied");
      mockCollection.mockImplementation(() => {
        throw error;
      });

      await expect(
        incrementJobSeekerMetric("user123", "profileViews", 1),
      ).resolves.not.toThrow();

      expect(mockLoggerError).toHaveBeenCalledWith(
        { err: error, userId: "user123", metric: "profileViews", value: 1 },
        "Failed to increment job seeker metric",
      );
    });

    it("should handle Firestore document errors gracefully", async () => {
      const error = new Error("Document access denied");
      mockDoc.mockImplementation(() => {
        throw error;
      });

      await expect(
        incrementRecruiterMetric("recruiter123", "searchQueries", 1),
      ).resolves.not.toThrow();

      expect(mockLoggerError).toHaveBeenCalledWith(
        {
          err: error,
          userId: "recruiter123",
          metric: "searchQueries",
          value: 1,
        },
        "Failed to increment recruiter metric",
      );
    });
  });

  describe("getJobSeekerMetrics", () => {
    it("should return metrics when document exists", async () => {
      const userId = "user123";
      const mockData = {
        profileViews: 10,
        contactRequests: 5,
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => mockData,
      });

      const result = await getJobSeekerMetrics(userId);

      expect(result).toEqual({
        profileViews: 10,
        contactRequests: 5,
      });
      expect(mockCollection).toHaveBeenCalledWith("jobSeekerMetrics");
    });

    it("should trigger lazy migration if contactRequests is missing", async () => {
      const userId = "user123";
      // Document exists but missing contactRequests
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ profileViews: 10 }),
      });

      // Mock resumes query
      const mockCollectionRef = {
        where: jest.fn().mockReturnValue({
          count: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValueOnce({
              data: () => ({ count: 3 }),
            }),
          }),
        }),
      };
      const mockResumeRef = {
        collection: jest.fn().mockReturnValue(mockCollectionRef),
      };
      mockGet.mockResolvedValueOnce({
        docs: [{ ref: mockResumeRef }],
      });

      const result = await getJobSeekerMetrics(userId);

      expect(result.contactRequests).toBe(3);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ contactRequests: 3 }),
        { merge: true },
      );
    });

    it("should return empty metrics when document doesn't exist", async () => {
      const userId = "user123";
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      // Lazy migration will trigger because contactRequests is undefined
      mockGet.mockResolvedValueOnce({ docs: [] });

      const result = await getJobSeekerMetrics(userId);

      expect(result).toEqual({
        contactRequests: 0,
      });
    });
  });

  describe("getRecruiterMetrics", () => {
    it("should return metrics when document exists", async () => {
      const userId = "recruiter123";
      const mockData = {
        totalSearches: 10,
        accessRequests: { pending: 1, approved: 2, denied: 0 },
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => mockData,
      });

      const result = await getRecruiterMetrics(userId);

      expect(result).toEqual(mockData);
    });

    it("should trigger lazy migration if accessRequests is missing", async () => {
      const userId = "recruiter123";
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ totalSearches: 10 }),
      });

      // Mock collectionGroup("accessRequests") query
      mockGet.mockResolvedValueOnce({
        forEach: (cb: any) => {
          cb({ data: () => ({ status: "pending" }) });
          cb({ data: () => ({ status: "approved" }) });
          cb({ data: () => ({ status: "denied" }) });
        },
      });

      // Mock collectionGroup("accessGrants") query
      mockGet.mockResolvedValueOnce({
        forEach: (cb: any) => {
          cb({ data: () => ({}) });
        },
      });

      const result = await getRecruiterMetrics(userId);

      expect(result.accessRequests).toEqual({
        pending: 1,
        approved: 2, // 1 from accessRequests + 1 from accessGrants
        denied: 1,
      });
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        { userId },
        "Performing lazy migration for recruiter access metrics",
      );
    });

    it("should handle error during lazy migration", async () => {
      const userId = "recruiter123";
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ totalSearches: 10 }),
      });

      const error = new Error("Migration failed");
      mockGet.mockRejectedValueOnce(error);

      const result = await getRecruiterMetrics(userId);

      expect(result.accessRequests).toEqual({
        pending: 0,
        approved: 0,
        denied: 0,
      });
      expect(mockLoggerError).toHaveBeenCalledWith(
        { err: error, userId },
        "Failed lazy migration for recruiter access metrics",
      );
    });
  });
});
