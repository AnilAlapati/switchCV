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
      "/api/resumes/delete",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ userId: undefined, numericId: 123 }),
      })
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

  it("should handle network error", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useResumeDelete());

    let deleteResult;
    await act(async () => {
      deleteResult = await result.current.deleteResume({
        method: "slug",
        value: "my-resume",
      });
    });

    expect(deleteResult).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual({
      message: "Network error",
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
});
