// src/app/profiles/search/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { ProfileSummaryCard } from "@/components/ProfileSummaryCard";
import { ProfileSearchResult } from "@/types/profileSearch";
import { useTrackAnalytics } from "@/hooks/useAnalyticsTracking";

interface SearchFilters {
  role?: string;
  location?: string;
  skills?: string[];
  slug?: string;
}

const COMMON_ROLES = [
  "Software Engineer",
  "Product Manager",
  "Data Scientist",
  "Designer",
  "DevOps Engineer",
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
];

const COMMON_LOCATIONS = [
  "San Francisco, CA",
  "New York, NY",
  "Austin, TX",
  "Seattle, WA",
  "Remote",
  "London, UK",
  "Toronto, Canada",
];

const COMMON_SKILLS = [
  "React",
  "TypeScript",
  "Python",
  "Node.js",
  "AWS",
  "Machine Learning",
  "System Design",
  "Firebase",
];

export default function ProfileSearchPage() {
  const { user, loading } = useAuth();
  const { track } = useTrackAnalytics();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

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
      setResults([]);
      return;
    }

    if (user) {
      performSearch();
    }
  }, [debouncedQuery, filters, user]);

  const performSearch = useCallback(async () => {
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
  }, [debouncedQuery, filters, track]);

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
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, username, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-4 top-4 flex items-center gap-2">
              {searching && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-2 rounded-lg transition-all ${
                  showFilters
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                } ${filterCount > 0 ? "ring-2 ring-blue-400" : ""}`}
              >
                <span className="text-sm">
                  🔽 Filters {filterCount > 0 && `(${filterCount})`}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 p-6 bg-gray-800 rounded-lg border border-gray-700 space-y-6">
            {/* Role Filter */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Role</h3>
                {filters.role && (
                  <button
                    onClick={() => toggleFilter("role", filters.role!)}
                    className="text-xs text-gray-400 hover:text-red-400"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {COMMON_ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => toggleFilter("role", role)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      isFilterActive("role", role)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Location Filter */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Location</h3>
                {filters.location && (
                  <button
                    onClick={() => toggleFilter("location", filters.location!)}
                    className="text-xs text-gray-400 hover:text-red-400"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {COMMON_LOCATIONS.map((location) => (
                  <button
                    key={location}
                    onClick={() => toggleFilter("location", location)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      isFilterActive("location", location)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {location}
                  </button>
                ))}
              </div>
            </div>

            {/* Skills Filter */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Skills</h3>
                {filters.skills && filters.skills.length > 0 && (
                  <button
                    onClick={() => setFilters({ ...filters, skills: [] })}
                    className="text-xs text-gray-400 hover:text-red-400"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {COMMON_SKILLS.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => toggleFilter("skills", skill)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      isFilterActive("skills", skill)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              {filters.skills && filters.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {filters.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-1 bg-blue-900 text-blue-200 rounded-full text-xs flex items-center gap-1"
                    >
                      {skill}
                      <button
                        onClick={() => toggleFilter("skills", skill)}
                        className="ml-1 hover:text-blue-100"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Clear All Button */}
            {filterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-all"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div>
            <p className="text-gray-400 mb-6">
              Found {results.length} profile{results.length !== 1 ? "s" : ""} of{" "}
              {totalResults} total
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((profile) => (
                <ProfileSummaryCard key={profile.userId} profile={profile} />
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {!searching &&
          (debouncedQuery.trim() || filterCount > 0) &&
          results.length === 0 &&
          !error && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No profiles found. Try different search terms or filters.
              </p>
            </div>
          )}

        {/* Initial State */}
        {!searching && !debouncedQuery.trim() && filterCount === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Start typing or use filters to search for professionals
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
