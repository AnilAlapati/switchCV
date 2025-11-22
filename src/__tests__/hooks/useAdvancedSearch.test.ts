import { renderHook, act } from "@testing-library/react";
import { useAdvancedSearch } from "@/hooks/useAdvancedSearch";
import {
  performFullTextSearch,
  applyAdvancedFilters,
  paginateResults,
  saveSavedSearch,
  setupSearchAlert,
} from "@/lib/advancedSearch";

// Mock dependencies
jest.mock("@/lib/advancedSearch", () => ({
  performFullTextSearch: jest.fn(),
  applyAdvancedFilters: jest.fn(),
  paginateResults: jest.fn(),
  saveSavedSearch: jest.fn(),
  setupSearchAlert: jest.fn(),
}));

describe("useAdvancedSearch", () => {
  const mockProfiles = [{ id: "1", name: "Test Profile" }];
  const mockResults = {
    items: mockProfiles,
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (performFullTextSearch as jest.Mock).mockReturnValue(mockProfiles);
    (applyAdvancedFilters as jest.Mock).mockReturnValue(mockProfiles);
    (paginateResults as jest.Mock).mockReturnValue(mockResults);
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useAdvancedSearch(mockProfiles as any));

    expect(result.current.query).toBe("");
    expect(result.current.filters).toEqual({});
    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.results).toBeNull();
  });

  it("should perform search", async () => {
    const { result } = renderHook(() => useAdvancedSearch(mockProfiles as any));

    await act(async () => {
      await result.current.search("test query");
    });

    expect(performFullTextSearch).toHaveBeenCalledWith(
      "test query",
      mockProfiles,
      undefined
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.results).toEqual(
      expect.objectContaining(mockResults)
    );
  });

  it("should handle search error", async () => {
    (performFullTextSearch as jest.Mock).mockImplementation(() => {
      throw new Error("Search failed");
    });

    const { result } = renderHook(() => useAdvancedSearch(mockProfiles as any));

    await act(async () => {
      await result.current.search("test query");
    });

    expect(result.current.error).toBe("Search failed");
    expect(result.current.loading).toBe(false);
  });

  it("should handle page change", () => {
    const { result } = renderHook(() => useAdvancedSearch(mockProfiles as any));

    // First perform a search to populate results
    act(() => {
      result.current.search("test");
    });

    act(() => {
      result.current.handlePageChange(2);
    });

    expect(paginateResults).toHaveBeenCalledWith(expect.any(Array), 2, 20);
    expect(result.current.currentPage).toBe(2);
  });

  it("should handle page size change", () => {
    const { result } = renderHook(() => useAdvancedSearch(mockProfiles as any));

    act(() => {
      result.current.handlePageSizeChange(50);
    });

    expect(result.current.pageSize).toBe(50);
    expect(result.current.currentPage).toBe(1);
  });

  it("should save search", () => {
    const { result } = renderHook(() => useAdvancedSearch(mockProfiles as any));
    const mockSavedSearch = { id: "1", name: "My Search" };
    (saveSavedSearch as jest.Mock).mockReturnValue(mockSavedSearch);

    act(() => {
      result.current.search("test");
    });

    act(() => {
      result.current.saveSearch("My Search");
    });

    expect(saveSavedSearch).toHaveBeenCalled();
    expect(result.current.savedSearches).toContain(mockSavedSearch);
  });

  it("should setup alert", async () => {
    const { result } = renderHook(() => useAdvancedSearch(mockProfiles as any));
    const mockSavedSearch = { id: "1", name: "My Search" };
    (saveSavedSearch as jest.Mock).mockReturnValue(mockSavedSearch);
    (setupSearchAlert as jest.Mock).mockReturnValue({
      ...mockSavedSearch,
      alertFrequency: "daily",
    });

    await act(async () => {
      await result.current.search("test");
    });

    await act(async () => {
      result.current.saveSearch("My Search");
    });

    await act(async () => {
      result.current.setupAlert("1", "daily");
    });

    expect(setupSearchAlert).toHaveBeenCalledWith(mockSavedSearch, "daily");
  });

  it("should clear search", () => {
    const { result } = renderHook(() => useAdvancedSearch(mockProfiles as any));

    act(() => {
      result.current.search("test");
    });

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.query).toBe("");
    expect(result.current.results).toBeNull();
  });

  it("should update filters", () => {
    const { result } = renderHook(() => useAdvancedSearch(mockProfiles as any));

    act(() => {
      result.current.updateFilters({ location: "New York" });
    });

    expect(result.current.filters).toEqual({ location: "New York" });
    expect(result.current.currentPage).toBe(1);
  });
});
