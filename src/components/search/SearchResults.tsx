"use client";

import { ProfileSummaryCard } from "@/components/ProfileSummaryCard";
import { ProfileSearchResult } from "@/types/profileSearch";

interface SearchResultsProps {
  results: ProfileSearchResult[];
  searching: boolean;
  error: string | null;
  searchQuery: string;
  filterCount: number;
  totalResults: number;
}

export function SearchResults({
  results,
  searching,
  error,
  searchQuery,
  filterCount,
  totalResults,
}: SearchResultsProps) {
  // Error Message
  if (error) {
    return (
      <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300">
        {error}
      </div>
    );
  }

  // Results found
  if (results.length > 0) {
    return (
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
    );
  }

  // No results after search
  if (!searching && (searchQuery.trim() || filterCount > 0) && !error) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          No profiles found. Try different search terms or filters.
        </p>
      </div>
    );
  }

  // Initial state
  if (!searching && !searchQuery.trim() && filterCount === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          Start typing or use filters to search for professionals
        </p>
      </div>
    );
  }

  return null;
}
