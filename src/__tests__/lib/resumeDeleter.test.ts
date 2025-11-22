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
  });
});
