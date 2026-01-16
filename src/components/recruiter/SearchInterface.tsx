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
        <div className="glass-panel p-4 bg-red-50 border-2 border-red-500/20">
          <div className="flex items-center gap-2 text-red-700">
            <span className="text-xl">⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Active Filters Badges */}
      {(location || selectedSkills.length > 0 || targetRole) && (
        <div className="flex flex-wrap gap-2">
          {location && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
              📍 {location}
              <button
                onClick={() => setLocation("")}
                className="hover:text-emerald-900 ml-1"
              >
                ✕
              </button>
            </div>
          )}
          {selectedSkills.map((skill) => (
            <div
              key={skill}
              className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm"
            >
              🎯 {skill}
              <button
                onClick={() => toggleSkill(skill)}
                className="hover:text-[#2C4A3B] ml-1"
              >
                ✕
              </button>
            </div>
          ))}
          {targetRole && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
              💼 {targetRole}
              <button
                onClick={() => setTargetRole("")}
                className="hover:text-emerald-900 ml-1"
              >
                ✕
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
