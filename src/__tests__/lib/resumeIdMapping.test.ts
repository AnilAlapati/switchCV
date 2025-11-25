import {
  getNextResumeId,
  mapResumeId,
  getDocumentIdFromResumeId,
  getResumeIdFromDocumentId,
  deleteResumeIdMapping,
} from "@/lib/resumeIdMapping";
import { adminDb } from "@/lib/firebase-admin";

// Mock firebase-admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

describe("resumeIdMapping", () => {
  const mockCollection = adminDb.collection as jest.Mock;
  const mockDoc = jest.fn();
  const mockGet = jest.fn();
  const mockSet = jest.fn();
  const mockDelete = jest.fn();
  const mockWhere = jest.fn();
  const mockLimit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
    });
    mockDoc.mockReturnValue({
      get: mockGet,
      set: mockSet,
      delete: mockDelete,
    });
    mockWhere.mockReturnValue({
      limit: mockLimit,
    });
    mockLimit.mockReturnValue({
      get: mockGet,
    });
  });

  describe("getNextResumeId", () => {
    it("should return 1 if counter does not exist", async () => {
      mockGet.mockResolvedValue({ exists: false });

      const id = await getNextResumeId();

      expect(id).toBe(1);
      expect(mockSet).toHaveBeenCalledWith({ nextId: 1 }, { merge: true });
    });

    it("should increment existing counter", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ nextId: 5 }),
      });

      const id = await getNextResumeId();

      expect(id).toBe(6);
      expect(mockSet).toHaveBeenCalledWith({ nextId: 6 }, { merge: true });
    });
  });

  describe("mapResumeId", () => {
    it("should create mapping", async () => {
      await mapResumeId(123, "doc-123", "user-123");

      expect(mockDoc).toHaveBeenCalledWith("123");
      expect(mockSet).toHaveBeenCalledWith({
        documentId: "doc-123",
        userId: "user-123",
        resumeId: 123,
        createdAt: expect.any(String),
      });
    });
  });

  describe("getDocumentIdFromResumeId", () => {
    it("should return mapping if exists", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ documentId: "doc-123", userId: "user-123" }),
      });

      const result = await getDocumentIdFromResumeId(123);

      expect(result).toEqual({ documentId: "doc-123", userId: "user-123" });
    });

    it("should return null if not exists", async () => {
      mockGet.mockResolvedValue({ exists: false });

      const result = await getDocumentIdFromResumeId(123);

      expect(result).toBeNull();
    });
  });

  describe("getResumeIdFromDocumentId", () => {
    it("should return resumeId if found", async () => {
      mockGet.mockResolvedValue({
        empty: false,
        docs: [{ data: () => ({ resumeId: 123 }) }],
      });

      const result = await getResumeIdFromDocumentId("doc-123");

      expect(result).toBe(123);
    });

    it("should return null if not found", async () => {
      mockGet.mockResolvedValue({ empty: true });

      const result = await getResumeIdFromDocumentId("doc-123");

      expect(result).toBeNull();
    });
  });

  describe("deleteResumeIdMapping", () => {
    it("should delete mapping", async () => {
      await deleteResumeIdMapping(123);

      expect(mockDoc).toHaveBeenCalledWith("123");
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
