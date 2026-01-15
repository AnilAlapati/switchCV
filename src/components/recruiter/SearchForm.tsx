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
      <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by name, skills, role, or location..."
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border-2 border-black text-slate-900 rounded-lg focus:outline-none placeholder-slate-500 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] focus:shadow-none focus:translate-x-[1px] focus:translate-y-[1px]"
            />
          </div>
          <button
            type="button"
            onClick={onFiltersToggle}
            className={`px-5 py-3 rounded-lg font-bold flex items-center gap-2 transition-all border-2 border-black ${showFilters
                ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
                : "bg-white text-slate-900 hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
              }`}
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">Filters</span>
          </button>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-black border-2 border-black text-white font-bold rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {/* Expandable Filters */}
      {showFilters && (
        <div className="bg-white border-2 border-black p-6 space-y-5 animate-in slide-in-from-top-2 duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Location Filter */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span>📍</span>
                Location
              </label>
              <input
                type="text"
                placeholder="City, State, or Country"
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border-2 border-black text-slate-900 rounded-lg focus:outline-none placeholder-slate-500 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] focus:shadow-none focus:translate-x-[1px] focus:translate-y-[1px]"
              />
            </div>

            {/* Target Role Filter */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span>💼</span>
                Target Role
              </label>
              <input
                type="text"
                placeholder="e.g., Senior Developer, Product Manager"
                value={targetRole}
                onChange={(e) => onTargetRoleChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border-2 border-black text-slate-900 rounded-lg focus:outline-none placeholder-slate-500 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] focus:shadow-none focus:translate-x-[1px] focus:translate-y-[1px]"
              />
            </div>
          </div>

          {/* Skills Filter */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span>🎯</span>
              Skills
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_SKILLS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => onSkillToggle(skill)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all border-2 border-black ${selectedSkills.includes(skill)
                      ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
                      : "bg-white text-slate-700 hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                    }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Option */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span>📊</span>
              Sort By
            </label>
            <div className="relative">
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
                className="w-full px-4 py-2.5 bg-white border-2 border-black text-slate-900 rounded-lg focus:outline-none appearance-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] transition-all"
              >
                <option value="relevance">Most Relevant</option>
                <option value="recentlyActive">Recently Active</option>
                <option value="connections">Most Connections</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                ▼
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
