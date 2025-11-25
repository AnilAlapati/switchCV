"use client";

interface SearchFormProps {
  query: string;
  location: string;
  selectedSkills: string[];
  targetRole: string;
  sortBy: "relevance" | "recentlyActive" | "connections";
  showFilters: boolean;
  isLoading: boolean;
  onQueryChange: (query: string) => void;
  onLocationChange: (location: string) => void;
  onSkillToggle: (skill: string) => void;
  onTargetRoleChange: (role: string) => void;
  onSortChange: (sort: "relevance" | "recentlyActive" | "connections") => void;
  onFiltersToggle: () => void;
  onSearch: (e: React.FormEvent) => void;
}

const COMMON_SKILLS = [
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

export function SearchForm({
  query,
  location,
  selectedSkills,
  targetRole,
  sortBy,
  showFilters,
  isLoading,
  onQueryChange,
  onLocationChange,
  onSkillToggle,
  onTargetRoleChange,
  onSortChange,
  onFiltersToggle,
  onSearch,
}: SearchFormProps) {
  return (
    <form onSubmit={onSearch} className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-3 text-slate-400 text-lg">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by name, username, or keywords..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-500"
          />
        </div>
        <button
          type="button"
          onClick={onFiltersToggle}
          className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
            showFilters
              ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400"
              : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <span>⚙️</span>
          Filters
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-cyan-500 text-slate-950 font-semibold rounded-lg hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 transition-colors"
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Expandable Filters */}
      {showFilters && (
        <div className="border border-slate-800 rounded-lg p-4 space-y-4 bg-slate-900/50">
          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <span className="mr-2">📍</span>
              Location
            </label>
            <input
              type="text"
              placeholder="City, State, or Country"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-500"
            />
          </div>

          {/* Target Role Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <span className="mr-2">💼</span>
              Target Role
            </label>
            <input
              type="text"
              placeholder="e.g., Senior Developer, Product Manager"
              value={targetRole}
              onChange={(e) => onTargetRoleChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-500"
            />
          </div>

          {/* Skills Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Skills
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_SKILLS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => onSkillToggle(skill)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedSkills.includes(skill)
                      ? "bg-cyan-500 text-slate-950 font-medium"
                      : "bg-slate-950 border border-slate-700 text-slate-300 hover:border-cyan-500/50"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Option */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) =>
                onSortChange(
                  e.target.value as
                    | "relevance"
                    | "recentlyActive"
                    | "connections"
                )
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="relevance">Most Relevant</option>
              <option value="recentlyActive">Recently Active</option>
              <option value="connections">Most Connections</option>
            </select>
          </div>
        </div>
      )}
    </form>
  );
}
