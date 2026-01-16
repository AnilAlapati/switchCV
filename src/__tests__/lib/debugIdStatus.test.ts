import { checkIdStatus, resetCounter } from "@/lib/debugIdStatus";
import { getDoc, getDocs, setDoc, writeBatch } from "firebase/firestore";
import { logger } from "@/lib/logger";
import { ID_GENERATION } from "@/config/constants";

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  collection: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  writeBatch: jest.fn(),
}));

describe("debugIdStatus", () => {
  let mockBatch: { set: jest.Mock; commit: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    (getDocs as jest.Mock).mockResolvedValue({ empty: true, docs: [] });
    mockBatch = {
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };
    (writeBatch as jest.Mock).mockReturnValue(mockBatch);
  });

  describe("checkIdStatus", () => {
    it("logs shard and pool data when present", async () => {
      (getDoc as jest.Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            createdAt: "2023-01-01",
            lastResetAt: "2023-02-01",
            description: "test",
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ deletedIds: [1, 2], totalRecycled: 2 }),
        });

      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [
          {
            data: () => ({ shardId: 0, lastIssued: 10, nextId: 11 }),
          },
        ],
      });

      await checkIdStatus();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("ID Counter Status")
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Shard Overview")
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Deleted IDs Pool Status")
      );
    });

    it("logs missing documents", async () => {
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });

      await checkIdStatus();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Counter doesn't exist")
      );
    });

    it("handles read failures", async () => {
      (getDoc as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await checkIdStatus();

      expect(logger.error).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        expect.stringContaining("Error checking ID status")
      );
    });
  });

  describe("resetCounter", () => {
    it("updates metadata and shards", async () => {
      await resetCounter();

      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ resetTo: 0 }),
        { merge: true }
      );
      expect(mockBatch.set).toHaveBeenCalledTimes(ID_GENERATION.SHARD_COUNT);
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Counter reset to 0")
      );
    });

    it("logs errors when reset fails", async () => {
      (setDoc as jest.Mock).mockRejectedValue(new Error("Write Error"));

      await resetCounter();

      expect(logger.error).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        expect.stringContaining("Error resetting counter")
      );
    });
  });
});
