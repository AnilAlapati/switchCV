import { checkIdStatus, resetCounter } from "@/lib/debugIdStatus";
import { getDoc, setDoc } from "firebase/firestore";

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
  const mockConsoleLog = jest.spyOn(console, "log").mockImplementation();
  const mockConsoleError = jest.spyOn(console, "error").mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
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

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("ID Counter Status")
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Counter exists")
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Deleted IDs Pool Status")
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Pool exists")
      );
    });

    it("should log when documents do not exist", async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      await checkIdStatus();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Counter doesn't exist")
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Pool doesn't exist")
      );
    });

    it("should handle errors", async () => {
      (getDoc as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await checkIdStatus();

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("Error checking ID status"),
        expect.any(Error)
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
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Counter reset to 0")
      );
    });

    it("should handle errors during reset", async () => {
      (setDoc as jest.Mock).mockRejectedValue(new Error("Write Error"));

      await resetCounter();

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("Error resetting counter"),
        expect.any(Error)
      );
    });
  });
});
