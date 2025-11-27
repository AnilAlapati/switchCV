import { renderHook, waitFor, act } from "@testing-library/react";
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
  auth: { __isMock: true }, // Mark as mock to skip real auth initialization
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  onSnapshot: undefined, // Force fallback to getDoc
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()),
}));

// Import hook and test helpers after mocks are set up
import {
  useGlobalStats,
  __resetAuthState,
  __setAuthState,
} from "../../hooks/useGlobalStats";

describe("useGlobalStats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAuthState();
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

  it("should fetch and update stats from firestore when authenticated", async () => {
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        resumeCount: 15000,
        userCount: 12000,
      }),
    });

    const { result } = renderHook(() => useGlobalStats());

    // Simulate user authentication
    act(() => {
      __setAuthState(true);
    });

    await waitFor(() => {
      expect(result.current.stats.resumes).toBe("15000+");
      expect(result.current.stats.users).toBe("12000+");
    });
  });

  it("should return default stats when not authenticated", async () => {
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        resumeCount: 15000,
        userCount: 12000,
      }),
    });

    const { result } = renderHook(() => useGlobalStats());

    // Simulate user NOT authenticated
    act(() => {
      __setAuthState(false);
    });

    await waitFor(() => {
      // Should stay at defaults because not authenticated
      expect(result.current.stats).toEqual({
        resumes: "12k+",
        users: "10k+",
        completion: "98%",
      });
    });

    // getDoc should not have been called since user is not authenticated
    expect(getDoc).not.toHaveBeenCalled();
  });

  it("should handle fetch error gracefully", async () => {
    (getDoc as jest.Mock).mockRejectedValue(new Error("Fetch failed"));

    const { result } = renderHook(() => useGlobalStats());

    // Simulate user authentication
    act(() => {
      __setAuthState(true);
    });

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
