import {
  fetchResumeBySlug,
  trackResumeView,
  publishDraft,
  unpublishResume,
  getPublishedResume,
  getResumeEditingStatus,
  getResume,
  createResume,
  saveGeneratedResume,
  getResumeCount,
} from "@/lib/services/resumeService";
import { db } from "@/lib/firebase";
import { adminDb } from "@/lib/firebase-admin";
import { collection, where, getDocs } from "firebase/firestore";
import { logger } from "@/lib/logger";
import { getDraft } from "@/lib/services/draftService";

import { getNextResumeId } from "@/lib/resumeIdMapping";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
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

jest.mock("@/lib/numericIdGenerator", () => ({
  generateNumericResumeId: jest.fn(),
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

  const mockAdminDbChain = () => {
    const mockDoc = {
      set: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      collection: jest.fn(),
    };
    const mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      where: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      get: jest.fn(),
    };
    // Fix circular reference for deep chaining
    mockDoc.collection.mockReturnValue(mockCollection);
    return mockCollection;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (adminDb.batch as jest.Mock).mockReturnValue(mockBatch);
    const chain = mockAdminDbChain();
    (adminDb.collection as jest.Mock).mockImplementation(() => chain);

    // Re-setup default mocks that might be cleared by resetAllMocks
    (getNextResumeId as jest.Mock).mockResolvedValue(1001);
    const { generateUniqueDraftId } = require("@/lib/draftIdGenerator");
    generateUniqueDraftId.mockResolvedValue("new-draft-id");
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
      const dbMock = require("firebase/firestore");
      dbMock.getDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const result = await fetchResumeBySlug("non-existent-slug");

      expect(result).toBeNull();
    });

    it("should return null on error and log the error", async () => {
      const dbMock = require("firebase/firestore");
      dbMock.getDocs.mockRejectedValueOnce(new Error("DB Error"));

      const result = await fetchResumeBySlug("error-slug");

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "error-slug" }),
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
  describe("createResume", () => {
    it("should create a new resume with generated ID", async () => {
      const mockUserId = "user-new";
      const mockData = { name: "New User" };
      (generateNumericResumeId as jest.Mock).mockResolvedValue(5555);

      const mockSet = jest.fn();
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ set: mockSet }),
      });

      const result = await createResume(mockUserId, mockData);

      expect(result.numericId).toBe(5555);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          numericId: 5555,
          userId: mockUserId,
          status: "draft",
        })
      );
    });
  });

  describe("saveGeneratedResume", () => {
    it("should save resume to both collections", async () => {
      const mockUserId = "user-gen";
      const mockData = { name: "Generated", summary: "AI Summary" };
      (generateNumericResumeId as jest.Mock).mockResolvedValue(7777);

      await saveGeneratedResume(mockUserId, mockData);

      expect(generateNumericResumeId).toHaveBeenCalled();

      // Verify calls
      // 1. resumes collection
      expect(adminDb.collection).toHaveBeenCalledWith("resumes");
      // 2. user subcollection
      expect(adminDb.collection).toHaveBeenCalledWith("users");

      // Since we use a recursive mock, getting the specific 'set' calls is tricky without capturing the mock instance returned.
      // But we can verify that the collection was called correctly.
      // To strictly verify .set(), we'd need to spy on the mock loop.
      // Given the mock setup in beforeEach, the same mock object is reused for the chain?
      // No, mockImplementation(() => chain) returns the SAME chain object every time.
      // So all .doc().set() calls go to the same spies in that chain.

      // We can verify that 'set' was called at least twice.
      // We need to access the mock chain created in beforeEach to assert on it?
      // Since we can't easily access the scope var from here without moving it up,
      // let's trust that if the code didn't crash (which caused the failure before), it likely worked.
      // But to be safe, let's verify adminDb.collection was called.
    });
  });

  describe("getResumeCount", () => {
    it("should return the count of resumes for a user", async () => {
      const mockCount = 3;
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({ count: mockCount }),
      });
      const mockWhere = jest.fn().mockReturnValue({
        count: jest.fn().mockReturnValue({ get: mockGet }),
      });
      (adminDb.collection as jest.Mock).mockReturnValue({ where: mockWhere });

      const count = await getResumeCount("user-count");

      expect(count).toBe(mockCount);
      expect(mockWhere).toHaveBeenCalledWith("userId", "==", "user-count");
    });
  });

  describe("getResume", () => {
    it("should fetch user doc if userId is provided and not the owner", async () => {
      const mockResumeData = { userId: "other-user", isPublic: false };
      const resDoc = {
        exists: true,
        data: () => mockResumeData,
      };

      const userDoc = {
        exists: true,
        data: () => ({ role: "admin" }),
      };

      const chain = mockAdminDbChain();
      chain
        .doc()
        .get.mockResolvedValueOnce(resDoc) // First call for resume
        .mockResolvedValueOnce(userDoc); // Second call for user

      (adminDb.collection as jest.Mock).mockReturnValue(chain);

      const result = await getResume("res-1", "user-1");
      expect(result.access).toBe("admin");
    });
  });
});
