import { renderHook, act } from "@testing-library/react";
import { useAccessRequests } from "../../hooks/useAccessRequests";
import { useAuth } from "../../hooks/useAuth";
import { collection, onSnapshot } from "firebase/firestore";

// Mock dependencies
jest.mock("../../hooks/useAuth");
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  getFirestore: jest.fn(),
}));
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

describe("useAccessRequests", () => {
  const mockUser = { uid: "test-user-id" };
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser, loading: false });
    (onSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);
  });

  it("should return initial state", () => {
    const { result } = renderHook(() => useAccessRequests());

    expect(result.current.pendingRequests).toEqual([]);
    expect(result.current.activeGrants).toEqual([]);
    expect(result.current.deniedRequests).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it("should not subscribe if user is not authenticated", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: false });
    renderHook(() => useAccessRequests());

    expect(collection).not.toHaveBeenCalled();
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it("should not subscribe if auth is loading", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: true });
    renderHook(() => useAccessRequests());

    expect(collection).not.toHaveBeenCalled();
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it("should subscribe and update state with requests", () => {
    const mockRequests = [
      {
        id: "req1",
        data: () => ({
          status: "pending",
          timestamp: { toDate: () => new Date("2023-01-01") },
          recruiterId: "rec1",
        }),
      },
      {
        id: "req2",
        data: () => ({
          status: "denied",
          timestamp: { toDate: () => new Date("2023-01-02") },
          recruiterId: "rec2",
        }),
      },
    ];

    (onSnapshot as jest.Mock).mockImplementation((query, callback) => {
      // Check if this is the requests query (you might need more robust checking if multiple queries exist)
      // For simplicity, we assume the first call is for requests if we can distinguish, or just trigger both callbacks if needed.
      // In the hook, there are two useEffects. We can simulate the callback invocation.
      callback({ docs: mockRequests });
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useAccessRequests());

    expect(result.current.pendingRequests).toHaveLength(1);
    expect(result.current.pendingRequests[0].requestId).toBe("req1");
    expect(result.current.deniedRequests).toHaveLength(1);
    expect(result.current.deniedRequests[0].requestId).toBe("req2");
    expect(result.current.loading).toBe(false);
  });

  it("should subscribe and update state with active grants", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const mockGrants = [
      {
        id: "grant1",
        data: () => ({
          grantedAt: { toDate: () => new Date("2023-01-01") },
          expiresAt: { toDate: () => futureDate },
        }),
      },
      {
        id: "grant2",
        data: () => ({
          grantedAt: { toDate: () => new Date("2023-01-01") },
          expiresAt: { toDate: () => pastDate },
        }),
      },
    ];

    // We need to distinguish between the two onSnapshot calls.
    // The hook calls onSnapshot twice.
    // 1. requestsRef
    // 2. grantsRef

    // Let's mock implementation to handle both based on call order or arguments
    let requestsCallback: any;
    let grantsCallback: any;

    (onSnapshot as jest.Mock).mockImplementation((q, cb) => {
      // This is a bit fragile but works if we know the order or can inspect q
      // Since we can't easily inspect q without complex mocking of query(),
      // we can assume the order: requests first, then grants.
      if (!requestsCallback) {
        requestsCallback = cb;
      } else {
        grantsCallback = cb;
      }
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useAccessRequests());

    act(() => {
      if (grantsCallback) {
        grantsCallback({ docs: mockGrants });
      }
    });

    expect(result.current.activeGrants).toHaveLength(1);
    expect(result.current.activeGrants[0].grantId).toBe("grant1");
  });

  it("should handle errors in requests listener", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    (collection as jest.Mock).mockImplementation(() => {
      throw new Error("Firestore error");
    });

    renderHook(() => useAccessRequests());

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error setting up requests listener:",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
