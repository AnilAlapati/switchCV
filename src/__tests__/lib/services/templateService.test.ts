import { templateService } from "@/lib/services/templateService";
import { db } from "@/lib/firebase";
import { RESUME_TEMPLATES } from "@/lib/templates/resumeTemplates";

// Mock firebase
jest.mock("@/lib/firebase", () => ({
  db: {
    collection: jest.fn(),
    batch: jest.fn(),
  },
}));

// Mock templates
jest.mock("@/lib/templates/resumeTemplates", () => ({
  RESUME_TEMPLATES: [
    { id: "temp1", name: "Template 1" },
    { id: "temp2", name: "Template 2" },
  ],
}));

describe("templateService", () => {
  const mockGet = jest.fn();
  const mockDoc = jest.fn();
  const mockBatchSet = jest.fn();
  const mockBatchCommit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup chainable mocks
    const mockCollectionReturn = {
      get: mockGet,
      doc: mockDoc,
    };

    ((db as any).collection as jest.Mock).mockReturnValue(mockCollectionReturn);

    mockDoc.mockReturnValue({
      get: mockGet,
    });

    ((db as any).batch as jest.Mock).mockReturnValue({
      set: mockBatchSet,
      commit: mockBatchCommit,
    });
  });

  describe("getAllTemplates", () => {
    it("should return templates from DB if found", async () => {
      mockGet.mockResolvedValue({
        empty: false,
        docs: [{ data: () => ({ id: "db1", name: "DB Template" }) }],
      });

      const templates = await templateService.getAllTemplates();
      expect(templates).toEqual([{ id: "db1", name: "DB Template" }]);
      expect((db as any).collection).toHaveBeenCalledWith("templates");
    });

    it("should return local templates if DB is empty", async () => {
      mockGet.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const templates = await templateService.getAllTemplates();
      expect(templates).toEqual(RESUME_TEMPLATES);
    });

    it("should return local templates on error", async () => {
      mockGet.mockRejectedValue(new Error("DB Error"));

      const templates = await templateService.getAllTemplates();
      expect(templates).toEqual(RESUME_TEMPLATES);
    });
  });

  describe("getTemplateById", () => {
    it("should return template from DB if found", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ id: "temp1", name: "DB Template 1" }),
      });

      const template = await templateService.getTemplateById("temp1");
      expect(template).toEqual({ id: "temp1", name: "DB Template 1" });
      expect(mockDoc).toHaveBeenCalledWith("temp1");
    });

    it("should return local template if not in DB but in local", async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      const template = await templateService.getTemplateById("temp1");
      expect(template).toEqual(RESUME_TEMPLATES[0]);
    });

    it("should return null if not in DB and not in local", async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      const template = await templateService.getTemplateById("unknown");
      expect(template).toBeNull();
    });

    it("should return null on error if not found locally", async () => {
      mockGet.mockRejectedValue(new Error("DB Error"));

      const template = await templateService.getTemplateById("unknown");
      expect(template).toBeNull();
    });

    it("should return local template on error", async () => {
      mockGet.mockRejectedValue(new Error("DB Error"));

      const template = await templateService.getTemplateById("temp1");
      expect(template).toEqual(RESUME_TEMPLATES[0]);
    });
  });

  describe("seedTemplates", () => {
    it("should batch write templates to DB", async () => {
      await templateService.seedTemplates();
      expect((db as any).batch).toHaveBeenCalled();
      expect(mockBatchSet).toHaveBeenCalledTimes(RESUME_TEMPLATES.length);
      expect(mockBatchCommit).toHaveBeenCalled();
    });
  });
});
