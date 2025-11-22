import { renderHook, waitFor } from "@testing-library/react";
import { useGlobalStats } from "../../hooks/useGlobalStats";
import { getDoc } from "firebase/firestore";

// Mock dependencies
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

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

  it("should fetch and update stats from firestore", async () => {
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
  });

  it("should handle fetch error gracefully", async () => {
    (getDoc as jest.Mock).mockRejectedValue(new Error("Fetch failed"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const { result } = renderHook(() => useGlobalStats());

    await waitFor(() => {
      expect(result.current.stats).toEqual({
        resumes: "12k+",
        users: "10k+",
        completion: "98%",
      });
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching stats:",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
