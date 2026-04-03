import { templateService } from "@/lib/services/templateService";
import { RESUME_TEMPLATES } from "@/lib/templates/resumeTemplates";
import * as firestore from "firebase/firestore";

// Mock templates
jest.mock("@/lib/templates/resumeTemplates", () => ({
  RESUME_TEMPLATES: [
    { id: "temp1", name: "Template 1" },
    { id: "temp2", name: "Template 2" },
  ],
}));

// Mock firebase/firestore functions
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  writeBatch: jest.fn(),
  query: jest.fn((...args: unknown[]) => args[0]),
  limit: jest.fn(() => ({})),
}));

// Mock the db
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

// Disable in-process cache so each test gets a fresh Firestore call
jest.mock("@/lib/utils/cache", () => ({
  MemoryCache: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
  })),
  coalesce: jest
    .fn()
    .mockImplementation(async (_key: unknown, fn: () => unknown) => fn()),
}));

describe("templateService", () => {
  const mockGetDocs = firestore.getDocs as jest.Mock;
  const mockGetDoc = firestore.getDoc as jest.Mock;
  const mockCollection = firestore.collection as jest.Mock;
  const mockDoc = firestore.doc as jest.Mock;
  const mockWriteBatch = firestore.writeBatch as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllTemplates", () => {
    it("should return templates from DB if found", async () => {
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ data: () => ({ id: "db1", name: "DB Template" }) }],
      });

      const templates = await templateService.getAllTemplates();
      expect(templates).toEqual([{ id: "db1", name: "DB Template" }]);
      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(),
        "templates",
      );
    });

    it("should return local templates if DB is empty", async () => {
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const templates = await templateService.getAllTemplates();
      expect(templates).toEqual(RESUME_TEMPLATES);
    });

    it("should return local templates on error", async () => {
      mockGetDocs.mockRejectedValue(new Error("DB Error"));

      const templates = await templateService.getAllTemplates();
      expect(templates).toEqual(RESUME_TEMPLATES);
    });
  });

  describe("getTemplateById", () => {
    it("should return template from DB if found", async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ id: "db-only-id", name: "DB Template 1" }),
      });

      const template = await templateService.getTemplateById("db-only-id");
      expect(template).toEqual({ id: "db-only-id", name: "DB Template 1" });
      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        "templates",
        "db-only-id",
      );
    });

    it("should return local template if not in DB but in local", async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      const template = await templateService.getTemplateById("temp1");
      expect(template).toEqual(RESUME_TEMPLATES[0]);
    });

    it("should return null if not in DB and not in local", async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      const template = await templateService.getTemplateById("unknown");
      expect(template).toBeNull();
    });

    it("should return null on error if not found locally", async () => {
      mockGetDoc.mockRejectedValue(new Error("DB Error"));

      const template = await templateService.getTemplateById("unknown");
      expect(template).toBeNull();
    });

    it("should return local template on error", async () => {
      mockGetDoc.mockRejectedValue(new Error("DB Error"));

      const template = await templateService.getTemplateById("temp1");
      expect(template).toEqual(RESUME_TEMPLATES[0]);
    });
  });

  describe("seedTemplates", () => {
    it("should batch write templates to DB", async () => {
      const mockBatch = {
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };
      mockWriteBatch.mockReturnValue(mockBatch);

      await templateService.seedTemplates();
      expect(mockWriteBatch).toHaveBeenCalled();
      expect(mockBatch.set).toHaveBeenCalledTimes(RESUME_TEMPLATES.length);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });
});
