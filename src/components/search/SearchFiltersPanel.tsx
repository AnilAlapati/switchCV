"use client";

interface SearchFilters {
  role?: string;
  location?: string;
  skills?: string[];
  slug?: string;
}

interface SearchFiltersPanelProps {
  filters: SearchFilters;
  onToggleFilter: (type: keyof SearchFilters, value: string) => void;
  isFilterActive: (type: keyof SearchFilters, value: string) => boolean;
  onClearAllFilters: () => void;
  filterCount: number;
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

export function SearchFiltersPanel({
  filters,
  onToggleFilter,
  isFilterActive,
  onClearAllFilters,
  filterCount,
}: SearchFiltersPanelProps) {
  return (
    <div className="mb-6 p-6 bg-gray-800 rounded-lg border border-gray-700 space-y-6">
      {/* Role Filter */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Role</h3>
          {filters.role && (
            <button
              onClick={() => onToggleFilter("role", filters.role!)}
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
              onClick={() => onToggleFilter("role", role)}
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
              onClick={() => onToggleFilter("location", filters.location!)}
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
              onClick={() => onToggleFilter("location", location)}
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
              onClick={() => onToggleFilter("skills", "")}
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
              onClick={() => onToggleFilter("skills", skill)}
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
            {filters.skills.map((skill: string) => (
              <span
                key={skill}
                className="px-2 py-1 bg-blue-900 text-blue-200 rounded-full text-xs flex items-center gap-1"
              >
                {skill}
                <button
                  onClick={() => onToggleFilter("skills", skill)}
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
          onClick={onClearAllFilters}
          className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-all"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}
