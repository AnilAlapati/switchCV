import {
  getNextResumeId,
  mapResumeId,
  getDocumentIdFromResumeId,
  getResumeIdFromDocumentId,
  deleteResumeIdMapping,
} from "@/lib/resumeIdMapping";
import { adminDb } from "@/lib/firebase-admin";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";

// Mock firebase-admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

jest.mock("@/lib/numericIdGenerator", () => ({
  generateNumericResumeId: jest.fn(),
}));

describe("resumeIdMapping", () => {
  const mockCollection = adminDb.collection as jest.Mock;
  const mockGenerateNumericResumeId =
    generateNumericResumeId as jest.MockedFunction<
      typeof generateNumericResumeId
    >;
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
    mockGenerateNumericResumeId.mockReset();
  });

  describe("getNextResumeId", () => {
    it("delegates to the numeric ID generator", async () => {
      mockGenerateNumericResumeId.mockResolvedValue(4321);

      const id = await getNextResumeId();

      expect(id).toBe(4321);
      expect(mockGenerateNumericResumeId).toHaveBeenCalledTimes(1);
    });

    it("propagates generator failures", async () => {
      mockGenerateNumericResumeId.mockRejectedValue(new Error("boom"));

      await expect(getNextResumeId()).rejects.toThrow("boom");
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
