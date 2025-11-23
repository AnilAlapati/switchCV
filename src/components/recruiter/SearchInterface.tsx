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
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Active Filters Badges */}
      {(location || selectedSkills.length > 0 || targetRole) && (
        <div className="flex flex-wrap gap-2">
          {location && (
            <div className="flex items-center gap-2 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-3 py-1 rounded-full text-sm">
              {location}
              <button
                onClick={() => setLocation("")}
                className="hover:text-cyan-100"
              >
                ❌
              </button>
            </div>
          )}
          {selectedSkills.map((skill) => (
            <div
              key={skill}
              className="flex items-center gap-2 bg-purple-500/10 text-purple-300 border border-purple-500/20 px-3 py-1 rounded-full text-sm"
            >
              {skill}
              <button
                onClick={() => toggleSkill(skill)}
                className="hover:text-purple-100"
              >
                ❌
              </button>
            </div>
          ))}
          {targetRole && (
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-3 py-1 rounded-full text-sm">
              {targetRole}
              <button
                onClick={() => setTargetRole("")}
                className="hover:text-emerald-100"
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
