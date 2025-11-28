import { renderHook, waitFor } from "@testing-library/react";
import { getDoc } from "firebase/firestore";
import { logger } from "@/lib/logger";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
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
  onSnapshot: undefined, // Force fallback to getDoc
}));

// Import hook after mocks are set up
import { useGlobalStats } from "../../hooks/useGlobalStats";

describe("useGlobalStats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return default stats initially", () => {
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => false,
    });

    const { result } = renderHook(() => useGlobalStats());

    expect(result.current.stats).toEqual({
      resumes: "12k+",
      users: "10k+",
      completion: "98%",
    });
  });

  it("should fetch and update stats from firestore (public access)", async () => {
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        resumeCount: 15000,
        userCount: 12000,
      }),
    });

    const { result } = renderHook(() => useGlobalStats());

    await waitFor(() => {
      expect(result.current.stats.resumes).toBe("15000+");
      expect(result.current.stats.users).toBe("12000+");
    });

    // getDoc should be called since globalStats is now public
    expect(getDoc).toHaveBeenCalled();
  });

  it("should return default stats when document does not exist", async () => {
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => false,
    });

    const { result } = renderHook(() => useGlobalStats());

    await waitFor(() => {
      // Should stay at defaults because document doesn't exist
      expect(result.current.stats).toEqual({
        resumes: "12k+",
        users: "10k+",
        completion: "98%",
      });
    });
  });

  it("should handle fetch error gracefully", async () => {
    (getDoc as jest.Mock).mockRejectedValue(new Error("Fetch failed"));

    const { result } = renderHook(() => useGlobalStats());

    await waitFor(() => {
      expect(result.current.stats).toEqual({
        resumes: "12k+",
        users: "10k+",
        completion: "98%",
      });
    });

    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      "Error fetching stats:"
    );
  });
});
