import {
  fetchResumeBySlug,
  trackResumeView,
  publishDraft,
  unpublishResume,
  getPublishedResume,
  getResumeEditingStatus,
} from "@/lib/services/resumeService";
import { db } from "@/lib/firebase";
import { adminDb } from "@/lib/firebase-admin";
import { collection, where, getDocs } from "firebase/firestore";
import { logger } from "@/lib/logger";
import { getDraft } from "@/lib/services/draftService";
import { getNextResumeId } from "@/lib/resumeIdMapping";
import { DRAFT_CONFIG } from "@/config/constants";

// Mock Firebase Client
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    batch: jest.fn(),
  },
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock dependencies
jest.mock("@/lib/services/draftService", () => ({
  getDraft: jest.fn(),
}));

jest.mock("@/lib/resumeIdMapping", () => ({
  getNextResumeId: jest.fn(),
}));

// Mock dynamic import of draftIdGenerator
jest.mock("@/lib/draftIdGenerator", () => ({
  generateUniqueDraftId: jest.fn(),
  reserveDraftId: jest.fn(),
}));

describe("resumeService", () => {
  const mockSlug = "test-slug";
  const mockResumeId = "test-resume-id";
  const mockBatch = {
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (adminDb.batch as jest.Mock).mockReturnValue(mockBatch);
  });

  describe("fetchResumeBySlug", () => {
    it("should return resume when found", async () => {
      const mockData = { name: "John Doe", slug: mockSlug };
      const mockDoc = {
        id: mockResumeId,
        data: () => mockData,
      };
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [mockDoc],
      });

      const result = await fetchResumeBySlug(mockSlug);

      expect(collection).toHaveBeenCalledWith(db, "resumes");
      expect(where).toHaveBeenCalledWith("slug", "==", mockSlug);
      expect(result).toEqual({ id: mockResumeId, ...mockData });
    });

    it("should return null when not found", async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await fetchResumeBySlug(mockSlug);

      expect(result).toBeNull();
    });

    it("should return null on error and log the error", async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const result = await fetchResumeBySlug(mockSlug);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ slug: mockSlug }),
        "Error fetching resume"
      );
    });
  });

  describe("trackResumeView", () => {
    it("should query for existing views", async () => {
      (getDocs as jest.Mock).mockResolvedValue({ empty: true });

      await trackResumeView(mockResumeId);

      expect(collection).toHaveBeenCalledWith(db, "resumeViews");
      expect(where).toHaveBeenCalledWith("resumeId", "==", mockResumeId);
    });

    it("should handle errors gracefully and log the error", async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await trackResumeView(mockResumeId);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ resumeId: mockResumeId }),
        "Error tracking resume view"
      );
    });
  });

  describe("publishDraft", () => {
    const mockDraftId = "draft-123";
    const mockUserId = "user-123";
    const mockNumericResumeId = 1001;
    const mockProfile = { name: "Test" };

    beforeEach(() => {
      (getNextResumeId as jest.Mock).mockResolvedValue(mockNumericResumeId);
      // Default mock for collection().doc().get() -> not exists (for getExistingPublishedAt)
      const mockDocRef = {
        get: jest.fn().mockResolvedValue({ exists: false }),
      };
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef),
      });
    });

    it("should publish a new resume successfully", async () => {
      (getDraft as jest.Mock).mockResolvedValue({
        draftId: mockDraftId,
        userId: mockUserId,
        resumeId: null,
        profile: mockProfile,
      });

      const result = await publishDraft(mockDraftId, mockUserId);

      expect(result.resumeId).toBe(mockNumericResumeId);
      expect(result.isBeingEdited).toBe(false);
      expect(mockBatch.set).toHaveBeenCalledTimes(2); // Resume + ID Mapping
      expect(mockBatch.delete).toHaveBeenCalledTimes(2); // Draft + ID Mapping
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it("should republish an existing resume", async () => {
      const existingResumeId = 2002;
      (getDraft as jest.Mock).mockResolvedValue({
        draftId: mockDraftId,
        userId: mockUserId,
        resumeId: existingResumeId,
        profile: mockProfile,
      });

      // Mock existing publishedAt
      const mockDoc = {
        exists: true,
        data: () => ({ publishedAt: "2023-01-01" }),
      };
      const mockDocRef = {
        get: jest.fn().mockResolvedValue(mockDoc),
      };
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef),
      });

      const result = await publishDraft(mockDraftId, mockUserId);

      expect(result.resumeId).toBe(existingResumeId);
      expect(result.publishedAt).toBe("2023-01-01");
      expect(mockBatch.set).toHaveBeenCalledTimes(1); // Resume only (no ID mapping)
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it("should throw if draft not found", async () => {
      (getDraft as jest.Mock).mockResolvedValue(null);
      await expect(publishDraft(mockDraftId, mockUserId)).rejects.toThrow(
        "Draft not found"
      );
    });
  });

  describe("unpublishResume", () => {
    const mockResumeId = 1001;
    const mockUserId = "user-123";
    const mockDraftId = "new-draft-id";

    beforeEach(() => {
      const { generateUniqueDraftId } = require("@/lib/draftIdGenerator");
      generateUniqueDraftId.mockResolvedValue(mockDraftId);
    });

    it("should unpublish successfully", async () => {
      const mockPublishedResume = {
        userId: mockUserId,
        profile: {},
        isBeingEdited: false,
      };

      const mockDoc = {
        exists: true,
        data: () => mockPublishedResume,
      };

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockDoc),
        }),
      });

      const result = await unpublishResume(mockResumeId, mockUserId);

      expect(result.draftId).toBe(mockDraftId);
      expect(mockBatch.set).toHaveBeenCalled(); // Create draft
      expect(mockBatch.update).toHaveBeenCalled(); // Update resume status
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it("should throw if resume not found", async () => {
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false }),
        }),
      });
      await expect(unpublishResume(mockResumeId, mockUserId)).rejects.toThrow(
        "Resume not found"
      );
    });

    it("should throw if already being edited", async () => {
      const mockPublishedResume = {
        userId: mockUserId,
        profile: {},
        isBeingEdited: true,
        editingDraftId: "existing-draft",
      };

      const mockDoc = {
        exists: true,
        data: () => mockPublishedResume,
      };

      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockDoc),
        }),
      });

      await expect(unpublishResume(mockResumeId, mockUserId)).rejects.toThrow(
        "already being edited"
      );
    });
  });

  describe("getPublishedResume", () => {
    it("should return resume if exists", async () => {
      const mockResume = { id: "123" };
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockResume,
          }),
        }),
      });

      const result = await getPublishedResume(123);
      expect(result).toEqual(mockResume);
    });

    it("should return null if not exists", async () => {
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false }),
        }),
      });

      const result = await getPublishedResume(123);
      expect(result).toBeNull();
    });
  });

  describe("getResumeEditingStatus", () => {
    it("should return status if exists", async () => {
      const mockResume = { isBeingEdited: true };
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockResume,
          }),
        }),
      });

      const result = await getResumeEditingStatus(123);
      expect(result).toEqual({ exists: true, isBeingEdited: true });
    });

    it("should return false if not exists", async () => {
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false }),
        }),
      });

      const result = await getResumeEditingStatus(123);
      expect(result).toEqual({ exists: false, isBeingEdited: false });
    });
  });
});
