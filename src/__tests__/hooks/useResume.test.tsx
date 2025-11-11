// src/__tests__/hooks/useResume.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { useResume } from "@/hooks/useResume";
import { getDocs } from "firebase/firestore";

// Mock Firebase
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

// Mock useAuth
const mockUseAuth = jest.fn();
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Firebase Firestore
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

const mockedGetDocs = jest.mocked(getDocs);

describe("useResume", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return initial state when no user", () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useResume());

    expect(result.current.resume).toBeNull();
    expect(result.current.loading).toBe(false); // Hook sets loading to false when no user
    expect(result.current.error).toBeNull();
    expect(result.current.hasResume).toBe(false);
    expect(result.current.resumeSlug).toBeNull();
  });

  it("should fetch resume when user exists", async () => {
    const mockUser = { uid: "test-user-id" };
    const mockResumeData = {
      title: "Test Resume",
      summary: "Test summary",
      slug: "test-slug",
    };
    const mockDoc = {
      id: "resume-id",
      data: () => mockResumeData,
    };
    const mockQuerySnapshot = {
      empty: false,
      docs: [mockDoc],
      metadata: {},
      query: {},
      size: 1,
      forEach: jest.fn(),
      docChanges: jest.fn(),
    };

    mockUseAuth.mockReturnValue({ user: mockUser });

    mockedGetDocs.mockResolvedValue(mockQuerySnapshot as any);

    const { result } = renderHook(() => useResume());

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.resume).toEqual({
      ...mockResumeData,
      id: "resume-id",
    });
    expect(result.current.error).toBeNull();
    expect(result.current.hasResume).toBe(true);
    expect(result.current.resumeSlug).toBe("test-slug");
  });

  it("should handle no resume found", async () => {
    const mockUser = { uid: "test-user-id" };
    const mockQuerySnapshot = {
      empty: true,
      docs: [],
      metadata: {},
      query: {},
      size: 0,
      forEach: jest.fn(),
      docChanges: jest.fn(),
    };

    mockUseAuth.mockReturnValue({ user: mockUser });

    mockedGetDocs.mockResolvedValue(mockQuerySnapshot as any);

    const { result } = renderHook(() => useResume());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.resume).toBeNull();
    expect(result.current.hasResume).toBe(false);
    expect(result.current.resumeSlug).toBeNull();
  });

  it("should handle fetch error", async () => {
    const mockUser = { uid: "test-user-id" };
    const mockError = new Error("Firebase error");

    mockUseAuth.mockReturnValue({ user: mockUser });

    mockedGetDocs.mockRejectedValue(mockError);

    const { result } = renderHook(() => useResume());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.resume).toBeNull();
    expect(result.current.error).toBe("Firebase error");
    expect(result.current.hasResume).toBe(false);
  });

  it("should refetch when refetch is called", async () => {
    const mockUser = { uid: "test-user-id" };
    const mockResumeData = {
      title: "Test Resume",
      summary: "Test summary",
      slug: "test-slug",
    };
    const mockDoc = {
      id: "resume-id",
      data: () => mockResumeData,
    };
    const mockQuerySnapshot = {
      empty: false,
      docs: [mockDoc],
      metadata: {},
      query: {},
      size: 1,
      forEach: jest.fn(),
      docChanges: jest.fn(),
    };

    mockUseAuth.mockReturnValue({ user: mockUser });

    mockedGetDocs.mockResolvedValue(mockQuerySnapshot as any);

    const { result } = renderHook(() => useResume());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear the mock call history to track refetch calls
    mockedGetDocs.mockClear();

    // Call refetch - this should trigger a new fetch
    result.current.refetch();

    // Wait for getDocs to be called again (indicating refetch worked)
    await waitFor(() => {
      expect(mockedGetDocs).toHaveBeenCalledTimes(1);
    });

    // Verify the resume data is still there after refetch
    expect(result.current.resume).toEqual({
      ...mockResumeData,
      id: "resume-id",
    });
  });
});
