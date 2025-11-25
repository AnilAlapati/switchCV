import {
  fetchResumeBySlug,
  trackResumeView,
} from "@/lib/services/resumeService";
import { db } from "@/lib/firebase";
import { collection, where, getDocs } from "firebase/firestore";
import { logger } from "@/lib/logger";

// Mock Firebase
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe("resumeService", () => {
  const mockSlug = "test-slug";
  const mockResumeId = "test-resume-id";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchResumeBySlug", () => {
    it("should return resume when found", async () => {
      const mockData = { name: "John Doe", slug: mockSlug };
      const mockDoc = {
        id: mockResumeId,
        data: () => mockData,
      };
      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [mockDoc],
      });

      const result = await fetchResumeBySlug(mockSlug);

      expect(collection).toHaveBeenCalledWith(db, "resumes");
      expect(where).toHaveBeenCalledWith("slug", "==", mockSlug);
      expect(result).toEqual({ id: mockResumeId, ...mockData });
    });

    it("should return null when not found", async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await fetchResumeBySlug(mockSlug);

      expect(result).toBeNull();
    });

    it("should return null on error and log the error", async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const result = await fetchResumeBySlug(mockSlug);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ slug: mockSlug }),
        "Error fetching resume"
      );
    });
  });

  describe("trackResumeView", () => {
    it("should query for existing views", async () => {
      (getDocs as jest.Mock).mockResolvedValue({ empty: true });

      await trackResumeView(mockResumeId);

      expect(collection).toHaveBeenCalledWith(db, "resumeViews");
      expect(where).toHaveBeenCalledWith("resumeId", "==", mockResumeId);
      // Note: timestamp check is tricky due to new Date(), but we verify the call structure
    });

    it("should handle errors gracefully and log the error", async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await trackResumeView(mockResumeId);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ resumeId: mockResumeId }),
        "Error tracking resume view"
      );
    });
  });
});
