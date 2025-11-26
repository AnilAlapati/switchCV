/**
 * Tests for Draft Service
 *
 * Tests the draft resume lifecycle operations including
 * create, get, update, and delete functionality.
 *
 * Run with: npm test -- draftService.test.ts
 */

import { DRAFT_CONFIG } from "@/config/constants";
import type { ResumeProfile, DraftResume } from "@/types";

// Define mock functions at module level
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn();

const mockDocRef = {
  get: mockGet,
  set: mockSet,
};
const mockDoc = jest.fn(() => mockDocRef);
const mockCollectionRef = {
  doc: mockDoc,
  where: mockWhere,
};
const mockCollection = jest.fn(() => mockCollectionRef);

const mockBatch = jest.fn(() => ({
  delete: mockBatchDelete,
  commit: mockBatchCommit,
}));

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
      })),
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
    })),
    batch: jest.fn(() => ({
      delete: jest.fn(),
      commit: jest.fn(),
    })),
  },
}));

// Mock draftIdGenerator
const mockGenerateUniqueDraftId = jest.fn();
const mockReserveDraftId = jest.fn();
const mockReleaseDraftId = jest.fn();
const mockGetDraftIdMapping = jest.fn();

jest.mock("@/lib/draftIdGenerator", () => ({
  generateUniqueDraftId: () => mockGenerateUniqueDraftId(),
  reserveDraftId: (...args: any[]) => mockReserveDraftId(...args),
  releaseDraftId: (...args: any[]) => mockReleaseDraftId(...args),
  getDraftIdMapping: (...args: any[]) => mockGetDraftIdMapping(...args),
}));

import {
  createDraft,
  getDraft,
  getUserActiveDraft,
  updateDraft,
  deleteDraft,
  validateDraftOwnership,
} from "@/lib/services/draftService";
import { adminDb } from "@/lib/firebase-admin";

// Replace mock implementations after import
beforeAll(() => {
  (adminDb.collection as jest.Mock).mockImplementation(mockCollection);
  (adminDb.batch as jest.Mock).mockImplementation(mockBatch);
});

// Setup chainable mocks
beforeEach(() => {
  mockWhere.mockReturnValue({
    limit: mockLimit,
  });
});

describe("Draft Service", () => {
  const testUserId = "user123";
  const testDraftId = "xK9mP2dB";

  // Using any to simplify test fixtures - actual data would have full type compliance
  const testProfile = {
    versionId: "v1",
    templateId: "standard-v1",
    title: "Software Engineer",
    summary: "Experienced developer",
    skills: [
      { name: "JavaScript", level: "expert", visibility: "public" },
      { name: "TypeScript", level: "expert", visibility: "public" },
      { name: "React", level: "advanced", visibility: "public" },
    ],
    experience: [],
    education: [],
    projects: [],
    contact: {
      email: { value: "john@example.com", visibility: "public" },
      phone: { value: "+1234567890", visibility: "masked" },
    },
    personalInfo: {
      name: "John Doe",
    },
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: "2025-11-26T10:00:00.000Z",
    },
    slug: "john-doe",
    lastUpdatedAt: "2025-11-26T10:00:00.000Z",
  } as ResumeProfile;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockGenerateUniqueDraftId.mockResolvedValue(testDraftId);
    mockReserveDraftId.mockResolvedValue(undefined);
    mockReleaseDraftId.mockResolvedValue(undefined);
    mockSet.mockResolvedValue(undefined);
    mockBatchCommit.mockResolvedValue(undefined);

    // Default: no existing draft
    mockLimit.mockReturnValue({
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    });

    // Default: draft doesn't exist
    mockGet.mockResolvedValue({ exists: false });
  });

  describe("createDraft", () => {
    beforeEach(() => {
      // No existing draft
      mockLimit.mockReturnValue({
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      });
    });

    it("should create a new draft successfully", async () => {
      const draft = await createDraft(testUserId, testProfile);

      expect(draft).toEqual(
        expect.objectContaining({
          draftId: testDraftId,
          userId: testUserId,
          profile: testProfile,
          resumeId: null,
        })
      );
      expect(draft.createdAt).toBeDefined();
      expect(draft.updatedAt).toBeDefined();
    });

    it("should generate and reserve a unique ID", async () => {
      await createDraft(testUserId, testProfile);

      expect(mockGenerateUniqueDraftId).toHaveBeenCalled();
      expect(mockReserveDraftId).toHaveBeenCalledWith(
        testDraftId,
        testUserId,
        null
      );
    });

    it("should save draft to Firestore", async () => {
      await createDraft(testUserId, testProfile);

      expect(mockCollection).toHaveBeenCalledWith(DRAFT_CONFIG.COLLECTION);
      expect(mockDoc).toHaveBeenCalledWith(testDraftId);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          draftId: testDraftId,
          userId: testUserId,
          profile: testProfile,
        })
      );
    });

    it("should include resumeId when editing existing resume", async () => {
      const existingResumeId = 12345678;

      const draft = await createDraft(
        testUserId,
        testProfile,
        existingResumeId
      );

      expect(draft.resumeId).toBe(existingResumeId);
      expect(mockReserveDraftId).toHaveBeenCalledWith(
        testDraftId,
        testUserId,
        existingResumeId
      );
    });

    it("should throw error if user already has active draft", async () => {
      const existingDraft: DraftResume = {
        draftId: "existing1",
        userId: testUserId,
        resumeId: null,
        profile: testProfile,
        createdAt: "2025-11-26T09:00:00.000Z",
        updatedAt: "2025-11-26T09:00:00.000Z",
      };

      mockLimit.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [{ data: () => existingDraft }],
        }),
      });

      await expect(createDraft(testUserId, testProfile)).rejects.toThrow(
        /already has an active draft/
      );
    });
  });

  describe("getDraft", () => {
    const existingDraft: DraftResume = {
      draftId: testDraftId,
      userId: testUserId,
      resumeId: null,
      profile: testProfile,
      createdAt: "2025-11-26T10:00:00.000Z",
      updatedAt: "2025-11-26T10:00:00.000Z",
    };

    it("should return draft when found and owned by user", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => existingDraft,
      });

      const result = await getDraft(testDraftId, testUserId);

      expect(result).toEqual(existingDraft);
    });

    it("should return null when draft does not exist", async () => {
      mockGet.mockResolvedValue({ exists: false });

      const result = await getDraft(testDraftId, testUserId);

      expect(result).toBeNull();
    });

    it("should return null when user does not own draft", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ ...existingDraft, userId: "different-user" }),
      });

      const result = await getDraft(testDraftId, testUserId);

      expect(result).toBeNull();
    });

    it("should query correct collection and document", async () => {
      mockGet.mockResolvedValue({ exists: false });

      await getDraft(testDraftId, testUserId);

      expect(mockCollection).toHaveBeenCalledWith(DRAFT_CONFIG.COLLECTION);
      expect(mockDoc).toHaveBeenCalledWith(testDraftId);
    });
  });

  describe("getUserActiveDraft", () => {
    it("should return active draft when exists", async () => {
      const existingDraft: DraftResume = {
        draftId: testDraftId,
        userId: testUserId,
        resumeId: null,
        profile: testProfile,
        createdAt: "2025-11-26T10:00:00.000Z",
        updatedAt: "2025-11-26T10:00:00.000Z",
      };

      mockLimit.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [{ data: () => existingDraft }],
        }),
      });

      const result = await getUserActiveDraft(testUserId);

      expect(result).toEqual(existingDraft);
    });

    it("should return null when no active draft", async () => {
      mockLimit.mockReturnValue({
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      });

      const result = await getUserActiveDraft(testUserId);

      expect(result).toBeNull();
    });

    it("should query by userId with limit 1", async () => {
      mockLimit.mockReturnValue({
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      });

      await getUserActiveDraft(testUserId);

      expect(mockWhere).toHaveBeenCalledWith("userId", "==", testUserId);
      expect(mockLimit).toHaveBeenCalledWith(1);
    });
  });

  describe("updateDraft", () => {
    const existingDraft: DraftResume = {
      draftId: testDraftId,
      userId: testUserId,
      resumeId: null,
      profile: testProfile,
      createdAt: "2025-11-26T10:00:00.000Z",
      updatedAt: "2025-11-26T10:00:00.000Z",
    };

    beforeEach(() => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => existingDraft,
      });
    });

    it("should update profile fields", async () => {
      const updates = { summary: "Updated summary", title: "Senior Engineer" };

      const result = await updateDraft(testDraftId, testUserId, updates);

      expect(result.profile.summary).toBe("Updated summary");
      expect(result.profile.title).toBe("Senior Engineer");
      // Original fields preserved (slug should not have changed)
      expect(result.profile.slug).toBe(testProfile.slug);
    });

    it("should update timestamps", async () => {
      const updates = { summary: "New summary" };
      const beforeUpdate = new Date().toISOString();

      const result = await updateDraft(testDraftId, testUserId, updates);

      expect(result.updatedAt >= beforeUpdate).toBe(true);
      expect(result.profile.lastUpdatedAt >= beforeUpdate).toBe(true);
    });

    it("should save updated draft to Firestore", async () => {
      const updates = { summary: "New summary" };

      await updateDraft(testDraftId, testUserId, updates);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          draftId: testDraftId,
          userId: testUserId,
        })
      );
    });

    it("should throw error when draft not found", async () => {
      mockGet.mockResolvedValue({ exists: false });

      await expect(
        updateDraft(testDraftId, testUserId, { summary: "New" })
      ).rejects.toThrow(/not found or access denied/);
    });

    it("should throw error when not owned by user", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ ...existingDraft, userId: "other-user" }),
      });

      await expect(
        updateDraft(testDraftId, testUserId, { summary: "New" })
      ).rejects.toThrow(/not found or access denied/);
    });
  });

  describe("deleteDraft", () => {
    const existingDraft: DraftResume = {
      draftId: testDraftId,
      userId: testUserId,
      resumeId: null,
      profile: testProfile,
      createdAt: "2025-11-26T10:00:00.000Z",
      updatedAt: "2025-11-26T10:00:00.000Z",
    };

    beforeEach(() => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => existingDraft,
      });
    });

    it("should delete draft document", async () => {
      await deleteDraft(testDraftId, testUserId);

      expect(mockBatchDelete).toHaveBeenCalled();
      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it("should delete both draft and ID mapping atomically", async () => {
      await deleteDraft(testDraftId, testUserId);

      // Should have two delete calls (draft + mapping)
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it("should throw error when draft not found", async () => {
      mockGet.mockResolvedValue({ exists: false });

      await expect(deleteDraft(testDraftId, testUserId)).rejects.toThrow(
        /not found or access denied/
      );
    });

    it("should throw error when not owned by user", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ ...existingDraft, userId: "other-user" }),
      });

      await expect(deleteDraft(testDraftId, testUserId)).rejects.toThrow(
        /not found or access denied/
      );
    });
  });

  describe("validateDraftOwnership", () => {
    it("should return true when user owns draft", async () => {
      mockGetDraftIdMapping.mockResolvedValue({
        userId: testUserId,
        resumeId: null,
        createdAt: "2025-11-26T10:00:00.000Z",
      });

      const result = await validateDraftOwnership(testDraftId, testUserId);

      expect(result).toBe(true);
    });

    it("should return false when user does not own draft", async () => {
      mockGetDraftIdMapping.mockResolvedValue({
        userId: "other-user",
        resumeId: null,
        createdAt: "2025-11-26T10:00:00.000Z",
      });

      const result = await validateDraftOwnership(testDraftId, testUserId);

      expect(result).toBe(false);
    });

    it("should return false when draft does not exist", async () => {
      mockGetDraftIdMapping.mockResolvedValue(null);

      const result = await validateDraftOwnership(testDraftId, testUserId);

      expect(result).toBe(false);
    });
  });
});
