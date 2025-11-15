// src/app/profiles/search/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { SearchHeader } from "@/components/search/SearchHeader";
import { SearchFiltersPanel } from "@/components/search/SearchFiltersPanel";
import { SearchResults } from "@/components/search/SearchResults";
import { useProfileSearch } from "@/hooks/useProfileSearch";

interface SearchFilters {
  role?: string;
  location?: string;
  skills?: string[];
  slug?: string;
}

export default function ProfileSearchPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { results, searching, error, totalResults, performSearch } =
    useProfileSearch();

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  // Debounce search query (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search
  useEffect(() => {
    if (!debouncedQuery.trim() && Object.keys(filters).length === 0) {
      return;
    }

    if (user) {
      performSearch(debouncedQuery, filters);
    }
  }, [debouncedQuery, filters, user, performSearch]);

  const toggleFilter = (type: keyof SearchFilters, value: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };

      if (type === "skills") {
        const skills = (prev.skills || []) as string[];
        if (skills.includes(value)) {
          newFilters.skills = skills.filter((s) => s !== value);
          if (newFilters.skills?.length === 0) delete newFilters.skills;
        } else {
          newFilters.skills = [...skills, value];
        }
      } else {
        if (prev[type] === value) {
          delete newFilters[type];
        } else {
          newFilters[type] = value;
        }
      }

      return newFilters;
    });
  };

  const isFilterActive = (type: keyof SearchFilters, value: string) => {
    if (type === "skills") {
      return (filters.skills || []).includes(value);
    }
    return filters[type] === value;
  };

  const countActiveFilters = () => {
    let count = 0;
    if (filters.role) count++;
    if (filters.location) count++;
    if (filters.skills?.length) count += filters.skills.length;
    if (filters.slug) count++;
    return count;
  };

  const clearAllFilters = () => {
    setFilters({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const filterCount = countActiveFilters();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Discover Professionals</h1>
          <p className="text-gray-400">
            Search by name, skills, role, location, or slug to find
            professionals
          </p>
        </div>

        {/* Search Input */}
        <SearchHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showFilters={showFilters}
          onShowFiltersToggle={() => setShowFilters(!showFilters)}
          filterCount={filterCount}
          searching={searching}
        />

        {/* Filters Panel */}
        {showFilters && (
          <SearchFiltersPanel
            filters={filters}
            onToggleFilter={toggleFilter}
            isFilterActive={isFilterActive}
            onClearAllFilters={clearAllFilters}
            filterCount={filterCount}
          />
        )}

        {/* Results */}
        <SearchResults
          results={results}
          searching={searching}
          error={error}
          searchQuery={searchQuery}
          filterCount={filterCount}
          totalResults={totalResults}
        />
      </div>
    </div>
  );
}
