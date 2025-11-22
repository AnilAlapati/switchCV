import { renderHook, act } from "@testing-library/react";
import { useResumeEnhancer } from "../../hooks/useResumeEnhancer";
import { logger } from "@/lib/logger";

// Mock dependencies
jest.mock("@/lib/logger");
global.fetch = jest.fn();

describe("useResumeEnhancer", () => {
  const mockResume = {
    id: "1",
    basics: { name: "John" },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useResumeEnhancer());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.enhancement).toBeNull();
  });

  it("should enhance resume successfully", async () => {
    const mockEnhancement = { score: 85, tips: [] };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockEnhancement),
    });

    const { result } = renderHook(() => useResumeEnhancer());

    let enhancementResult;
    await act(async () => {
      enhancementResult = await result.current.enhance(mockResume, "Job Desc");
    });

    expect(enhancementResult).toEqual(mockEnhancement);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.enhancement).toEqual(mockEnhancement);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/resume/enhance",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          resume: mockResume,
          jobDescription: "Job Desc",
        }),
      })
    );
  });

  it("should handle API error", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: "Enhancement failed" }),
    });

    const { result } = renderHook(() => useResumeEnhancer());

    await act(async () => {
      try {
        await result.current.enhance(mockResume);
      } catch {
        // Expected error
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Enhancement failed");
    expect(result.current.enhancement).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });

  it("should handle network error", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useResumeEnhancer());

    await act(async () => {
      try {
        await result.current.enhance(mockResume);
      } catch {
        // Expected error
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Network error");
  });

  it("should clear error", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Error"));
    const { result } = renderHook(() => useResumeEnhancer());

    await act(async () => {
      try {
        await result.current.enhance(mockResume);
      } catch {}
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it("should reset state", async () => {
    const mockEnhancement = { score: 85, tips: [] };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockEnhancement),
    });

    const { result } = renderHook(() => useResumeEnhancer());

    await act(async () => {
      await result.current.enhance(mockResume);
    });

    expect(result.current.enhancement).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.enhancement).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
