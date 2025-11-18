/**
 * Tests for lib/numericIdGenerator utility
 */

import {
  generateNumericResumeId,
  initializeIdCounter,
  getCurrentIdCounter,
  resetIdCounter,
} from "@/lib/numericIdGenerator";

// Mock Firebase
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  increment: jest.fn(),
}));

// Mock the recycler
jest.mock("@/lib/resumeIdRecycler", () => ({
  getRecycledIdFromPool: jest.fn(),
}));

// Mock Firebase config
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

import { doc, getDoc, setDoc, increment } from "firebase/firestore";
import { getRecycledIdFromPool } from "@/lib/resumeIdRecycler";

const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
const mockIncrement = increment as jest.MockedFunction<typeof increment>;
const mockGetRecycledIdFromPool = getRecycledIdFromPool as jest.MockedFunction<
  typeof getRecycledIdFromPool
>;

describe("Numeric ID Generator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initializeIdCounter", () => {
    it("should initialize counter when it doesn't exist", async () => {
      const mockCounterRef = {};
      mockDoc.mockReturnValue(mockCounterRef as any);
      mockGetDoc.mockResolvedValue({
        exists: jest.fn().mockReturnValue(false),
      } as any);

      await initializeIdCounter();

      expect(mockDoc).toHaveBeenCalledWith({}, "system/resumeIdCounter");
      expect(mockGetDoc).toHaveBeenCalledWith(mockCounterRef);
      expect(mockSetDoc).toHaveBeenCalledWith(mockCounterRef, {
        currentId: 0,
        lastResetAt: expect.any(String),
        createdAt: expect.any(String),
      });
    });

    it("should not initialize counter when it already exists", async () => {
      const mockCounterRef = {};
      mockDoc.mockReturnValue(mockCounterRef as any);
      mockGetDoc.mockResolvedValue({
        exists: jest.fn().mockReturnValue(true),
      } as any);

      await initializeIdCounter();

      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it("should throw error on initialization failure", async () => {
      mockDoc.mockImplementation(() => {
        throw new Error("Firestore error");
      });

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
      const mockCounterRef = {};
      mockGetRecycledIdFromPool.mockResolvedValue(null);
      mockDoc.mockReturnValue(mockCounterRef as any);
      mockGetDoc.mockResolvedValue({
        exists: jest.fn().mockReturnValue(true),
      } as any);
      mockIncrement.mockReturnValue("incremented" as any);
      mockSetDoc.mockResolvedValue(undefined);
      mockGetDoc
        .mockResolvedValueOnce({
          exists: jest.fn().mockReturnValue(true),
        } as any)
        .mockResolvedValueOnce({
          data: jest.fn().mockReturnValue({ currentId: 123 }),
        } as any);

      const result = await generateNumericResumeId();

      expect(result).toBe(123);
      expect(mockGetRecycledIdFromPool).toHaveBeenCalled();
      expect(mockDoc).toHaveBeenCalledWith({}, "system/resumeIdCounter");
      expect(mockSetDoc).toHaveBeenCalledWith(
        mockCounterRef,
        { currentId: "incremented" },
        { merge: true }
      );
    });

    it("should initialize counter if it doesn't exist", async () => {
      const mockCounterRef = {};
      mockGetRecycledIdFromPool.mockResolvedValue(null);
      mockDoc.mockReturnValue(mockCounterRef as any);

      // First getDoc call (check if counter exists) - returns false
      mockGetDoc.mockResolvedValueOnce({
        exists: jest.fn().mockReturnValue(false),
      } as any);

      // Second getDoc call (after initialization check) - returns true
      mockGetDoc.mockResolvedValueOnce({
        exists: jest.fn().mockReturnValue(true),
      } as any);

      // Third getDoc call (fetch updated value) - returns the incremented value
      mockGetDoc.mockResolvedValueOnce({
        data: jest.fn().mockReturnValue({ currentId: 1 }),
      } as any);

      mockSetDoc.mockResolvedValue(undefined);

      const result = await generateNumericResumeId();

      expect(result).toBe(1);
      // Should call setDoc at least once for initialization
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it("should use fallback random ID when counter operations fail", async () => {
      const mockCounterRef = {};
      mockGetRecycledIdFromPool.mockResolvedValue(null);
      mockDoc.mockReturnValue(mockCounterRef as any);
      mockGetDoc.mockRejectedValue(new Error("Firestore error"));

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

    it("should use fallback random ID when counter operations fail", async () => {
      const mockCounterRef = {};
      mockGetRecycledIdFromPool.mockResolvedValue(null);
      mockDoc.mockReturnValue(mockCounterRef as any);
      mockGetDoc.mockRejectedValue(new Error("Firestore error"));

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
      const mockCounterRef = {};
      mockGetRecycledIdFromPool.mockRejectedValue(new Error("Pool error"));
      mockDoc.mockReturnValue(mockCounterRef as any);
      mockGetDoc.mockResolvedValue({
        exists: jest.fn().mockReturnValue(true),
      } as any);
      mockIncrement.mockReturnValue("incremented" as any);
      mockSetDoc.mockResolvedValue(undefined);
      mockGetDoc
        .mockResolvedValueOnce({
          exists: jest.fn().mockReturnValue(true),
        } as any)
        .mockResolvedValueOnce({
          data: jest.fn().mockReturnValue({ currentId: 456 }),
        } as any);

      const result = await generateNumericResumeId();

      expect(result).toBe(456);
      expect(mockGetRecycledIdFromPool).toHaveBeenCalled();
    });
  });

  describe("getCurrentIdCounter", () => {
    it("should return current counter value", async () => {
      const mockCounterRef = {};
      mockDoc.mockReturnValue(mockCounterRef as any);
      mockGetDoc.mockResolvedValue({
        exists: jest.fn().mockReturnValue(true),
        data: jest.fn().mockReturnValue({ currentId: 789 }),
      } as any);

      const result = await getCurrentIdCounter();

      expect(result).toBe(789);
      expect(mockDoc).toHaveBeenCalledWith({}, "system/resumeIdCounter");
    });

    it("should return 0 when counter doesn't exist", async () => {
      const mockCounterRef = {};
      mockDoc.mockReturnValue(mockCounterRef as any);
      mockGetDoc.mockResolvedValue({
        exists: jest.fn().mockReturnValue(false),
      } as any);

      const result = await getCurrentIdCounter();

      expect(result).toBe(0);
    });

    it("should throw error on firestore failure", async () => {
      mockDoc.mockImplementation(() => {
        throw new Error("Firestore error");
      });

      await expect(getCurrentIdCounter()).rejects.toThrow();
    });
  });

  describe("resetIdCounter", () => {
    it("should reset counter to specified value", async () => {
      const mockCounterRef = {};
      mockDoc.mockReturnValue(mockCounterRef as any);
      mockSetDoc.mockResolvedValue(undefined);

      await resetIdCounter(1000);

      expect(mockSetDoc).toHaveBeenCalledWith(mockCounterRef, {
        currentId: 1000,
        lastResetAt: expect.any(String),
      });
    });

    it("should reset counter to 0 by default", async () => {
      const mockCounterRef = {};
      mockDoc.mockReturnValue(mockCounterRef as any);
      mockSetDoc.mockResolvedValue(undefined);

      await resetIdCounter();

      expect(mockSetDoc).toHaveBeenCalledWith(mockCounterRef, {
        currentId: 0,
        lastResetAt: expect.any(String),
      });
    });

    it("should throw error on reset failure", async () => {
      mockDoc.mockImplementation(() => {
        throw new Error("Firestore error");
      });

      await expect(resetIdCounter()).rejects.toThrow();
    });
  });
});
