import {
  findResumesWithoutNumericIds,
  migrateResumeToNumericId,
  migrateAllResumesToNumericIds,
  migrateUserResumesToNumericIds,
} from "@/lib/resumeMigration";
import { getDocs, updateDoc, doc } from "firebase/firestore";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";

// Mock dependencies
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
}));

jest.mock("@/lib/numericIdGenerator", () => ({
  generateNumericResumeId: jest.fn(),
}));

describe("resumeMigration", () => {
  const mockResumeId = "resume-123";
  const mockNumericId = 123456;

  beforeEach(() => {
    jest.clearAllMocks();
    (generateNumericResumeId as jest.Mock).mockResolvedValue(mockNumericId);
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (getDocs as jest.Mock).mockResolvedValue({ docs: [] });
    // Silence console logs
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("findResumesWithoutNumericIds", () => {
    it("should return resumes without numeric IDs", async () => {
      const mockDocs = [
        {
          id: "1",
          data: () => ({ numericId: 123, published: true }),
        },
        {
          id: "2",
          data: () => ({ published: true }), // Missing numericId
        },
      ];
      (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

      const result = await findResumesWithoutNumericIds();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("should handle errors", async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await expect(findResumesWithoutNumericIds()).rejects.toThrow("DB Error");
    });
  });

  describe("migrateResumeToNumericId", () => {
    it("should migrate a resume", async () => {
      await migrateResumeToNumericId(mockResumeId);

      expect(generateNumericResumeId).toHaveBeenCalled();
      expect(doc).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalledWith(undefined, {
        numericId: mockNumericId,
      });
    });

    it("should handle errors", async () => {
      (updateDoc as jest.Mock).mockRejectedValue(new Error("Update failed"));

      await expect(migrateResumeToNumericId(mockResumeId)).rejects.toThrow(
        "Update failed"
      );
    });
  });

  describe("migrateAllResumesToNumericIds", () => {
    it("should migrate all found resumes", async () => {
      const mockDocs = [
        {
          id: "1",
          data: () => ({ published: true }),
        },
        {
          id: "2",
          data: () => ({ published: true }),
        },
      ];
      // Ensure getDocs returns the mock docs
      (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

      const count = await migrateAllResumesToNumericIds();

      expect(count).toBe(2);
      expect(updateDoc).toHaveBeenCalledTimes(2);
    });

    it("should return 0 if no resumes need migration", async () => {
      (getDocs as jest.Mock).mockResolvedValue({ docs: [] });

      const count = await migrateAllResumesToNumericIds();

      expect(count).toBe(0);
    });

    it("should handle individual migration failures", async () => {
      const mockDocs = [
        { id: "1", data: () => ({}) },
        { id: "2", data: () => ({}) },
      ];
      (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });
      (updateDoc as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Fail"));

      const count = await migrateAllResumesToNumericIds();

      expect(count).toBe(1);
    });
  });

  describe("migrateUserResumesToNumericIds", () => {
    it("should migrate user resumes", async () => {
      const mockDocs = [{ id: "1", data: () => ({}) }];
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: mockDocs,
      });

      const count = await migrateUserResumesToNumericIds("user-1");

      expect(count).toBe(1);
    });

    it("should return 0 if no resumes found", async () => {
      (getDocs as jest.Mock).mockResolvedValue({ empty: true });

      const count = await migrateUserResumesToNumericIds("user-1");

      expect(count).toBe(0);
    });

    it("should return 0 if all resumes have IDs", async () => {
      const mockDocs = [{ id: "1", data: () => ({ numericId: 123 }) }];
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: mockDocs,
      });

      const count = await migrateUserResumesToNumericIds("user-1");

      expect(count).toBe(0);
    });
  });
});
