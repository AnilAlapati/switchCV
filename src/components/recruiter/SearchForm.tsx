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
      <div className="glass-panel p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1A2F25]/40 text-lg">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by name, skills, role, or location..."
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/50 border border-[#2C4A3B]/20 text-[#1A2F25] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-[#1A2F25]/40 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={onFiltersToggle}
            className={`px-5 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
              showFilters
                ? "bg-[#2C4A3B] text-white shadow-md"
                : "glass-panel hover:bg-white/60 text-[#1A2F25]/70 hover:text-[#1A2F25]"
            }`}
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">Filters</span>
          </button>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-gradient-to-r from-[#2C4A3B] to-emerald-600 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {/* Expandable Filters */}
      {showFilters && (
        <div className="glass-panel p-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Location Filter */}
            <div>
              <label className="block text-sm font-semibold text-[#1A2F25] mb-2 flex items-center gap-2">
                <span>📍</span>
                Location
              </label>
              <input
                type="text"
                placeholder="City, State, or Country"
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/50 border border-[#2C4A3B]/20 text-[#1A2F25] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-[#1A2F25]/40 transition-all"
              />
            </div>

            {/* Target Role Filter */}
            <div>
              <label className="block text-sm font-semibold text-[#1A2F25] mb-2 flex items-center gap-2">
                <span>💼</span>
                Target Role
              </label>
              <input
                type="text"
                placeholder="e.g., Senior Developer, Product Manager"
                value={targetRole}
                onChange={(e) => onTargetRoleChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/50 border border-[#2C4A3B]/20 text-[#1A2F25] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-[#1A2F25]/40 transition-all"
              />
            </div>
          </div>

          {/* Skills Filter */}
          <div>
            <label className="block text-sm font-semibold text-[#1A2F25] mb-3 flex items-center gap-2">
              <span>🎯</span>
              Skills
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_SKILLS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => onSkillToggle(skill)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedSkills.includes(skill)
                      ? "bg-gradient-to-r from-[#2C4A3B] to-emerald-600 text-white shadow-md"
                      : "bg-white/60 border border-[#2C4A3B]/20 text-[#1A2F25]/70 hover:border-emerald-500/50 hover:text-[#1A2F25]"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Option */}
          <div>
            <label className="block text-sm font-semibold text-[#1A2F25] mb-2 flex items-center gap-2">
              <span>📊</span>
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
              className="w-full px-4 py-2.5 bg-white/50 border border-[#2C4A3B]/20 text-[#1A2F25] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
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
