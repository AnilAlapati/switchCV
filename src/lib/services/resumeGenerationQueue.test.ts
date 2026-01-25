import {
  createGenerationJob,
  getJobStatus,
  updateJobStatus,
  cleanupOldJobs,
  type JobStatus,
  type GenerationJobPayload,
} from "@/lib/services/resumeGenerationQueue";

// Mock firebase-admin/firestore first
jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => "mock-timestamp"),
  },
}));

// Mock firebase-admin
jest.mock("@/lib/firebase-admin", () => {
  const mockDocRef = {
    id: "test-job-id",
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  };

  const mockQuerySnapshot = {
    empty: true,
    docs: [],
    size: 0,
  };

  const mockBatch = {
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  };

  return {
    adminDb: {
      collection: jest.fn(() => ({
        doc: jest.fn(() => mockDocRef),
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue(mockQuerySnapshot),
          })),
        })),
      })),
      batch: jest.fn(() => mockBatch),
    },
  };
});

describe("resumeGenerationQueue", () => {
  const mockPayload: GenerationJobPayload = {
    message: "Create a resume for a software engineer",
    conversationHistory: [
      {
        id: "1",
        content: "My name is John",
        isUser: true,
        timestamp: new Date().toISOString(),
      },
    ],
    modelId: "gemini-2.5-flash",
    userTier: "premium",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createGenerationJob", () => {
    it("should create a job and return jobId", async () => {
      const result = await createGenerationJob("user-123", mockPayload);

      expect(result).toHaveProperty("jobId");
      expect(result.jobId).toBe("test-job-id");
    });

    it("should store payload in the job document", async () => {
      const { adminDb } = require("@/lib/firebase-admin");
      const mockSet = adminDb.collection().doc().set;

      await createGenerationJob("user-123", mockPayload);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          status: "pending",
          progress: 0,
          payload: mockPayload,
        }),
      );
    });
  });

  describe("getJobStatus", () => {
    it("should return job data for valid job", async () => {
      const { adminDb } = require("@/lib/firebase-admin");
      const mockGet = adminDb.collection().doc().get;

      mockGet.mockResolvedValueOnce({
        exists: true,
        id: "test-job-id",
        data: () => ({
          userId: "user-123",
          status: "processing" as JobStatus,
          progress: 50,
          payload: mockPayload,
        }),
      });

      const result = await getJobStatus("test-job-id", "user-123");

      expect(result).not.toBeNull();
      expect(result?.status).toBe("processing");
      expect(result?.progress).toBe(50);
    });

    it("should return null for non-existent job", async () => {
      const { adminDb } = require("@/lib/firebase-admin");
      const mockGet = adminDb.collection().doc().get;

      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      const result = await getJobStatus("non-existent", "user-123");

      expect(result).toBeNull();
    });

    it("should return null if user doesn't own the job", async () => {
      const { adminDb } = require("@/lib/firebase-admin");
      const mockGet = adminDb.collection().doc().get;

      mockGet.mockResolvedValueOnce({
        exists: true,
        id: "test-job-id",
        data: () => ({
          userId: "different-user",
          status: "pending" as JobStatus,
          progress: 0,
          payload: mockPayload,
        }),
      });

      const result = await getJobStatus("test-job-id", "user-123");

      expect(result).toBeNull();
    });
  });

  describe("updateJobStatus", () => {
    it("should update job status", async () => {
      const { adminDb } = require("@/lib/firebase-admin");
      const mockUpdate = adminDb.collection().doc().update;

      await updateJobStatus("test-job-id", "processing", { progress: 50 });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "processing",
          progress: 50,
        }),
      );
    });

    it("should set completedAt for completed status", async () => {
      const { adminDb } = require("@/lib/firebase-admin");
      const mockUpdate = adminDb.collection().doc().update;

      await updateJobStatus("test-job-id", "completed", {
        result: {
          response: "Resume created",
          model: "gemini-2.5-flash",
          progress: 100,
          resumeId: "resume-123",
          created: true,
        },
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "completed",
          completedAt: expect.anything(),
        }),
      );
    });

    it("should store error for failed status", async () => {
      const { adminDb } = require("@/lib/firebase-admin");
      const mockUpdate = adminDb.collection().doc().update;

      await updateJobStatus("test-job-id", "failed", {
        error: "AI provider timeout",
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          error: "AI provider timeout",
          completedAt: expect.anything(),
        }),
      );
    });
  });

  describe("cleanupOldJobs", () => {
    it("should return 0 when no old jobs exist", async () => {
      const count = await cleanupOldJobs();
      expect(count).toBe(0);
    });

    it("should delete old completed jobs", async () => {
      const { adminDb } = require("@/lib/firebase-admin");
      const batch = adminDb.batch();

      // Mock old jobs exist
      const mockDocs = [{ ref: "ref-1" }, { ref: "ref-2" }];

      // Re-mocking for this specific test to ensure deep chain works
      const mockGet = jest.fn().mockResolvedValueOnce({
        empty: false,
        docs: mockDocs,
        size: 2,
      });

      adminDb.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      const count = await cleanupOldJobs();

      expect(count).toBe(2);
      expect(batch.delete).toHaveBeenCalledTimes(2);
      expect(batch.commit).toHaveBeenCalled();
    });

    it("should use default maxAgeMs", async () => {
      const { adminDb } = require("@/lib/firebase-admin");
      const whereMock = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ empty: true }),
        }),
      });
      adminDb.collection.mockReturnValue({ where: whereMock });

      await cleanupOldJobs();

      const cutoffArg = whereMock.mock.calls[0][2];
      const now = Date.now();
      const expectedCutoff = now - 7 * 24 * 60 * 60 * 1000;

      // Check if cutoff is approximately 7 days ago (within 10 seconds)
      expect(Math.abs(cutoffArg.getTime() - expectedCutoff)).toBeLessThan(
        10000,
      );
    });
  });
});
