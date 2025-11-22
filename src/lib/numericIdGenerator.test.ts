/**
 * Tests for lib/numericIdGenerator utility
 */

import {
  generateNumericResumeId,
  initializeIdCounter,
  getCurrentIdCounter,
  resetIdCounter,
} from "@/lib/numericIdGenerator";

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    doc: jest.fn(),
    runTransaction: jest.fn(),
  },
}));

jest.mock("firebase-admin", () => ({
  firestore: {
    FieldValue: {
      increment: jest.fn(),
    },
  },
}));

// Mock the recycler
jest.mock("@/lib/resumeIdRecycler", () => ({
  getRecycledIdFromPool: jest.fn(),
}));

import { adminDb } from "@/lib/firebase-admin";
import { getRecycledIdFromPool } from "@/lib/resumeIdRecycler";

const mockDoc = adminDb.doc as jest.Mock;
const mockRunTransaction = adminDb.runTransaction as jest.Mock;
const mockGetRecycledIdFromPool = getRecycledIdFromPool as jest.MockedFunction<
  typeof getRecycledIdFromPool
>;

// Helper mocks for doc return values
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();

describe("Numeric ID Generator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock behaviors
    mockDoc.mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
    });
  });

  describe("initializeIdCounter", () => {
    it("should initialize counter when it doesn't exist", async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      await initializeIdCounter();

      expect(mockDoc).toHaveBeenCalledWith("system/resumeIdCounter");
      expect(mockGet).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({
        currentId: 0,
        lastResetAt: expect.any(String),
        createdAt: expect.any(String),
      });
    });

    it("should not initialize counter when it already exists", async () => {
      mockGet.mockResolvedValue({
        exists: true,
      });

      await initializeIdCounter();

      expect(mockSet).not.toHaveBeenCalled();
    });

    it("should throw error on initialization failure", async () => {
      mockGet.mockRejectedValue(new Error("Firestore error"));

      await expect(initializeIdCounter()).rejects.toThrow(
        "Failed to initialize ID counter"
      );
    });
  });

  describe("generateNumericResumeId", () => {
    it("should return recycled ID when available", async () => {
      mockGetRecycledIdFromPool.mockResolvedValue(42);

      const result = await generateNumericResumeId();

      expect(result).toBe(42);
      expect(mockGetRecycledIdFromPool).toHaveBeenCalled();
      // Should not proceed to counter operations
      expect(mockDoc).not.toHaveBeenCalled();
    });

    it("should generate new ID from counter when no recycled ID available", async () => {
      mockGetRecycledIdFromPool.mockResolvedValue(null);

      // Mock transaction behavior
      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ currentId: 122 }),
          }),
          update: jest.fn(),
          set: jest.fn(),
        };
        return callback(mockTransaction);
      });

      const result = await generateNumericResumeId();

      expect(result).toBe(123);
      expect(mockGetRecycledIdFromPool).toHaveBeenCalled();
      expect(mockDoc).toHaveBeenCalledWith("system/resumeIdCounter");
      expect(mockRunTransaction).toHaveBeenCalled();
    });

    it("should initialize counter if it doesn't exist inside transaction", async () => {
      mockGetRecycledIdFromPool.mockResolvedValue(null);

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: false, // Counter doesn't exist
          }),
          update: jest.fn(),
          set: jest.fn(),
        };
        return callback(mockTransaction);
      });

      const result = await generateNumericResumeId();

      expect(result).toBe(1);
    });

    it("should use fallback random ID when counter operations fail", async () => {
      mockGetRecycledIdFromPool.mockResolvedValue(null);
      mockRunTransaction.mockRejectedValue(new Error("Firestore error"));

      // Mock Math.random to return a predictable value
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5);

      const result = await generateNumericResumeId();

      // Should be between 1000000 and MAX_NUMERIC_ID
      expect(result).toBeGreaterThanOrEqual(1000000);
      expect(result).toBeLessThanOrEqual(99999999);

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it("should handle recycler pool errors gracefully", async () => {
      mockGetRecycledIdFromPool.mockRejectedValue(new Error("Pool error"));

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ currentId: 455 }),
          }),
          update: jest.fn(),
          set: jest.fn(),
        };
        return callback(mockTransaction);
      });

      const result = await generateNumericResumeId();

      expect(result).toBe(456);
      expect(mockGetRecycledIdFromPool).toHaveBeenCalled();
    });
  });

  describe("getCurrentIdCounter", () => {
    it("should return current counter value", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ currentId: 789 }),
      });

      const result = await getCurrentIdCounter();

      expect(result).toBe(789);
      expect(mockDoc).toHaveBeenCalledWith("system/resumeIdCounter");
    });

    it("should return 0 when counter doesn't exist", async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      const result = await getCurrentIdCounter();

      expect(result).toBe(0);
    });

    it("should throw error on firestore failure", async () => {
      mockGet.mockRejectedValue(new Error("Firestore error"));

      await expect(getCurrentIdCounter()).rejects.toThrow();
    });
  });

  describe("resetIdCounter", () => {
    it("should reset counter to specified value", async () => {
      mockSet.mockResolvedValue(undefined);

      await resetIdCounter(1000);

      expect(mockSet).toHaveBeenCalledWith({
        currentId: 1000,
        lastResetAt: expect.any(String),
      });
    });

    it("should reset counter to 0 by default", async () => {
      mockSet.mockResolvedValue(undefined);

      await resetIdCounter();

      expect(mockSet).toHaveBeenCalledWith({
        currentId: 0,
        lastResetAt: expect.any(String),
      });
    });

    it("should throw error on reset failure", async () => {
      mockSet.mockRejectedValue(new Error("Firestore error"));

      await expect(resetIdCounter()).rejects.toThrow();
    });
  });
});
