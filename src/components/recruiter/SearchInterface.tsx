"use client";

import { useState, useCallback } from "react";
import { SearchForm } from "@/components/recruiter/SearchForm";
import {
  SearchResults,
  type SearchResult,
} from "@/components/recruiter/SearchResults";

export interface RecruiterSearchFilters {
  query: string;
  location?: string;
  skills?: string[];
  targetRole?: string;
  sortBy: "relevance" | "recentlyActive" | "connections";
}

export type { SearchResult };

interface SearchInterfaceProps {
  onSearch: (filters: RecruiterSearchFilters) => Promise<void>;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  onSelectCandidate?: (userId: string, result: SearchResult) => void;
}

export function SearchInterface({
  onSearch,
  results,
  isLoading,
  error,
  onSelectCandidate,
}: SearchInterfaceProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [targetRole, setTargetRole] = useState("");
  const [sortBy, setSortBy] = useState<
    "relevance" | "recentlyActive" | "connections"
  >("relevance");
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await onSearch({
        query,
        location: location || undefined,
        skills: selectedSkills.length > 0 ? selectedSkills : undefined,
        targetRole: targetRole || undefined,
        sortBy,
      });
    },
    [query, location, selectedSkills, targetRole, sortBy, onSearch]
  );

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  return (
    <div className="space-y-6">
      <SearchForm
        query={query}
        location={location}
        selectedSkills={selectedSkills}
        targetRole={targetRole}
        sortBy={sortBy}
        showFilters={showFilters}
        isLoading={isLoading}
        onQueryChange={setQuery}
        onLocationChange={setLocation}
        onSkillToggle={toggleSkill}
        onTargetRoleChange={setTargetRole}
        onSortChange={setSortBy}
        onFiltersToggle={() => setShowFilters(!showFilters)}
        onSearch={handleSearch}
      />

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Active Filters Badges */}
      {(location || selectedSkills.length > 0 || targetRole) && (
        <div className="flex flex-wrap gap-2">
          {location && (
            <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              {location}
              <button
                onClick={() => setLocation("")}
                className="hover:opacity-70"
              >
                ❌
              </button>
            </div>
          )}
          {selectedSkills.map((skill) => (
            <div
              key={skill}
              className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
            >
              {skill}
              <button
                onClick={() => toggleSkill(skill)}
                className="hover:opacity-70"
              >
                ❌
              </button>
            </div>
          ))}
          {targetRole && (
            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
              {targetRole}
              <button
                onClick={() => setTargetRole("")}
                className="hover:opacity-70"
              >
                ❌
              </button>
            </div>
          )}
        </div>
      )}

      <SearchResults
        results={results}
        isLoading={isLoading}
        query={query}
        onSelectCandidate={onSelectCandidate}
      />
    </div>
  );
}
