import {
  checkDistributedRateLimit,
  cleanupExpiredRateLimits,
  aiSearchRateLimiter,
  createDistributedRateLimiter,
} from "./distributedRateLimit";
import { adminDb } from "@/lib/firebase-admin";

// Mock dependencies
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    runTransaction: jest.fn(),
    batch: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock("@/lib/getSystemConfig", () => ({
  getConstants: jest.fn().mockResolvedValue({
    RATE_LIMITS: {
      API_REQUESTS_PER_MINUTE: 10,
    },
  }),
}));

describe("distributedRateLimit", () => {
  const mockIdentifier = "test-user";
  const mockDocId = "default_test-user"; // scope_identifier

  let mockTransaction: any;
  let mockDocRef: any;
  let mockDocSnapshot: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDocRef = {
      path: `rateLimits/${mockDocId}`,
    };

    (adminDb.collection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue(mockDocRef),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn(),
    });

    mockTransaction = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
    };

    (adminDb.runTransaction as jest.Mock).mockImplementation(
      async (callback) => {
        return callback(mockTransaction);
      }
    );
  });

  describe("checkDistributedRateLimit", () => {
    it("should allow request and create new entry if none exists", async () => {
      // Mock no existing doc
      mockDocSnapshot = {
        exists: false,
        data: () => undefined,
      };
      mockTransaction.get.mockResolvedValue(mockDocSnapshot);

      const result = await checkDistributedRateLimit(mockIdentifier);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
      expect(mockTransaction.set).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          count: 1,
          identifier: mockIdentifier,
        })
      );
    });

    it("should allow request and increment count if within limit", async () => {
      // Mock existing doc with count 5 (limit 10)
      mockDocSnapshot = {
        exists: true,
        data: () => ({
          count: 5,
          windowStart: Date.now(),
          limit: 10,
        }),
      };
      mockTransaction.get.mockResolvedValue(mockDocSnapshot);

      const result = await checkDistributedRateLimit(mockIdentifier, {
        limit: 10,
      });

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(6);
      expect(mockTransaction.update).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          count: 6,
        })
      );
    });

    it("should deny request if limit reached", async () => {
      // Mock existing doc with count 10 (limit 10)
      mockDocSnapshot = {
        exists: true,
        data: () => ({
          count: 10,
          windowStart: Date.now(),
        }),
      };
      mockTransaction.get.mockResolvedValue(mockDocSnapshot);

      const result = await checkDistributedRateLimit(mockIdentifier, {
        limit: 10,
      });

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(11); // It increments locally before returning result, but sets allowed=false
      // Wait, let's check implementation logic:
      // const newCount = data.count + 1;
      // const allowed = newCount <= limit;
      // transaction.update(...)
      // return { allowed, ... }

      expect(mockTransaction.update).toHaveBeenCalled(); // It still updates the count in DB to track attempts?
      // Yes, standard rate limiters often track blocked attempts too.
    });

    it("should reset window if expired", async () => {
      const pastTime = Date.now() - 70000; // 70s ago (window is 60s)

      mockDocSnapshot = {
        exists: true,
        data: () => ({
          count: 10,
          windowStart: pastTime,
        }),
      };
      mockTransaction.get.mockResolvedValue(mockDocSnapshot);

      const result = await checkDistributedRateLimit(mockIdentifier, {
        windowMs: 60000,
      });

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1); // Reset to 1
      expect(mockTransaction.set).toHaveBeenCalled(); // Should set new entry, not update
    });

    it("should fail-closed (deny) on transaction error", async () => {
      (adminDb.runTransaction as jest.Mock).mockRejectedValue(
        new Error("DB Error")
      );

      const result = await checkDistributedRateLimit(mockIdentifier);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should use default options if not provided", async () => {
      mockDocSnapshot = { exists: false, data: () => undefined };
      mockTransaction.get.mockResolvedValue(mockDocSnapshot);

      const result = await checkDistributedRateLimit(mockIdentifier, {
        limit: undefined,
        windowMs: undefined,
        scope: undefined,
      });
      expect(result.limit).toBe(10); // Default from mock getConstants
    });
  });

  describe("cleanupExpiredRateLimits", () => {
    it("should delete expired documents", async () => {
      const mockBatch = {
        delete: jest.fn(),
        commit: jest.fn(),
      };
      (adminDb.batch as jest.Mock).mockReturnValue(mockBatch);

      const mockExpiredDocs = {
        empty: false,
        size: 2,
        docs: [{ ref: "ref1" }, { ref: "ref2" }],
      };

      // Ensure chain: adminDb.collection().where().limit().get()
      const mockGet = jest.fn().mockResolvedValue(mockExpiredDocs);
      const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });

      (adminDb.collection as jest.Mock).mockReturnValue({
        where: mockWhere,
      });

      const count = await cleanupExpiredRateLimits();

      expect(count).toBe(2);
      expect(mockBatch.delete).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it("should return 0 if no expired documents", async () => {
      const mockExpiredDocs = {
        empty: true,
        size: 0,
        docs: [],
      };

      const mockGet = jest.fn().mockResolvedValue(mockExpiredDocs);
      const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });

      (adminDb.collection as jest.Mock).mockReturnValue({
        where: mockWhere,
      });

      const count = await cleanupExpiredRateLimits();

      expect(count).toBe(0);
      expect(adminDb.batch).not.toHaveBeenCalled();
    });
  });

  describe("createDistributedRateLimiter", () => {
    it("should create a configured rate limiter function", async () => {
      // Mock for checkDistributedRateLimit internal call
      // Since we can't easily spy on the exported function from same module in Jest without complex setup,
      // we will verify the behavior via the side effects (adminDb calls)

      const limiter = createDistributedRateLimiter("test-scope", { limit: 50 });

      mockDocSnapshot = { exists: false, data: () => undefined };
      mockTransaction.get.mockResolvedValue(mockDocSnapshot);

      await limiter("user-1");

      // Verify correct scope and limit were passed down
      // Doc ID should be "test-scope:user-1" -> "test-scope_user-1"
      expect(adminDb.collection).toHaveBeenCalledWith("rateLimits");

      // We can't check the specific args to checkDistributedRateLimit directly,
      // but we can check if a document was set with the right scope
      expect(mockTransaction.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          scope: "test-scope",
          identifier: "user-1",
        })
      );
    });

    it("should have a working aiSearchRateLimiter", async () => {
      mockDocSnapshot = { exists: false, data: () => undefined };
      mockTransaction.get.mockResolvedValue(mockDocSnapshot);

      const result = await aiSearchRateLimiter("ai-user");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
    });
  });
});
