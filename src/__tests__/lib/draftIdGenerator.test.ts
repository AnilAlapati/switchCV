/**
 * Tests for Draft ID Generator
 *
 * Tests the alphanumeric ID generation system for draft resumes.
 *
 * Run with: npm test -- draftIdGenerator.test.ts
 */

import { DRAFT_CONFIG } from "@/config/constants";

// Define mock functions at module level
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDelete = jest.fn();
const mockTransactionGet = jest.fn();
const mockTransactionSet = jest.fn();
const mockDocRef = {
  get: mockGet,
  set: mockSet,
  delete: mockDelete,
};
const mockDoc = jest.fn(() => mockDocRef);
const mockCollection = jest.fn(() => ({ doc: mockDoc }));
const mockRunTransaction = jest.fn();

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      })),
    })),
    runTransaction: jest.fn(),
  },
}));

import {
  generateUniqueDraftId,
  reserveDraftId,
  releaseDraftId,
  getDraftIdMapping,
} from "@/lib/draftIdGenerator";
import { adminDb } from "@/lib/firebase-admin";

// Replace the mock implementation after import
beforeAll(() => {
  (adminDb.collection as jest.Mock).mockImplementation(mockCollection);
  (adminDb.runTransaction as jest.Mock).mockImplementation(mockRunTransaction);
});

describe("Draft ID Generator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: ID doesn't exist (no collision) - transaction reserves successfully
    mockTransactionGet.mockResolvedValue({ exists: false });
    mockGet.mockResolvedValue({ exists: false });
    mockSet.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue(undefined);

    // Mock runTransaction to execute the callback and simulate atomic check-and-set
    mockRunTransaction.mockImplementation(async (callback) => {
      const transaction = {
        get: mockTransactionGet,
        set: mockTransactionSet,
      };
      return callback(transaction);
    });
  });

  describe("generateUniqueDraftId", () => {
    it("should generate an ID of correct length", async () => {
      const id = await generateUniqueDraftId();

      expect(id).toHaveLength(DRAFT_CONFIG.ID_LENGTH);
    });

    it("should only use allowed characters", async () => {
      const id = await generateUniqueDraftId();
      const charset = DRAFT_CONFIG.ID_CHARSET;

      for (const char of id) {
        expect(charset).toContain(char);
      }
    });

    it("should generate unique IDs on multiple calls", async () => {
      const ids = new Set<string>();
      const count = 10;

      for (let i = 0; i < count; i++) {
        const id = await generateUniqueDraftId();
        ids.add(id);
      }

      // All IDs should be unique (statistically very likely)
      expect(ids.size).toBe(count);
    });

    it("should retry on collision (when ID already exists)", async () => {
      // First transaction returns exists: true (collision), second returns false
      mockTransactionGet
        .mockResolvedValueOnce({ exists: true })
        .mockResolvedValueOnce({ exists: false });

      const id = await generateUniqueDraftId();

      expect(id).toHaveLength(DRAFT_CONFIG.ID_LENGTH);
      expect(mockRunTransaction).toHaveBeenCalledTimes(2);
    });

    it("should throw error after max retries", async () => {
      // All transaction calls return collision (exists: true)
      mockTransactionGet.mockResolvedValue({ exists: true });

      await expect(generateUniqueDraftId()).rejects.toThrow(
        `Failed to generate unique draft ID after ${DRAFT_CONFIG.MAX_ID_RETRIES} attempts`
      );

      expect(mockRunTransaction).toHaveBeenCalledTimes(
        DRAFT_CONFIG.MAX_ID_RETRIES
      );
    });

    it("should use transaction to atomically check and reserve ID", async () => {
      await generateUniqueDraftId();

      // Should call runTransaction for atomic check-and-reserve
      expect(adminDb.runTransaction).toHaveBeenCalled();
      // Transaction should set the reservation
      expect(mockTransactionSet).toHaveBeenCalled();
    });
  });

  describe("reserveDraftId", () => {
    const testDraftId = "xK9mP2dB";
    const testUserId = "user123";
    const testResumeId = 12345678;

    it("should save mapping with all fields", async () => {
      await reserveDraftId(testDraftId, testUserId, testResumeId);

      expect(adminDb.collection).toHaveBeenCalledWith(
        DRAFT_CONFIG.ID_MAPPING_COLLECTION
      );
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          draftId: testDraftId,
          userId: testUserId,
          resumeId: testResumeId,
          createdAt: expect.any(String),
        })
      );
    });

    it("should handle null resumeId for new drafts", async () => {
      await reserveDraftId(testDraftId, testUserId, null);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          draftId: testDraftId,
          userId: testUserId,
          resumeId: null,
        })
      );
    });
  });

  describe("releaseDraftId", () => {
    it("should delete the mapping document", async () => {
      const testDraftId = "xK9mP2dB";

      await releaseDraftId(testDraftId);

      expect(adminDb.collection).toHaveBeenCalledWith(
        DRAFT_CONFIG.ID_MAPPING_COLLECTION
      );
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe("getDraftIdMapping", () => {
    const testDraftId = "xK9mP2dB";

    it("should return mapping info when exists", async () => {
      const mockData = {
        userId: "user123",
        resumeId: 12345678,
        createdAt: "2025-11-26T10:00:00.000Z",
      };
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => mockData,
      });

      const result = await getDraftIdMapping(testDraftId);

      expect(result).toEqual(mockData);
    });

    it("should return null when mapping does not exist", async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      const result = await getDraftIdMapping(testDraftId);

      expect(result).toBeNull();
    });

    it("should handle missing fields gracefully", async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({}),
      });

      const result = await getDraftIdMapping(testDraftId);

      expect(result).toEqual({
        userId: "",
        resumeId: null,
        createdAt: "",
      });
    });
  });
});

describe("Draft ID Character Set", () => {
  it("should not include ambiguous characters", () => {
    const charset = DRAFT_CONFIG.ID_CHARSET;

    // Should not include 0, O, 1, l, I (easily confused)
    expect(charset).not.toContain("0");
    expect(charset).not.toContain("O");
    expect(charset).not.toContain("1");
    expect(charset).not.toContain("l");
    expect(charset).not.toContain("I");
  });

  it("should have sufficient entropy", () => {
    const charset = DRAFT_CONFIG.ID_CHARSET;
    const length = DRAFT_CONFIG.ID_LENGTH;

    // Total possible combinations
    const combinations = Math.pow(charset.length, length);

    // Should be at least 10 billion combinations for uniqueness
    expect(combinations).toBeGreaterThan(10_000_000_000);
  });
});
