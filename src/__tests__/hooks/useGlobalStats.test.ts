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
      resumes: "—",
      jobSeekers: "—",
      recruiters: "—",
    });
  });

  it("should fetch and update stats from firestore (public access)", async () => {
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        resumeCount: 15000,
        jobSeekerCount: 12000,
        recruiterCount: 500,
      }),
    });

    const { result } = renderHook(() => useGlobalStats());

    await waitFor(() => {
      expect(result.current.stats.resumes).toBe("15000+");
      expect(result.current.stats.jobSeekers).toBe("12000+");
      expect(result.current.stats.recruiters).toBe("500+");
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
        resumes: "—",
        jobSeekers: "—",
        recruiters: "—",
      });
    });
  });

  it("should handle fetch error gracefully", async () => {
    (getDoc as jest.Mock).mockRejectedValue(new Error("Fetch failed"));

    const { result } = renderHook(() => useGlobalStats());

    await waitFor(() => {
      expect(result.current.stats).toEqual({
        resumes: "—",
        jobSeekers: "—",
        recruiters: "—",
      });
    });

    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      "Error fetching stats:"
    );
  });
});
