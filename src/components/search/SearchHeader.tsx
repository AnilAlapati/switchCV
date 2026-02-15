"use client";

interface SearchHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showFilters: boolean;
  onShowFiltersToggle: () => void;
  filterCount: number;
  searching: boolean;
}

export function SearchHeader({
  searchQuery,
  onSearchChange,
  showFilters,
  onShowFiltersToggle,
  filterCount,
  searching,
}: SearchHeaderProps) {
  return (
    <div className="mb-6">
      <div className="relative">
        <input
          type="text"
          placeholder="Search by name, username, or skills..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-6 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {searching && (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" role="status"></div>
          )}
          <button
            onClick={onShowFiltersToggle}
            className={`px-3 py-2 rounded-lg transition-all ${showFilters
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
  );
}
