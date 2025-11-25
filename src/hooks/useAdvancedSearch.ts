// src/hooks/useAdvancedSearch.ts
/**
 * React Hook for Advanced Profile Search
 * Manages full-text search, filtering, saved searches, and search alerts
 */

import { useState, useCallback } from "react";
import {
  performFullTextSearch,
  applyAdvancedFilters,
  paginateResults,
  saveSavedSearch,
  setupSearchAlert,
} from "@/lib/advancedSearch";
import type { ProfileSearchResult } from "@/types/profileSearch";
import type { SavedSearch, SearchFilters, SearchResult } from "@/lib/advancedSearch";

interface UseAdvancedSearchState {
  query: string;
  filters: SearchFilters;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  results: SearchResult | null;
  savedSearches: SavedSearch[];
}

export const useAdvancedSearch = (allProfiles: ProfileSearchResult[] = []) => {
  const [state, setState] = useState<UseAdvancedSearchState>({
    query: "",
    filters: {},
    currentPage: 1,
    pageSize: 20,
    loading: false,
    error: null,
    results: null,
    savedSearches: [],
  });

  const search = useCallback(
    async (query: string, filters?: SearchFilters) => {
      setState((prev) => ({
        ...prev,
        query,
        filters: filters || {},
        loading: true,
        error: null,
        currentPage: 1,
      }));

      try {
        let searchResults = performFullTextSearch(query, allProfiles, filters);

        if (filters && Object.keys(filters).length > 0) {
          searchResults = applyAdvancedFilters(searchResults, filters);
        }

        const paginatedResults = paginateResults(searchResults, 1, state.pageSize);
        const startTime = performance.now();
        const endTime = performance.now();

        setState((prev) => ({
          ...prev,
          results: {
            ...paginatedResults,
            took: endTime - startTime,
          },
          loading: false,
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Search failed";
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
      }
    },
    [allProfiles, state.pageSize]
  );

  const handlePageChange = useCallback((page: number) => {
    setState((prev) => {
      if (!prev.results) return prev;
      const newResults = paginateResults(
        performFullTextSearch(prev.query, allProfiles, prev.filters),
        page,
        prev.pageSize
      );
      return {
        ...prev,
        currentPage: page,
        results: newResults,
      };
    });
  }, [allProfiles]);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setState((prev) => ({
      ...prev,
      pageSize,
      currentPage: 1,
    }));
  }, []);

  const saveSearch = useCallback((name: string) => {
    if (!state.query) return;

    const savedSearch: SavedSearch = {
      id: `search_${Date.now()}`,
      userId: "current-user",
      name,
      query: state.query,
      filters: state.filters,
      createdAt: new Date(),
      isActive: true,
    };

    const saved = saveSavedSearch(savedSearch);
    setState((prev) => ({
      ...prev,
      savedSearches: [...prev.savedSearches, saved],
    }));
  }, [state.query, state.filters]);

  const setupAlert = useCallback(
    (searchId: string, frequency: "daily" | "weekly" | "monthly") => {
      setState((prev) => ({
        ...prev,
        savedSearches: prev.savedSearches.map((s) =>
          s.id === searchId ? setupSearchAlert(s, frequency) : s
        ),
      }));
    },
    []
  );

  const clearSearch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      query: "",
      filters: {},
      results: null,
      currentPage: 1,
    }));
  }, []);

  const updateFilters = useCallback((newFilters: SearchFilters) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      currentPage: 1,
    }));
  }, []);

  return {
    // State
    query: state.query,
    filters: state.filters,
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    loading: state.loading,
    error: state.error,
    results: state.results,
    savedSearches: state.savedSearches,

    // Actions
    search,
    handlePageChange,
    handlePageSizeChange,
    saveSearch,
    setupAlert,
    clearSearch,
    updateFilters,
  };
};
