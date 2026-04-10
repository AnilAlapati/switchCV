/**
 * useResumeQuota.test.ts
 *
 * Tests for the useResumeQuota hook.
 */
import { renderHook, waitFor } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────

const mockGetIdToken = jest.fn().mockResolvedValue("mock-token");
const mockUser = { uid: "user-123", getIdToken: mockGetIdToken };
let mockAuthLoading = false;
let mockUserValue: typeof mockUser | null = mockUser;

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUserValue,
    loading: mockAuthLoading,
  }),
}));

// Mock SWR to avoid actual fetching
const mockMutate = jest.fn();
let mockSWRData: unknown = undefined;
let mockSWRError: unknown = undefined;
let mockSWRIsLoading = false;

jest.mock("swr", () => ({
  __esModule: true,
  default: jest.fn((_key: unknown, _fetcher: unknown) => ({
    data: mockSWRData,
    error: mockSWRError,
    isLoading: mockSWRIsLoading,
    mutate: mockMutate,
  })),
}));

// Import after mocks
import { useResumeQuota } from "@/hooks/useResumeQuota";

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthLoading = false;
  mockUserValue = mockUser;
  mockSWRData = undefined;
  mockSWRError = undefined;
  mockSWRIsLoading = false;
});

describe("useResumeQuota", () => {
  it("returns optimistic defaults while loading", () => {
    mockSWRIsLoading = true;
    const { result } = renderHook(() => useResumeQuota());

    expect(result.current.canCreate).toBe(true); // Optimistic
    expect(result.current.current).toBe(0);
    expect(result.current.limit).toBe(9999);
    expect(result.current.remaining).toBe(9999);
    expect(result.current.tier).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("returns quota data when loaded", () => {
    mockSWRData = {
      allowed: true,
      current: 3,
      limit: 50,
      remaining: 47,
      tier: "premium",
    };

    const { result } = renderHook(() => useResumeQuota());

    expect(result.current.canCreate).toBe(true);
    expect(result.current.current).toBe(3);
    expect(result.current.limit).toBe(50);
    expect(result.current.remaining).toBe(47);
    expect(result.current.tier).toBe("premium");
    expect(result.current.loading).toBe(false);
  });

  it("returns canCreate=false when allowed=false", () => {
    mockSWRData = {
      allowed: false,
      current: 1,
      limit: 1,
      remaining: 0,
      tier: "basic",
    };

    const { result } = renderHook(() => useResumeQuota());

    expect(result.current.canCreate).toBe(false);
    expect(result.current.remaining).toBe(0);
  });

  it("handles SWR Error (instance of Error)", () => {
    mockSWRError = new Error("Failed to fetch resume quota");
    const { result } = renderHook(() => useResumeQuota());

    expect(result.current.error).toBe("Failed to fetch resume quota");
  });

  it("handles SWR error that is not an Error instance", () => {
    mockSWRError = "some string error";
    const { result } = renderHook(() => useResumeQuota());

    expect(result.current.error).toBe("Failed to fetch resume quota");
  });

  it("returns loading=true while auth is loading", () => {
    mockAuthLoading = true;
    const { result } = renderHook(() => useResumeQuota());

    expect(result.current.loading).toBe(true);
  });

  it("returns loading=true while auth loading even if SWR says not loading", () => {
    mockAuthLoading = true;
    mockSWRIsLoading = false;
    const { result } = renderHook(() => useResumeQuota());

    expect(result.current.loading).toBe(true);
  });

  it("does not fetch when user is null", () => {
    mockUserValue = null;
    const useSWR = require("swr").default;

    renderHook(() => useResumeQuota());

    // SWR should be called with null key (= no fetch)
    expect(useSWR).toHaveBeenCalledWith(
      null,
      expect.any(Function),
      expect.any(Object),
    );
  });

  it("refetch calls mutate", () => {
    mockSWRData = {
      allowed: true,
      current: 0,
      limit: 50,
      remaining: 50,
      tier: "premium",
    };

    const { result } = renderHook(() => useResumeQuota());
    result.current.refetch();

    expect(mockMutate).toHaveBeenCalled();
  });
});
