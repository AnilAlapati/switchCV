import {
  initializeIdPool,
  addDeletedIdToPool,
  getRecycledIdFromPool,
  getIdPoolStatus,
  clearIdPool,
  getIdPoolStats,
} from "@/lib/resumeIdRecycler";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

// Mock firebase-admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    doc: jest.fn(),
    runTransaction: jest.fn(),
  },
}));

jest.mock("firebase-admin", () => ({
  firestore: {
    FieldValue: {
      arrayUnion: jest.fn((val) => ({ arrayUnion: val })),
    },
  },
}));

describe("Resume ID Recycler", () => {
  const mockDocRef = {
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (adminDb.doc as jest.Mock).mockReturnValue(mockDocRef);
  });

  describe("initializeIdPool", () => {
    it("should initialize pool if it does not exist", async () => {
      mockDocRef.get.mockResolvedValue({ exists: false });

      await initializeIdPool();

      expect(mockDocRef.set).toHaveBeenCalledWith({
        deletedIds: [],
        totalRecycled: 0,
        lastUpdatedAt: expect.any(String),
      });
    });

    it("should not initialize pool if it already exists", async () => {
      mockDocRef.get.mockResolvedValue({ exists: true });

      await initializeIdPool();

      expect(mockDocRef.set).not.toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      mockDocRef.get.mockRejectedValue(new Error("DB Error"));

      await expect(initializeIdPool()).rejects.toThrow(
        "Failed to initialize ID pool"
      );
    });
  });

  describe("addDeletedIdToPool", () => {
    it("should add deleted ID to pool", async () => {
      mockDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ deletedIds: [] }),
      });

      await addDeletedIdToPool(123);

      expect(mockDocRef.update).toHaveBeenCalledWith({
        deletedIds: { arrayUnion: 123 },
        lastUpdatedAt: expect.any(String),
      });
    });

    it("should initialize pool if missing before adding", async () => {
      mockDocRef.get
        .mockResolvedValueOnce({ exists: false }) // First check in addDeletedIdToPool
        .mockResolvedValueOnce({ exists: false }) // Check in initializeIdPool
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ deletedIds: [] }),
        }); // Second check in addDeletedIdToPool (for trimming)

      await addDeletedIdToPool(123);

      expect(mockDocRef.set).toHaveBeenCalled(); // From initializeIdPool
      expect(mockDocRef.update).toHaveBeenCalled();
    });

    it("should trim pool if it exceeds max size", async () => {
      const manyIds = Array.from({ length: 10005 }, (_, i) => i);
      mockDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ deletedIds: manyIds, totalRecycled: 10 }),
      });

      await addDeletedIdToPool(99999);

      expect(mockDocRef.set).toHaveBeenCalledWith({
        deletedIds: expect.any(Array),
        totalRecycled: 11,
        lastUpdatedAt: expect.any(String),
      });
      // Should keep last 10000
      const setCall = mockDocRef.set.mock.calls[0][0];
      expect(setCall.deletedIds.length).toBe(10000);
    });

    it("should handle errors gracefully", async () => {
      mockDocRef.get.mockRejectedValue(new Error("DB Error"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await addDeletedIdToPool(123);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("getRecycledIdFromPool", () => {
    it("should return recycled ID if available", async () => {
      (adminDb.runTransaction as jest.Mock).mockImplementation(async (cb) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ deletedIds: [123, 456] }),
          }),
          update: jest.fn(),
        };
        return cb(mockTransaction);
      });

      const result = await getRecycledIdFromPool();

      expect(result).toBe(123);
    });

    it("should return null if pool is empty", async () => {
      (adminDb.runTransaction as jest.Mock).mockImplementation(async (cb) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ deletedIds: [] }),
          }),
        };
        return cb(mockTransaction);
      });

      const result = await getRecycledIdFromPool();

      expect(result).toBeNull();
    });

    it("should return null if pool doc does not exist", async () => {
      (adminDb.runTransaction as jest.Mock).mockImplementation(async (cb) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({ exists: false }),
        };
        return cb(mockTransaction);
      });

      const result = await getRecycledIdFromPool();

      expect(result).toBeNull();
    });

    it("should handle transaction errors", async () => {
      (adminDb.runTransaction as jest.Mock).mockRejectedValue(
        new Error("Transaction failed")
      );
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await getRecycledIdFromPool();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("getIdPoolStatus", () => {
    it("should return pool data", async () => {
      const mockData = { deletedIds: [1, 2], totalRecycled: 5 };
      mockDocRef.get.mockResolvedValue({
        exists: true,
        data: () => mockData,
      });

      const result = await getIdPoolStatus();

      expect(result).toEqual(mockData);
    });

    it("should return null if pool does not exist", async () => {
      mockDocRef.get.mockResolvedValue({ exists: false });

      const result = await getIdPoolStatus();

      expect(result).toBeNull();
    });

    it("should handle errors", async () => {
      mockDocRef.get.mockRejectedValue(new Error("DB Error"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await getIdPoolStatus();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("clearIdPool", () => {
    it("should clear the pool", async () => {
      await clearIdPool();

      expect(mockDocRef.set).toHaveBeenCalledWith({
        deletedIds: [],
        totalRecycled: 0,
        lastUpdatedAt: expect.any(String),
      });
    });

    it("should throw error on failure", async () => {
      mockDocRef.set.mockRejectedValue(new Error("DB Error"));

      await expect(clearIdPool()).rejects.toThrow("DB Error");
    });
  });

  describe("getIdPoolStats", () => {
    it("should return stats", async () => {
      mockDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ deletedIds: [1, 2, 3], totalRecycled: 10 }),
      });

      const stats = await getIdPoolStats();

      expect(stats).toEqual({
        poolSize: 3,
        maxSize: 10000,
        utilizationRate: (3 / 10000) * 100,
        totalRecycled: 10,
      });
    });

    it("should return empty stats if pool missing", async () => {
      mockDocRef.get.mockResolvedValue({ exists: false });

      const stats = await getIdPoolStats();

      expect(stats).toEqual({
        poolSize: 0,
        maxSize: 10000,
        utilizationRate: 0,
        totalRecycled: 0,
      });
    });

    it("should handle errors", async () => {
      mockDocRef.get.mockRejectedValue(new Error("DB Error"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const stats = await getIdPoolStats();

      expect(stats).toEqual({
        poolSize: 0,
        maxSize: 10000,
        utilizationRate: 0,
        totalRecycled: 0,
      });
      consoleSpy.mockRestore();
    });
  });
});
