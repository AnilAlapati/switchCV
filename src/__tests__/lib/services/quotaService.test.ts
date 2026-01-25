import {
  consumeQuota,
  QuotaExceededError,
  refundQuota,
  getQuotaUsage,
} from "@/lib/services/quotaService";
import { adminDb } from "@/lib/firebase-admin";
import { quotaCache } from "@/lib/utils/cache";

// Mock firebase-admin
jest.mock("@/lib/firebase-admin", () => {
  const mockTransaction = {
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
  };

  const mockDoc = {
    id: "mock-doc-id",
  };

  const mockCollection = {
    doc: jest.fn().mockReturnValue(mockDoc),
  };

  const mockDb = {
    collection: jest.fn().mockReturnValue(mockCollection),
    runTransaction: jest.fn(
      async (callback) => await callback(mockTransaction),
    ),
  };

  return {
    __esModule: true,
    default: {
      firestore: {
        FieldValue: {
          serverTimestamp: jest.fn().mockReturnValue("SERVER_TIMESTAMP"),
        },
        Timestamp: {
          fromMillis: jest.fn((ms) => ({ toMillis: () => ms })),
        },
      },
    },
    adminDb: mockDb,
  };
});

describe("quotaService", () => {
  const mockTransaction = {
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (adminDb.runTransaction as jest.Mock).mockImplementation(
      async (callback) => {
        return await callback(mockTransaction);
      },
    );
  });

  describe("consumeQuota", () => {
    const baseRequest = {
      subjectId: "user123",
      scope: "ai_generation",
      limit: 5,
      period: "daily" as const,
    };

    it("should successfully consume quota when under limit", async () => {
      // Mock empty document (first use)
      mockTransaction.get.mockResolvedValue({
        exists: false,
        data: () => null,
      });

      const result = await consumeQuota(baseRequest);

      expect(result.count).toBe(1);
      expect(result.remaining).toBe(4);
      expect(mockTransaction.set).toHaveBeenCalled();
      expect(adminDb.collection).toHaveBeenCalledWith("usageQuotas");
    });

    it("should successfully increment existing quota", async () => {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth() + 1;
      const day = now.getUTCDate();
      const key = `${year}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;

      // Mock existing document with count 2
      mockTransaction.get.mockResolvedValue({
        exists: true,
        data: () => ({
          periodKey: key,
          count: 2,
        }),
      });

      const result = await consumeQuota(baseRequest);

      expect(result.count).toBe(3);
      expect(result.remaining).toBe(2);
    });

    it("should reset count if period key does not match", async () => {
      // Mock existing document from old period
      mockTransaction.get.mockResolvedValue({
        exists: true,
        data: () => ({
          periodKey: "2023-01-01", // Old date
          count: 5, // Was at limit
        }),
      });

      const result = await consumeQuota(baseRequest);

      expect(result.count).toBe(1); // Should reset to 1
      expect(result.remaining).toBe(4);
    });

    it("should throw QuotaExceededError when limit reached", async () => {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth() + 1;
      const day = now.getUTCDate();
      const key = `${year}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;

      // Mock existing document at limit
      mockTransaction.get.mockResolvedValue({
        exists: true,
        data: () => ({
          periodKey: key,
          count: 5,
        }),
      });

      await expect(consumeQuota(baseRequest)).rejects.toThrow(
        QuotaExceededError,
      );
      expect(mockTransaction.set).not.toHaveBeenCalled();
    });

    it("should throw error for invalid limit", async () => {
      await expect(consumeQuota({ ...baseRequest, limit: 0 })).rejects.toThrow(
        QuotaExceededError,
      );
      await expect(consumeQuota({ ...baseRequest, limit: -1 })).rejects.toThrow(
        QuotaExceededError,
      );
    });

    it("should handle monthly period correctly", async () => {
      const monthlyRequest = { ...baseRequest, period: "monthly" as const };

      mockTransaction.get.mockResolvedValue({
        exists: false,
        data: () => null,
      });

      const result = await consumeQuota(monthlyRequest);

      expect(result.count).toBe(1);

      // Verify the key format in the set call
      const setCall = mockTransaction.set.mock.calls[0];
      const data = setCall[1];
      expect(data.periodKey).toMatch(/^\d{4}-\d{2}$/); // YYYY-MM
    });
  });

  describe("refundQuota", () => {
    const baseRequest = {
      subjectId: "user123",
      scope: "ai_generation",
      period: "daily" as const,
    };

    it("should successfully refund quota when count > 0", async () => {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth() + 1;
      const day = now.getUTCDate();
      const key = `${year}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;

      mockTransaction.get.mockResolvedValue({
        exists: true,
        data: () => ({
          periodKey: key,
          count: 3,
        }),
      });

      const result = await refundQuota(baseRequest);

      expect(result.refunded).toBe(true);
      expect(result.currentCount).toBe(2);
      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          count: 2,
        }),
      );
    });

    it("should not refund when document does not exist", async () => {
      mockTransaction.get.mockResolvedValue({
        exists: false,
        data: () => null,
      });

      const result = await refundQuota(baseRequest);

      expect(result.refunded).toBe(false);
      expect(result.currentCount).toBe(0);
      expect(result.reason).toBe("No quota record found for this period");
      expect(mockTransaction.update).not.toHaveBeenCalled();
    });

    it("should not refund when period key does not match", async () => {
      mockTransaction.get.mockResolvedValue({
        exists: true,
        data: () => ({
          periodKey: "2023-01-01", // Old date
          count: 3,
        }),
      });

      const result = await refundQuota(baseRequest);

      expect(result.refunded).toBe(false);
      expect(result.reason).toBe(
        "Quota period has changed, refund not applicable",
      );
      expect(mockTransaction.update).not.toHaveBeenCalled();
    });

    it("should not refund when count is already 0", async () => {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth() + 1;
      const day = now.getUTCDate();
      const key = `${year}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;

      mockTransaction.get.mockResolvedValue({
        exists: true,
        data: () => ({
          periodKey: key,
          count: 0,
        }),
      });

      const result = await refundQuota(baseRequest);

      expect(result.refunded).toBe(false);
      expect(result.currentCount).toBe(0);
      expect(result.reason).toBe("No quota to refund");
      expect(mockTransaction.update).not.toHaveBeenCalled();
    });

    it("should handle monthly period correctly", async () => {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth() + 1;
      const key = `${year}-${month.toString().padStart(2, "0")}`;

      const monthlyRequest = { ...baseRequest, period: "monthly" as const };

      mockTransaction.get.mockResolvedValue({
        exists: true,
        data: () => ({
          periodKey: key,
          count: 5,
        }),
      });

      const result = await refundQuota(monthlyRequest);

      expect(result.refunded).toBe(true);
      expect(result.currentCount).toBe(4);
    });
  });

  describe("getQuotaUsage", () => {
    const subjectId = "user123";
    const scope = "ai_generation";
    const period = "daily" as const;

    beforeEach(() => {
      quotaCache.clear();
    });

    it("should return cached value if available", async () => {
      const now = new Date();
      const key = `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toString().padStart(2, "0")}-${now.getUTCDate().toString().padStart(2, "0")}`;
      const cacheKey = `quota:${scope}:${subjectId}:${key}`;

      quotaCache.set(cacheKey, 10);

      const usage = await getQuotaUsage(subjectId, scope, period);
      expect(usage).toBe(10);
      expect(adminDb.collection).not.toHaveBeenCalled();
    });

    it("should fetch from DB and cache on cache miss", async () => {
      const now = new Date();
      const key = `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toString().padStart(2, "0")}-${now.getUTCDate().toString().padStart(2, "0")}`;

      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          data: () => ({
            periodKey: key,
            count: 5,
          }),
        }),
      };

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDoc),
      });

      const usage = await getQuotaUsage(subjectId, scope, period);
      expect(usage).toBe(5);
      expect(adminDb.collection).toHaveBeenCalledWith("usageQuotas");
    });

    it("should return 0 if doc does not exist", async () => {
      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          data: () => null,
        }),
      };

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDoc),
      });

      const usage = await getQuotaUsage(subjectId, scope, period);
      expect(usage).toBe(0);
    });

    it("should return 0 if periodKey does not match", async () => {
      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          data: () => ({
            periodKey: "old-key",
            count: 10,
          }),
        }),
      };

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDoc),
      });

      const usage = await getQuotaUsage(subjectId, scope, period);
      expect(usage).toBe(0);
    });
  });

  describe("Extra Coverage", () => {
    it("should handle lifetime period in getPeriodMetadata", async () => {
      mockTransaction.get.mockResolvedValue({
        exists: false,
        data: () => null,
      });

      const result = await consumeQuota({
        subjectId: "user123",
        scope: "test",
        limit: 1,
        period: "lifetime",
      });

      expect(result.count).toBe(1);
      // resetTime for lifetime is a very large number
      expect(result.resetTime).toBeGreaterThan(Date.now() + 1000000000);
    });

    it("should throw error if limit is not finite or <= 0", async () => {
      await expect(
        consumeQuota({
          subjectId: "user123",
          scope: "test",
          limit: 0,
          period: "daily",
        }),
      ).rejects.toThrow(QuotaExceededError);

      await expect(
        consumeQuota({
          subjectId: "user123",
          scope: "test",
          limit: -1,
          period: "daily",
        }),
      ).rejects.toThrow(QuotaExceededError);

      await expect(
        consumeQuota({
          subjectId: "user123",
          scope: "test",
          limit: Infinity, // Wait, Number.isFinite(Infinity) is false
          period: "daily",
        }),
      ).rejects.toThrow();
    });
  });
});
