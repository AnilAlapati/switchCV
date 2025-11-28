import { publishDraft, unpublishResume } from "../resumeService";
import { adminDb } from "@/lib/firebase-admin";
import { getDraft } from "@/lib/services/draftService";
import { getNextResumeId } from "@/lib/resumeIdMapping";
import { DRAFT_CONFIG } from "@/config/constants";

// Mock dependencies
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    batch: jest.fn(),
  },
}));

jest.mock("@/lib/services/draftService", () => ({
  getDraft: jest.fn(),
}));

jest.mock("@/lib/resumeIdMapping", () => ({
  getNextResumeId: jest.fn(),
}));

jest.mock("@/lib/draftIdGenerator", () => ({
  generateUniqueDraftId: jest.fn().mockResolvedValue("new-draft-id"),
  reserveDraftId: jest.fn().mockResolvedValue(undefined),
}));

describe("resumeService", () => {
  const mockBatch = {
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn(),
  };

  const mockCollection = jest.fn();
  const mockDoc = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (adminDb.batch as jest.Mock).mockReturnValue(mockBatch);
    (adminDb.collection as jest.Mock).mockReturnValue({ doc: mockDoc });
    // Default mock for doc() returns an object with methods
    // We'll override specific calls in tests
    mockDoc.mockReturnValue({
      get: jest.fn().mockResolvedValue({ exists: false }),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    });
  });

  describe("publishDraft", () => {
    it("should publish a new resume", async () => {
      const draftId = "draft-123";
      const userId = "user-123";
      const mockDraft = {
        draftId,
        userId,
        resumeId: null,
        profile: { title: "Test Resume" },
      };

      (getDraft as jest.Mock).mockResolvedValue(mockDraft);
      (getNextResumeId as jest.Mock).mockResolvedValue(1001);

      const result = await publishDraft(draftId, userId);

      expect(result.resumeId).toBe(1001);
      expect(mockBatch.set).toHaveBeenCalledTimes(2); // Resume + ID Mapping
      expect(mockBatch.delete).toHaveBeenCalledTimes(2); // Draft + ID Mapping
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it("should republish an existing resume", async () => {
      const draftId = "draft-123";
      const userId = "user-123";
      const mockDraft = {
        draftId,
        userId,
        resumeId: 1001,
        profile: { title: "Updated Resume" },
      };

      (getDraft as jest.Mock).mockResolvedValue(mockDraft);

      // Mock getExistingPublishedAt logic
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ publishedAt: "2023-01-01" }),
      });

      // We need to ensure when doc(1001) is called, it returns this mock
      // But since we mock collection().doc(), it's generic.
      // We can just make the default mockDoc return this for get()
      mockDoc.mockReturnValue({
        get: mockGet,
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      });

      const result = await publishDraft(draftId, userId);

      expect(result.resumeId).toBe(1001);
      expect(result.publishedAt).toBe("2023-01-01");
      expect(mockBatch.set).toHaveBeenCalledTimes(1); // Resume only
      expect(mockBatch.delete).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe("unpublishResume", () => {
    it("should unpublish a resume and create a draft", async () => {
      const resumeId = 1001;
      const userId = "user-123";
      const mockResume = {
        resumeId,
        userId,
        profile: { title: "Test Resume" },
        isBeingEdited: false,
      };

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockResume,
      });
      mockDoc.mockReturnValue({
        get: mockGet,
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      });

      const result = await unpublishResume(resumeId, userId);

      expect(result.draftId).toBe("new-draft-id");
      expect(mockBatch.set).toHaveBeenCalledTimes(1); // Create draft
      expect(mockBatch.update).toHaveBeenCalledTimes(1); // Update resume status
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it("should throw if resume is already being edited", async () => {
      const resumeId = 1001;
      const userId = "user-123";
      const mockResume = {
        resumeId,
        userId,
        isBeingEdited: true,
        editingDraftId: "existing-draft",
      };

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockResume,
      });
      mockDoc.mockReturnValue({
        get: mockGet,
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      });

      await expect(unpublishResume(resumeId, userId)).rejects.toThrow(
        "already being edited"
      );
    });
  });
});
