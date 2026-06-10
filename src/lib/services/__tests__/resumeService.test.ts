import {
  publishDraft,
  unpublishResume,
  getPublishedResume,
  getResumeEditingStatus,
  createResume,
  getResumeCount,
  getResume,
  deleteResume,
  updateResumeEmbedding,
  saveGeneratedResume,
  fetchResumeBySlug,
  trackResumeView,
  checkPrivateResumeAccess,
  updateResume,
} from "../resumeService";
import { adminDb } from "@/lib/firebase-admin";
import { getDraft } from "@/lib/services/draftService";
import { getNextResumeId } from "@/lib/resumeIdMapping";
import { DRAFT_CONFIG } from "@/config/constants";
import { getDocs as mockGetDocs } from "firebase/firestore";
import { logger } from "@/lib/logger";

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock dependencies
jest.mock("firebase-admin", () => ({
  firestore: {
    FieldValue: {
      arrayUnion: jest.fn((val) => val),
    },
  },
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn().mockReturnValue({ _collectionRef: true }),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({ id: "view-doc-1" }),
}));

jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    batch: jest.fn(),
    doc: jest.fn(),
    recursiveDelete: jest.fn(),
    runTransaction: jest.fn(),
  },
}));

jest.mock("@/lib/services/draftService", () => ({
  getDraft: jest.fn(),
}));

jest.mock("@/lib/resumeIdMapping", () => ({
  getNextResumeId: jest.fn(),
}));

jest.mock("@/lib/numericIdGenerator", () => ({
  generateNumericResumeId: jest.fn().mockResolvedValue(1001),
}));

jest.mock("@/lib/services/aiGenerationService", () => ({
  generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
}));

jest.mock("@/lib/utils/resumeVisibility", () => ({
  resolveResumeIsPublic: jest.fn(
    (resume: Record<string, unknown> | null | undefined) => {
      if (!resume) return false;
      if (resume.isBeingEdited === true) return false;
      if (typeof resume.isPublic === "boolean") return resume.isPublic;
      if (resume.visibility === "public") return true;
      if (resume.published === true) return true;
      return false;
    },
  ),
  sanitizeResumeForPublicView: jest.fn((data: unknown) => data),
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
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const docRef = {
      get: mockGet,
      set: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    mockGet.mockResolvedValue({
      exists: false,
      empty: true,
      docs: [],
      data: () => ({ deletedIds: [], count: 0 }),
    });
    mockDoc.mockReturnValue(docRef);

    mockBatch.set.mockReturnValue(mockBatch);
    mockBatch.update.mockReturnValue(mockBatch);
    mockBatch.delete.mockReturnValue(mockBatch);
    mockBatch.commit.mockResolvedValue(undefined);

    (adminDb.batch as jest.Mock).mockReturnValue(mockBatch);
    (adminDb.collection as jest.Mock).mockReturnValue({
      doc: mockDoc,
      where: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      get: mockGet,
    });
    (adminDb.runTransaction as jest.Mock).mockImplementation(async (cb) => {
      return cb({
        get: jest
          .fn()
          .mockResolvedValue({ exists: true, data: () => ({ lastId: 1000 }) }),
        set: jest.fn(),
        update: jest.fn(),
      });
    });
    (adminDb.doc as jest.Mock).mockImplementation((path) => mockDoc(path));
  });

  describe("publishDraft", () => {
    it("should publish a new resume", async () => {
      const draftId = "draft-123";
      const userId = "user-123";
      const mockDraft = {
        draftId,
        userId,
        resumeId: null,
        profile: {
          title: "Test Resume",
          summary: "Summary",
          experience: [],
          skills: [],
          projects: [],
        },
      };

      (getDraft as jest.Mock).mockResolvedValue(mockDraft);
      (getNextResumeId as jest.Mock).mockResolvedValue(1001);

      const result = await publishDraft(draftId, userId);

      expect(result.resumeId).toBe(1001);
      expect(mockBatch.set).toHaveBeenCalledTimes(2); // Resume + ID Mapping
      expect(mockBatch.delete).toHaveBeenCalledTimes(2); // Draft + ID Mapping
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it("should throw error if batch commit fails", async () => {
      const draftId = "draft-123";
      const userId = "user-123";
      const mockDraft = {
        draftId,
        userId,
        resumeId: null,
        profile: { title: "Test" },
      };
      (getDraft as jest.Mock).mockResolvedValue(mockDraft);
      mockBatch.commit.mockRejectedValue(new Error("Commit failed"));

      await expect(publishDraft(draftId, userId)).rejects.toThrow(
        "Failed to publish draft: Commit failed",
      );
    });

    it("should throw if draft not found", async () => {
      (getDraft as jest.Mock).mockResolvedValue(null);
      await expect(publishDraft("missing", "user")).rejects.toThrow(
        "Draft not found",
      );
    });

    it("should republish an existing resume", async () => {
      const draftId = "draft-123";
      const userId = "user-123";
      const mockDraft = {
        draftId,
        userId,
        resumeId: 1001,
        profile: {
          title: "Updated Resume",
          summary: "Summary",
          experience: [],
          skills: [],
          projects: [],
        },
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

    it("should throw error and cleanup if batch commit fails during unpublish", async () => {
      const resumeId = 1001;
      const userId = "user-123";

      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ userId, isBeingEdited: false, profile: {} }),
        }),
        delete: jest.fn().mockReturnThis(),
      });

      mockBatch.commit.mockRejectedValue(new Error("Unpublish failed"));

      await expect(unpublishResume(resumeId, userId)).rejects.toThrow(
        "Failed to unpublish resume: Unpublish failed",
      );
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
        "already being edited",
      );
    });
  });

  describe("getPublishedResume", () => {
    it("should return the resume if it exists", async () => {
      const mockData = { resumeId: 1001, userId: "user-1" };
      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => mockData,
        }),
      });

      const result = await getPublishedResume(1001);
      expect(result).toEqual(mockData);
    });

    it("should return null if it does not exist", async () => {
      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });

      const result = await getPublishedResume(1001);
      expect(result).toBeNull();
    });
  });

  describe("getResumeEditingStatus", () => {
    it("should return correct status", async () => {
      const mockData = { isBeingEdited: true };
      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => mockData,
        }),
      });

      const result = await getResumeEditingStatus(1001);
      expect(result).toEqual({ exists: true, isBeingEdited: true });
    });

    it("should return exists:false if resume not found", async () => {
      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });

      const result = await getResumeEditingStatus(9999);
      expect(result).toEqual({ exists: false, isBeingEdited: false });
    });
  });

  describe("createResume", () => {
    it("should create a blank resume", async () => {
      const userId = "user-123";
      (adminDb.collection as jest.Mock).mockReturnValue({ doc: mockDoc });
      const result = await createResume(userId, { title: "New Resume" });

      expect(result.numericId).toBeDefined();
      expect(mockDoc).toHaveBeenCalled();
    });
  });

  describe("getResumeCount", () => {
    it("should return the count of resumes", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({ count: 5 }),
      });
      const mockCount = jest.fn().mockReturnValue({ get: mockGet });
      const mockWhere = jest.fn().mockReturnValue({ count: mockCount });

      (adminDb.collection as jest.Mock).mockReturnValue({
        where: mockWhere,
      });

      const count = await getResumeCount("user-123");
      expect(count).toBe(5);
    });
  });

  describe("getResume", () => {
    const userId = "user-123";
    const resumeId = "1001";

    it("should return access:owner if user is owner", async () => {
      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ userId, resumeId: 1001 }),
        }),
      });

      const result = await getResume(resumeId, userId);
      expect(result.access).toBe("owner");
    });

    it("should return access:admin if user is admin", async () => {
      mockDoc.mockImplementation((path) => {
        if (path === resumeId) {
          return {
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ userId: "other-user", resumeId: 1001 }),
            }),
          };
        }
        if (path === userId) {
          return {
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "admin" }),
            }),
          };
        }
        return { get: jest.fn().mockResolvedValue({ exists: false }) };
      });

      (adminDb.collection as jest.Mock).mockReturnValue({ doc: mockDoc });

      const result = await getResume(resumeId, userId);
      expect(result.access).toBe("admin");
    });

    it("should return none if user is not admin and not owner", async () => {
      mockDoc.mockImplementation((path) => {
        if (path === resumeId) {
          return {
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ userId: "other-user", resumeId: 1001 }),
            }),
            collection: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              get: jest.fn().mockResolvedValue({ empty: true }),
            }),
          };
        }
        if (path === userId) {
          return {
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ role: "jobseeker" }),
            }),
          };
        }
        return { get: jest.fn().mockResolvedValue({ exists: false }) };
      });

      const result = await getResume(resumeId, userId);
      expect(result.access).toBe("none");
    });

    it("should return granted if access grant exists", async () => {
      const mockResumeSnap = {
        exists: true,
        data: () => ({ userId: "other-user", resumeId: 1001, id: resumeId }),
      };
      const mockUserSnap = {
        exists: true,
        data: () => ({ role: "jobseeker" }),
      };
      const mockGrantsSnap = {
        empty: false,
        docs: [
          {
            data: () => ({ toUserId: userId, expiresAt: null }),
          },
        ],
      };

      mockGet
        .mockResolvedValueOnce(mockResumeSnap) // 1. getResume doc.get()
        .mockResolvedValueOnce(mockUserSnap) // 2. Admin check user.get()
        .mockResolvedValueOnce(mockGrantsSnap); // 3. checkPrivateResumeAccess grants.get()

      const result = await getResume(resumeId, userId);
      expect(result.access).toBe("granted");
    });

    it("should return public_snapshot if resume is public", async () => {
      const mockResumeSnap = {
        exists: true,
        data: () => ({
          userId: "other-user",
          isPublic: true,
          profile: { title: "Public Resume" },
        }),
      };

      const mockGrantsSnap = { empty: true };
      const mockUserSnap = {
        exists: true,
        data: () => ({ role: "jobseeker" }),
      };

      const mockGet = jest
        .fn()
        .mockResolvedValueOnce(mockResumeSnap) // getResume doc.get()
        .mockResolvedValueOnce(mockUserSnap) // Admin check userDoc.get()
        .mockResolvedValueOnce(mockGrantsSnap); // checkPrivateResumeAccess grants.get()

      mockDoc.mockImplementation((path) => {
        return {
          get: mockGet,
          collection: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        };
      });

      const result = await getResume(resumeId, userId);
      expect(result.access).toBe("public_snapshot");
    });

    it("should return none if not found", async () => {
      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });
      const result = await getResume("missing", "user");
      expect(result.access).toBe("none");
    });
  });

  describe("deleteResume", () => {
    it("should delete and recycle ID", async () => {
      const userId = "user-123";
      const resumeId = "1001";

      (adminDb.recursiveDelete as jest.Mock).mockResolvedValue(undefined);

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ userId, deletedIds: [] }),
      });

      await deleteResume(resumeId, userId);
      expect(adminDb.recursiveDelete).toHaveBeenCalled();
    });

    it("should handle error during user collection cleanup", async () => {
      const userId = "user-123";
      const resumeId = "1001";

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ userId, deletedIds: [] }),
      });

      mockDoc.mockReturnValue({
        get: mockGet,
        delete: jest.fn().mockRejectedValue(new Error("Cleanup failed")),
        collection: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
      });

      await deleteResume(resumeId, userId);
      expect(adminDb.recursiveDelete).toHaveBeenCalled();
    });
  });

  describe("saveGeneratedResume", () => {
    it("should save normalized resume data", async () => {
      const userId = "user-123";
      const resumeData = {
        name: "John Doe",
        experience: [
          {
            company: "Tech Inc",
            title: "Dev",
            location: "SF",
            startDate: "2020",
            description: "Worked here",
          },
        ],
        education: [{ institution: "Uni", degree: "CS", year: "2020" }],
        skills: ["React"],
      };

      const result = await saveGeneratedResume(userId, resumeData);
      expect(result.numericId).toBeDefined();
    });

    it("should persist additive quality/evidence/generation metadata", async () => {
      const userId = "user-123";
      const resumeData = {
        name: "Jane Doe",
        email: "jane@example.com",
        summary: "Summary",
        skills: ["TypeScript"],
      };

      await saveGeneratedResume(userId, resumeData, {
        qualityReport: {
          schemaValid: true,
          factualAlignmentScore: 0.97,
        },
        evidenceMap: {
          summary: ["I build web apps"],
        },
        generationVersion: {
          pipeline: "v2_structured",
          version: "2026-02-28",
        },
      });

      expect(mockBatch.set).toHaveBeenCalled();

      const savedResume = mockBatch.set.mock.calls[0]?.[1];
      expect(savedResume?.qualityReport?.schemaValid).toBe(true);
      expect(savedResume?.evidenceMap?.summary).toEqual(["I build web apps"]);
      expect(savedResume?.generationVersion?.pipeline).toBe("v2_structured");
    });
  });

  describe("updateResumeEmbedding", () => {
    it("should generate and save embedding", async () => {
      const resumeId = "1001";
      const mockResume: any = {
        resumeId: 1001,
        profile: {
          title: "Dev",
          summary: "Summary",
          experience: [
            { role: "Role", company: "Company", description: "Desc" },
          ],
          skills: [{ name: "Skill" }],
          projects: [{ name: "Project", description: "Desc" }],
        },
      };

      await updateResumeEmbedding(resumeId, mockResume);
      expect(mockDoc).toHaveBeenCalledWith(resumeId);
    });

    it("should handle error during embedding update", async () => {
      const { generateEmbedding } =
        await import("@/lib/services/aiGenerationService");
      (generateEmbedding as jest.Mock).mockRejectedValue(new Error("AI Error"));

      const resumeId = "1001";
      const mockResume: any = {
        profile: {
          title: "Dev",
          summary: "Summary",
          experience: [],
          skills: [],
          projects: [],
        },
      };

      await updateResumeEmbedding(resumeId, mockResume);
      expect(logger.error).toHaveBeenCalled();
    });

    it("should not generate embedding if text is empty", async () => {
      const resumeId = "1001";
      const mockResume: any = {
        profile: {
          title: "",
          summary: "",
          experience: [],
          skills: [],
          projects: [],
        },
      };

      await updateResumeEmbedding(resumeId, mockResume);
      const { generateEmbedding } =
        await import("@/lib/services/aiGenerationService");
      expect(generateEmbedding).not.toHaveBeenCalled();
    });
  });

  describe("fetchResumeBySlug", () => {
    it("should fetch resume by slug", async () => {
      const mockDocs = [
        {
          id: "res-1",
          data: () => ({ slug: "test-slug", title: "Test" }),
        },
      ];
      (mockGetDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: mockDocs,
      });

      const result = await fetchResumeBySlug("test-slug");
      expect(result).not.toBeNull();
      expect(result?.slug).toBe("test-slug");
    });

    it("should return null if not found", async () => {
      (mockGetDocs as jest.Mock).mockResolvedValue({
        empty: true,
      });

      const result = await fetchResumeBySlug("unknown");
      expect(result).toBeNull();
    });
  });

  describe("trackResumeView", () => {
    it("should track resume view", async () => {
      const { addDoc } = require("firebase/firestore");
      (addDoc as jest.Mock).mockResolvedValue({ id: "view-1" });
      await trackResumeView("res-1");
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ resumeId: "res-1" }),
      );
    });
  });

  describe("checkPrivateResumeAccess", () => {
    it("should return false if no grants exist", async () => {
      mockDoc.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ empty: true }),
        }),
      });

      const result = await checkPrivateResumeAccess("res-1", "user-1");
      expect(result).toBe(false);
    });

    it("should return true if valid grant exists", async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 100000);

      mockDoc.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [
              {
                data: () => ({
                  toUserId: "user-1",
                  expiresAt: futureDate.toISOString(),
                }),
              },
            ],
          }),
        }),
      });

      const result = await checkPrivateResumeAccess("res-1", "user-1");
      expect(result).toBe(true);
    });

    it("should return false on error", async () => {
      mockDoc.mockImplementation(() => {
        throw new Error("DB Error");
      });

      const result = await checkPrivateResumeAccess("res-1", "user-1");
      expect(result).toBe(false);
    });
  });

  describe("updateResume", () => {
    it("should update resume with sanitized data", async () => {
      const resumeId = "1001";
      const userId = "user-123";
      const data = { title: "New Title" };

      await updateResume(resumeId, userId, data);
      expect(mockDoc).toHaveBeenCalledWith(resumeId);
    });
  });
});
