import {
  deleteResumeById,
  deleteResumeByNumericId,
  deleteResumeBySlug,
} from "@/lib/resumeDeleter";
import { deleteDoc, getDoc, getDocs } from "firebase/firestore";
import { addDeletedIdToPool } from "@/lib/resumeIdRecycler";

// Mock Firebase
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  deleteDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  writeBatch: jest.fn(() => ({
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("@/lib/resumeIdRecycler", () => ({
  addDeletedIdToPool: jest.fn(),
}));

describe("resumeDeleter", () => {
  const mockResumeId = "test-resume-id";
  const mockUserId = "test-user-id";
  const mockNumericId = 123;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("deleteResumeById", () => {
    it("should delete resume successfully", async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ userId: mockUserId, numericId: mockNumericId }),
      });

      const result = await deleteResumeById(mockResumeId, mockUserId);

      expect(deleteDoc).toHaveBeenCalled();
      expect(addDeletedIdToPool).toHaveBeenCalledWith(mockNumericId);
      expect(result.success).toBe(true);
    });

    it("should fail if resume not found", async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const result = await deleteResumeById(mockResumeId, mockUserId);

      expect(deleteDoc).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toContain("Resume not found");
    });

    it("should fail if unauthorized", async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ userId: "other-user", numericId: mockNumericId }),
      });

      const result = await deleteResumeById(mockResumeId, mockUserId);

      expect(deleteDoc).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toContain("Unauthorized");
    });

    it("should handle errors gracefully", async () => {
      (getDoc as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const result = await deleteResumeById(mockResumeId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Failed to delete resume");
    });

    it("should handle subcollection deletion and recycling failure", async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ userId: mockUserId, numericId: mockNumericId }),
      });

      // Mock getDocs to return successful subcollection documents for both calls
      (getDocs as jest.Mock)
        .mockResolvedValueOnce({
          empty: false,
          size: 2,
          docs: [{ ref: {} }, { ref: {} }],
        })
        .mockResolvedValueOnce({
          empty: false,
          size: 1,
          docs: [{ ref: {} }],
        });

      // Mock recycling failure
      (addDeletedIdToPool as jest.Mock).mockRejectedValue(new Error("Recycling Error"));

      const result = await deleteResumeById(mockResumeId, mockUserId);

      expect(result.success).toBe(true);
      expect(addDeletedIdToPool).toHaveBeenCalledWith(mockNumericId);
    });

    it("should handle subcollection deletion failure gracefully", async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ userId: mockUserId, numericId: mockNumericId }),
      });

      // Mock getDocs to throw for subcollections
      (getDocs as jest.Mock).mockRejectedValue(new Error("Subcollection error"));

      const result = await deleteResumeById(mockResumeId, mockUserId);

      expect(result.success).toBe(true);
      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  describe("deleteResumeByNumericId", () => {
    it("should delete resume by numeric ID", async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ id: mockResumeId }],
      });
      // Mock getDoc for the internal deleteResumeById call
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ userId: mockUserId, numericId: mockNumericId }),
      });

      const result = await deleteResumeByNumericId(mockNumericId, mockUserId);

      expect(result.success).toBe(true);
      expect(result.documentId).toBe(mockResumeId);
    });

    it("should fail if numeric ID not found", async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: true,
      });

      const result = await deleteResumeByNumericId(mockNumericId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Resume not found");
    });

    it("should handle failure when deleting by numeric ID", async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ id: mockResumeId }],
      });
      // Mock failure in deleteResumeById
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ userId: "other-user", numericId: mockNumericId }),
      });

      const result = await deleteResumeByNumericId(mockNumericId, mockUserId);
      expect(result.success).toBe(false);
    });

    it("should handle errors in deleteResumeByNumericId", async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error("Query failed"));
      const result = await deleteResumeByNumericId(mockNumericId, mockUserId);
      expect(result.success).toBe(false);
    });
  });

  describe("deleteResumeBySlug", () => {
    it("should delete resume by slug", async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ id: mockResumeId }],
      });
      // Mock getDoc for the internal deleteResumeById call
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ userId: mockUserId, numericId: mockNumericId }),
      });

      const result = await deleteResumeBySlug("test-slug", mockUserId);

      expect(result.success).toBe(true);
      expect(result.documentId).toBe(mockResumeId);
    });

    it("should fail if slug not found", async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: true,
      });

      const result = await deleteResumeBySlug("test-slug", mockUserId);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Resume not found");
    });

    it("should handle error in deleteResumeBySlug", async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error("Slug query failed"));
      const result = await deleteResumeBySlug("test-slug", mockUserId);
      expect(result.success).toBe(false);
    });

    it("should handle failure when deleting by slug", async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ id: mockResumeId }],
      });
      // Mock failure in deleteResumeById
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ userId: "other-user", numericId: mockNumericId }),
      });

      const result = await deleteResumeBySlug("test-slug", mockUserId);
      expect(result.success).toBe(false);
    });
  });

  describe("empty subcollections", () => {
    it("should handle empty subcollections successfully", async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ userId: mockUserId, numericId: mockNumericId }),
      });
      // Mock getDocs to return empty snapshot for subcollections
      (getDocs as jest.Mock).mockResolvedValue({ empty: true });

      const result = await deleteResumeById(mockResumeId, mockUserId);
      expect(result.success).toBe(true);
    });
  });
});
