import { renderHook, act } from "@testing-library/react";
import { useResumeDelete } from "../../hooks/useResumeDelete";

// Mock fetch
global.fetch = jest.fn();

describe("useResumeDelete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useResumeDelete());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should delete resume successfully", async () => {
    const mockResponse = { success: true, message: "Deleted" };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const { result } = renderHook(() => useResumeDelete());

    let deleteResult;
    await act(async () => {
      deleteResult = await result.current.deleteResume({
        method: "numeric-id",
        value: 123,
      });
    });

    expect(deleteResult).toEqual(mockResponse);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/resumes/123",
      expect.objectContaining({
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("should handle delete error from API", async () => {
    const mockError = { message: "Not found" };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: jest.fn().mockResolvedValue(mockError),
    });

    const { result } = renderHook(() => useResumeDelete());

    let deleteResult;
    await act(async () => {
      deleteResult = await result.current.deleteResume({
        method: "document-id",
        value: "doc123",
      });
    });

    expect(deleteResult).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual({
      message: "Not found",
      code: "404",
    });
  });

  it("should handle slug deprecation safely", async () => {
    const { result } = renderHook(() => useResumeDelete());

    let deleteResult;
    await act(async () => {
      deleteResult = await result.current.deleteResume({
        method: "slug",
        value: "my-resume",
      });
    });

    expect(deleteResult).toBeNull();
    expect(result.current.error).toEqual({
      message: "Slug deletion is no longer supported. Use numeric-id.",
      code: "NETWORK_ERROR",
    });
  });

  it("should clear error", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Error"));
    const { result } = renderHook(() => useResumeDelete());

    await act(async () => {
      await result.current.deleteResume({ method: "numeric-id", value: 1 });
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it("should handle non-Error thrown objects gracefully", async () => {
    (global.fetch as jest.Mock).mockRejectedValue("string error");
    const { result } = renderHook(() => useResumeDelete());

    await act(async () => {
      await result.current.deleteResume({ method: "numeric-id", value: 1 });
    });

    expect(result.current.error).toEqual({
      message: "Failed to delete resume",
      code: "NETWORK_ERROR",
    });
  });

  it("should use default error message when API returns no message", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({}),
    });

    const { result } = renderHook(() => useResumeDelete());

    await act(async () => {
      await result.current.deleteResume({ method: "document-id", value: "x" });
    });

    expect(result.current.error?.message).toBe("Failed to delete resume");
    expect(result.current.error?.code).toBe("500");
  });

  it("should return pool stats on successful numeric-id delete", async () => {
    const responseBody = {
      success: true,
      message: "Deleted",
      numericId: 42,
      poolStats: {
        poolSize: 5,
        maxSize: 100,
        utilizationRate: 0.05,
        totalRecycled: 1,
      },
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(responseBody),
    });

    const { result } = renderHook(() => useResumeDelete());

    let deleteResult: Awaited<ReturnType<typeof result.current.deleteResume>> =
      null;
    await act(async () => {
      deleteResult = await result.current.deleteResume({
        method: "numeric-id",
        value: 42,
      });
    });

    expect(
      (deleteResult as { poolStats?: { poolSize: number } } | null)?.poolStats
        ?.poolSize,
    ).toBe(5);
  });
});
