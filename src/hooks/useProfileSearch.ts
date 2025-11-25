import { useCallback, useState } from "react";
import { ProfileSearchResult } from "@/types/profileSearch";
import { useTrackAnalytics } from "@/hooks/useAnalyticsTracking";

interface SearchFilters {
  role?: string;
  location?: string;
  skills?: string[];
  slug?: string;
}

export function useProfileSearch() {
  const { track } = useTrackAnalytics();
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);

  const performSearch = useCallback(
    async (debouncedQuery: string, filters: SearchFilters) => {
      if (!debouncedQuery.trim() && Object.keys(filters).length === 0) return;

      try {
        setSearching(true);
        setError(null);

        const response = await fetch("/api/profiles/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: debouncedQuery,
            filters: Object.keys(filters).length > 0 ? filters : undefined,
            limit: 20,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || errorData.error || "Search failed"
          );
        }

        const data = await response.json();
        setResults(data.results || []);
        setTotalResults(data.total || 0);

        // Track search event
        if (data.results.length > 0) {
          await track("search", "click", {
            query: debouncedQuery,
            filters,
            resultCount: data.results.length,
          });
        }

        if (data.results.length === 0 && debouncedQuery.trim()) {
          setError("No profiles found matching your search");
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error("Search error:", errorMsg);
        setError(`Search failed: ${errorMsg}`);
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [track]
  );

  return {
    results,
    searching,
    error,
    totalResults,
    performSearch,
    setResults,
    setError,
  };
}
