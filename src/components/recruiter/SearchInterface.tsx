"use client";

import { useState, useCallback } from "react";

export interface RecruiterSearchFilters {
  query: string;
  location?: string;
  skills?: string[];
  targetRole?: string;
  sortBy: "relevance" | "recentlyActive" | "connections";
}

export interface SearchResult {
  userId: string;
  displayName: string;
  role?: string;
  location?: string;
  skills?: string[];
  bio: string;
  hasApproval: boolean;
}

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

  const commonSkills = [
    "React",
    "TypeScript",
    "Node.js",
    "Python",
    "JavaScript",
    "AWS",
    "Docker",
    "PostgreSQL",
    "MongoDB",
    "Next.js",
  ];

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
      {/* Search Header */}
      <form onSubmit={handleSearch} className="space-y-4">
        {/* Main Search Bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-3 text-gray-400 text-lg">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by name, username, or keywords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
              showFilters
                ? "bg-blue-50 border-blue-300 text-blue-600"
                : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span>⚙️</span>
            Filters
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="mr-2">📍</span>
                Location
              </label>
              <input
                type="text"
                placeholder="City, State, or Country"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Target Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="mr-2">💼</span>
                Target Role
              </label>
              <input
                type="text"
                placeholder="e.g., Senior Developer, Product Manager"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Skills Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills
              </label>
              <div className="flex flex-wrap gap-2">
                {commonSkills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedSkills.includes(skill)
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-300 hover:border-blue-300"
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Option */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as
                      | "relevance"
                      | "recentlyActive"
                      | "connections"
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="relevance">Most Relevant</option>
                <option value="recentlyActive">Recently Active</option>
                <option value="connections">Most Connections</option>
              </select>
            </div>
          </div>
        )}
      </form>

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

      {/* Results */}
      <div className="space-y-3">
        {isLoading && (
          <div className="text-center py-8 text-gray-600">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2">Searching candidates...</p>
          </div>
        )}

        {!isLoading && results.length === 0 && query && (
          <div className="text-center py-8 text-gray-600">
            <div className="text-4xl mx-auto mb-2">🔍</div>
            <p>No candidates found matching your criteria</p>
            <p className="text-sm text-gray-500 mt-1">
              Try adjusting your search filters
            </p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <>
            <p className="text-sm text-gray-600">
              Found {results.length} candidate{results.length !== 1 ? "s" : ""}
            </p>
            {results.map((result) => (
              <CandidateCard
                key={result.userId}
                result={result}
                onSelect={() => onSelectCandidate?.(result.userId, result)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

interface CandidateCardProps {
  result: SearchResult;
  onSelect: () => void;
}

function CandidateCard({ result, onSelect }: CandidateCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-gray-900">{result.displayName}</h3>
          {result.role && (
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <span>💼</span>
              {result.role}
            </p>
          )}
          {result.location && (
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <span>📍</span>
              {result.location}
            </p>
          )}
        </div>
        {result.hasApproval && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
            Already Approved
          </span>
        )}
      </div>

      {result.bio && (
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">{result.bio}</p>
      )}

      {result.skills && result.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {result.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
            >
              {skill}
            </span>
          ))}
          {result.skills.length > 4 && (
            <span className="text-xs text-gray-500 px-2 py-1">
              +{result.skills.length - 4} more
            </span>
          )}
        </div>
      )}

      <button
        onClick={onSelect}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        Request Contact Information
      </button>
    </div>
  );
}
