import { Dispatch, SetStateAction } from "react";

export interface SearchResult {
  resumeId: string;
  title: string;
  userName: string;
  userId: string;
  skills?: string[];
  location?: string;
  createdAt: string;
  accessStatus?: "none" | "pending" | "approved" | "denied";
}

interface RecruiterSearchFormProps {
  searchMode: "basic" | "premium";
  setSearchMode: Dispatch<SetStateAction<"basic" | "premium">>;
  userId: string;
  setUserId: Dispatch<SetStateAction<string>>;
  skills: string[];
  location: string;
  setLocation: Dispatch<SetStateAction<string>>;
  loading: boolean;
  onSearch: (e: React.FormEvent) => Promise<void>;
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (index: number) => void;
  searchResults: SearchResult[];
  setSearchResults: Dispatch<SetStateAction<SearchResult[]>>;
  setSearched: Dispatch<SetStateAction<boolean>>;
}

export function RecruiterSearchForm({
  searchMode,
  setSearchMode,
  userId,
  setUserId,
  skills,
  location,
  setLocation,
  loading,
  onSearch,
  onAddSkill,
  onRemoveSkill,
  setSearchResults,
  setSearched,
}: RecruiterSearchFormProps) {
  return (
    <>
      {/* Mode Toggle */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => {
            setSearchMode("basic");
            setSearchResults([]);
            setSearched(false);
          }}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            searchMode === "basic"
              ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
              : "bg-white/10 text-slate-300 border border-white/20 hover:bg-white/15"
          }`}
        >
          🔍 Basic (ID Search)
        </button>
        <button
          onClick={() => {
            setSearchMode("premium");
            setSearchResults([]);
            setSearched(false);
          }}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            searchMode === "premium"
              ? "bg-purple-500/30 text-purple-300 border border-purple-500/50"
              : "bg-white/10 text-slate-300 border border-white/20 hover:bg-white/15"
          }`}
        >
          ⭐ Premium (Advanced)
        </button>
      </div>

      {/* Search Form */}
      <form onSubmit={onSearch} className="mb-6">
        {searchMode === "basic" ? (
          // Basic Search: By User ID or Resume ID
          <div className="space-y-3">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter resume ID or user ID..."
              disabled={loading}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/15 transition-all duration-200 disabled:opacity-50"
            />
            <p className="text-slate-400 text-xs">
              💡 Enter the resume ID (e.g., "1", "2") or user ID. Returns max 1
              resume.
            </p>
          </div>
        ) : (
          // Premium Search: Skills + Location
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Skills (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  id="skillInput"
                  placeholder="Add a skill..."
                  disabled={loading}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const input = e.currentTarget as HTMLInputElement;
                      onAddSkill(input.value);
                      input.value = "";
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/15 transition-all duration-200 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById(
                      "skillInput"
                    ) as HTMLInputElement;
                    onAddSkill(input.value);
                    input.value = "";
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-500/30 hover:bg-purple-500/40 text-purple-300 rounded-lg transition-all duration-200 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm flex items-center gap-2"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => onRemoveSkill(idx)}
                        className="hover:text-purple-100"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Location (Optional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location..."
                disabled={loading}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/15 transition-all duration-200 disabled:opacity-50"
              />
            </div>

            <p className="text-slate-400 text-xs">
              💡 Search by skills, location, or both. Returns multiple matching
              resumes (max 50).
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>
    </>
  );
}
