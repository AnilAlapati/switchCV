import { renderHook, act } from "@testing-library/react";
import { useProfileSearch } from "@/hooks/useProfileSearch";
import { useTrackAnalytics } from "@/hooks/useAnalyticsTracking";

// Mock dependencies
jest.mock("@/hooks/useAnalyticsTracking");

describe("useProfileSearch", () => {
  const mockTrack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useTrackAnalytics as jest.Mock).mockReturnValue({ track: mockTrack });
    global.fetch = jest.fn();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useProfileSearch());

    expect(result.current.results).toEqual([]);
    expect(result.current.searching).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.totalResults).toBe(0);
  });

  it("should perform search successfully", async () => {
    const mockResults = [
      { id: "1", name: "John Doe", title: "Developer" },
      { id: "2", name: "Jane Smith", title: "Designer" },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults, total: 2 }),
    });

    const { result } = renderHook(() => useProfileSearch());

    await act(async () => {
      await result.current.performSearch("developer", { location: "Remote" });
    });

    expect(result.current.results).toEqual(mockResults);
    expect(result.current.totalResults).toBe(2);
    expect(result.current.searching).toBe(false);
    expect(result.current.error).toBeNull();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/profiles/search",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          query: "developer",
          filters: { location: "Remote" },
          limit: 20,
        }),
      })
    );

    expect(mockTrack).toHaveBeenCalledWith("search", "click", {
      query: "developer",
      filters: { location: "Remote" },
      resultCount: 2,
    });
  });

  it("should handle search error", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ message: "API Error" }),
    });

    const { result } = renderHook(() => useProfileSearch());

    await act(async () => {
      await result.current.performSearch("developer", {});
    });

    expect(result.current.error).toBe("Search failed: API Error");
    expect(result.current.results).toEqual([]);
    expect(result.current.searching).toBe(false);
  });

  it("should handle network error", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => useProfileSearch());

    await act(async () => {
      await result.current.performSearch("developer", {});
    });

    expect(result.current.error).toBe("Search failed: Network Error");
    expect(result.current.results).toEqual([]);
  });

  it("should not search if query and filters are empty", async () => {
    const { result } = renderHook(() => useProfileSearch());

    await act(async () => {
      await result.current.performSearch("", {});
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should set error if no results found", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], total: 0 }),
    });

    const { result } = renderHook(() => useProfileSearch());

    await act(async () => {
      await result.current.performSearch("nonexistent", {});
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBe("No profiles found matching your search");
  });
});
