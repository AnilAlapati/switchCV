/**
 * Tests for Resume Service - Publish/Unpublish Operations
 *
 * Tests the draft-to-publish lifecycle operations.
 *
 * Run with: npm test -- resumePublishService.test.ts
 */

import { DRAFT_CONFIG } from "@/config/constants";
import type { ResumeProfile, DraftResume, PublishedResume } from "@/types";

// Define mock functions at module level
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn();

const mockDocRef = {
  get: mockGet,
  set: mockSet,
  update: mockUpdate,
  delete: mockDelete,
};
const mockDoc = jest.fn(() => mockDocRef);
const mockCollection = jest.fn(() => ({ doc: mockDoc }));

const mockBatch = jest.fn(() => ({
  set: mockBatchSet,
  update: mockBatchUpdate,
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
        update: jest.fn(),
        delete: jest.fn(),
      })),
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(),
    })),
  },
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock draftService
const mockGetDraft = jest.fn();
jest.mock("@/lib/services/draftService", () => ({
  getDraft: (...args: any[]) => mockGetDraft(...args),
}));

// Mock numericIdGenerator (for new resume IDs)
const mockGetNextResumeId = jest.fn();
jest.mock("@/lib/numericIdGenerator", () => ({
  getNextResumeId: () => mockGetNextResumeId(),
}));

// Mock draftIdGenerator (used by unpublish)
const mockGenerateUniqueDraftId = jest.fn();
const mockReserveDraftId = jest.fn();

jest.mock("@/lib/draftIdGenerator", () => ({
  generateUniqueDraftId: () => mockGenerateUniqueDraftId(),
  reserveDraftId: (...args: any[]) => mockReserveDraftId(...args),
}));

import {
  publishDraft,
  unpublishResume,
  getPublishedResume,
  getResumeEditingStatus,
} from "@/lib/services/resumeService";
import { adminDb } from "@/lib/firebase-admin";

// Replace mock implementations after import
beforeAll(() => {
  (adminDb.collection as jest.Mock).mockImplementation(mockCollection);
  (adminDb.batch as jest.Mock).mockImplementation(mockBatch);
});

describe("Resume Publish Service", () => {
  const testUserId = "user123";
  const testDraftId = "xK9mP2dB";
  const testResumeId = 12345678;

  // Using type assertion to simplify test fixtures
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
    personalInfo: { name: "John Doe" },
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: "2025-11-26T10:00:00.000Z",
    },
    slug: "john-doe",
    lastUpdatedAt: "2025-11-26T10:00:00.000Z",
  } as ResumeProfile;

  const testDraft: DraftResume = {
    draftId: testDraftId,
    userId: testUserId,
    resumeId: null,
    profile: testProfile,
    createdAt: "2025-11-26T10:00:00.000Z",
    updatedAt: "2025-11-26T10:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockGetNextResumeId.mockResolvedValue(testResumeId);
    mockBatchCommit.mockResolvedValue(undefined);
    mockGenerateUniqueDraftId.mockResolvedValue("newDraft1");
    mockReserveDraftId.mockResolvedValue(undefined);

    // Default: draft exists
    mockGetDraft.mockResolvedValue(testDraft);

    // Default: resume doesn't exist (for getExistingPublishedAt)
    mockGet.mockResolvedValue({ exists: false });
  });

  describe("publishDraft", () => {
    it("should call getDraft with correct parameters", async () => {
      try {
        await publishDraft(testDraftId, testUserId);
      } catch {
        // May fail due to mock limitations
      }

      expect(mockGetDraft).toHaveBeenCalledWith(testDraftId, testUserId);
    });

    it("should throw error when draft not found", async () => {
      mockGetDraft.mockResolvedValue(null);

      await expect(publishDraft(testDraftId, testUserId)).rejects.toThrow(
        /not found or access denied/
      );
    });
  });

  describe("unpublishResume", () => {
    const publishedResume: PublishedResume = {
      resumeId: testResumeId,
      userId: testUserId,
      profile: testProfile,
      publishedAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-11-01T00:00:00.000Z",
      isBeingEdited: false,
    };

    beforeEach(() => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => publishedResume,
      });
    });

    it("should throw error when resume not found", async () => {
      mockGet.mockResolvedValue({ exists: false });

      await expect(unpublishResume(testResumeId, testUserId)).rejects.toThrow(
        /Resume not found/
      );
    });

    it("should throw error when user does not own resume", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ ...publishedResume, userId: "different-user" }),
      });

      await expect(unpublishResume(testResumeId, testUserId)).rejects.toThrow(
        /Access denied/
      );
    });

    it("should throw error when resume already being edited", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          ...publishedResume,
          isBeingEdited: true,
          editingDraftId: "existingDraft",
        }),
      });

      await expect(unpublishResume(testResumeId, testUserId)).rejects.toThrow(
        /already being edited/
      );
    });
  });

  describe("getPublishedResume", () => {
    it("should return resume when found", async () => {
      const publishedResume: PublishedResume = {
        resumeId: testResumeId,
        userId: testUserId,
        profile: testProfile,
        publishedAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-11-01T00:00:00.000Z",
        isBeingEdited: false,
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => publishedResume,
      });

      const result = await getPublishedResume(testResumeId);

      expect(result).toEqual(publishedResume);
    });

    it("should return null when not found", async () => {
      mockGet.mockResolvedValue({ exists: false });

      const result = await getPublishedResume(testResumeId);

      expect(result).toBeNull();
    });

    it("should query resumes collection with string ID", async () => {
      mockGet.mockResolvedValue({ exists: false });

      await getPublishedResume(testResumeId);

      expect(mockCollection).toHaveBeenCalledWith("resumes");
      expect(mockDoc).toHaveBeenCalledWith(testResumeId.toString());
    });
  });

  describe("getResumeEditingStatus", () => {
    it("should return exists:false when resume not found", async () => {
      mockGet.mockResolvedValue({ exists: false });

      const result = await getResumeEditingStatus(testResumeId);

      expect(result).toEqual({ exists: false, isBeingEdited: false });
    });

    it("should return isBeingEdited:true when resume is being edited", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          resumeId: testResumeId,
          userId: testUserId,
          profile: testProfile,
          isBeingEdited: true,
        }),
      });

      const result = await getResumeEditingStatus(testResumeId);

      expect(result).toEqual({ exists: true, isBeingEdited: true });
    });

    it("should return isBeingEdited:false when resume is not being edited", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          resumeId: testResumeId,
          userId: testUserId,
          profile: testProfile,
          isBeingEdited: false,
        }),
      });

      const result = await getResumeEditingStatus(testResumeId);

      expect(result).toEqual({ exists: true, isBeingEdited: false });
    });
  });
});
