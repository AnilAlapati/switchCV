import { renderHook, waitFor } from "@testing-library/react";
import { useAccessRequests } from "../../hooks/useAccessRequests";
import { useAuth } from "../../hooks/useAuth";

// Mock dependencies
jest.mock("../../hooks/useAuth");
jest.mock("swr", () => ({
  __esModule: true,
  default: jest.fn(),
}));

import useSWR from "swr";

describe("useAccessRequests", () => {
  const mockUser = {
    uid: "test-user-id",
    getIdToken: jest.fn().mockResolvedValue("mock-token"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    global.fetch = jest.fn();
  });

  it("should return initial state when user is authenticated", () => {
    (useSWR as jest.Mock).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => useAccessRequests());

    expect(result.current.requests).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it("should return null SWR key when user is not authenticated", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null });
    (useSWR as jest.Mock).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => useAccessRequests());

    expect(result.current.requests).toEqual([]);
    expect(useSWR).toHaveBeenCalledWith(
      null,
      expect.any(Function),
      expect.any(Object)
    );
  });

  it("should fetch and return requests data", async () => {
    const mockRequests = [
      { id: "req1", status: "pending", timestamp: new Date() },
      { id: "req2", status: "approved", timestamp: new Date() },
    ];

    (useSWR as jest.Mock).mockReturnValue({
      data: { requests: mockRequests },
      error: undefined,
      isLoading: false,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => useAccessRequests());

    expect(result.current.requests).toEqual(mockRequests);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("should handle fetch errors", () => {
    const mockError = new Error("Network error");
    (useSWR as jest.Mock).mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
      mutate: jest.fn(),
    });

    const { result } = renderHook(() => useAccessRequests());

    expect(result.current.requests).toEqual([]);
    expect(result.current.error).toBe("Network error");
  });

  it("should return mutate function for cache invalidation", () => {
    const mockMutate = jest.fn();
    (useSWR as jest.Mock).mockReturnValue({
      data: { requests: [] },
      error: undefined,
      isLoading: false,
      mutate: mockMutate,
    });

    const { result } = renderHook(() => useAccessRequests());

    expect(result.current.mutate).toBe(mockMutate);
  });
});
