import { checkIdStatus, resetCounter } from "@/lib/debugIdStatus";
import { getDoc, setDoc } from "firebase/firestore";
import { logger } from "@/lib/logger";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock dependencies
jest.mock("@/lib/firebase", () => ({
  db: {},
}));
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

describe("debugIdStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("checkIdStatus", () => {
    it("should log status when documents exist", async () => {
      (getDoc as jest.Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            currentId: 100,
            createdAt: "2023-01-01",
            lastResetAt: "2023-01-01",
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            deletedIds: [1, 2, 3],
            totalRecycled: 3,
          }),
        });

      await checkIdStatus();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("ID Counter Status")
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Counter exists")
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Deleted IDs Pool Status")
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Pool exists")
      );
    });

    it("should log when documents do not exist", async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      await checkIdStatus();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Counter doesn't exist")
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Pool doesn't exist")
      );
    });

    it("should handle errors", async () => {
      (getDoc as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await checkIdStatus();

      expect(logger.error).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        expect.stringContaining("Error checking ID status")
      );
    });
  });

  describe("resetCounter", () => {
    it("should reset counter successfully", async () => {
      await resetCounter();

      expect(setDoc).toHaveBeenCalledWith(
        undefined, // doc ref (mocked)
        expect.objectContaining({
          currentId: 0,
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Counter reset to 0")
      );
    });

    it("should handle errors during reset", async () => {
      (setDoc as jest.Mock).mockRejectedValue(new Error("Write Error"));

      await resetCounter();

      expect(logger.error).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        expect.stringContaining("Error resetting counter")
      );
    });
  });
});
