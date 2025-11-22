import { renderHook, waitFor } from "@testing-library/react";
import { useRecruiterRequests } from "@/hooks/useRecruiterRequests";
import { useAuth } from "@/hooks/useAuth";
import { onSnapshot } from "firebase/firestore";

// Mock dependencies
jest.mock("@/hooks/useAuth");
jest.mock("@/lib/firebase", () => ({
  db: {},
}));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
}));

describe("useRecruiterRequests", () => {
  const mockUser = { uid: "recruiter-123" };
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser, loading: false });
    (onSnapshot as jest.Mock).mockImplementation((query, callback) => {
      callback({
        docs: [
          {
            id: "req-1",
            data: () => ({
              id: "req-1",
              createdAt: "2023-01-01T10:00:00Z",
              status: "pending",
            }),
          },
          {
            id: "req-2",
            data: () => ({
              id: "req-2",
              createdAt: "2023-01-02T10:00:00Z",
              status: "pending",
            }),
          },
        ],
      });
      return mockUnsubscribe;
    });
  });

  it("should return requests sorted by date descending", async () => {
    const { result } = renderHook(() => useRecruiterRequests());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.requests).toHaveLength(2);
    expect(result.current.requests[0].id).toBe("req-2"); // Newer first
    expect(result.current.requests[1].id).toBe("req-1");
  });

  it("should not fetch if user is not authenticated", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: false });
    const { result } = renderHook(() => useRecruiterRequests());

    expect(onSnapshot).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true); // Remains loading or initial state
  });

  it("should not fetch if auth is loading", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: true });
    const { result } = renderHook(() => useRecruiterRequests());

    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it("should unsubscribe on unmount", () => {
    const { unmount } = renderHook(() => useRecruiterRequests());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
