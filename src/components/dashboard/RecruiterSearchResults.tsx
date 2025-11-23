import { SearchResult } from "./RecruiterSearchForm";

interface RecruiterSearchResultsProps {
  results: SearchResult[];
  searched: boolean;
  error: string | null;
  notification: string | null;
  searchMode: "basic" | "premium";
  onViewResume: (resumeId: string) => void;
  onRequestAccess?: (resumeId: string, userName: string) => void;
}

export function RecruiterSearchResults({
  results,
  searched,
  error,
  notification,
  searchMode,
  onViewResume,
  onRequestAccess,
}: RecruiterSearchResultsProps) {
  // Error Message
  if (error) {
    return (
      <div className="px-4 py-3 rounded-lg text-sm font-medium bg-red-500/20 text-red-300 border border-red-500/30 mb-6">
        {error}
      </div>
    );
  }

  // Notification
  if (notification) {
    return (
      <div className="px-4 py-3 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-6">
        ℹ️ {notification}
      </div>
    );
  }

  // Search Results
  if (searched && results.length > 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4">
          Found {results.length} resume{results.length !== 1 ? "s" : ""}
        </h3>

        {results.map((result) => (
          <div
            key={result.resumeId}
            className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-cyan-500/30 hover:bg-white/10 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-white mb-1">
                  {result.title}
                </h4>
                <p className="text-slate-400 text-sm">
                  👤 <span className="text-slate-300">{result.userName}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-xs font-semibold">
                  ID: {result.userId.substring(0, 6)}
                </span>
                {result.accessStatus && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                      result.accessStatus === "approved"
                        ? "bg-green-500/20 text-green-300"
                        : result.accessStatus === "pending"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {result.accessStatus}
                  </span>
                )}
              </div>
            </div>

            {result.skills && result.skills.length > 0 && (
              <div className="mb-3">
                <p className="text-slate-400 text-xs font-semibold mb-2">
                  Skills:
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.location && (
              <div className="mb-3">
                <p className="text-slate-400 text-xs font-semibold mb-1">
                  📍 Location:
                </p>
                <p className="text-slate-300 text-sm">{result.location}</p>
              </div>
            )}

            {result.accessStatus === "approved" ? (
              <button
                onClick={() => onViewResume(result.resumeId)}
                className="w-full px-4 py-2 mt-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-medium rounded-lg transition-all duration-200"
              >
                View Full Resume
              </button>
            ) : result.accessStatus === "pending" ? (
              <button
                disabled
                className="w-full px-4 py-2 mt-3 bg-yellow-500/20 text-yellow-300 font-medium rounded-lg cursor-not-allowed"
              >
                Request Pending
              </button>
            ) : (
              <button
                onClick={() =>
                  onRequestAccess?.(result.resumeId, result.userName)
                }
                className="w-full px-4 py-2 mt-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-medium rounded-lg transition-all duration-200"
              >
                Request Access
              </button>
            )}

            <p className="text-slate-500 text-xs mt-3">
              Posted: {new Date(result.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    );
  }

  // Empty State
  if (searched && results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-500/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
        </div>
        <p className="text-slate-400 text-sm mb-2">No resumes found</p>
        <p className="text-slate-500 text-xs">Try different search criteria</p>
      </div>
    );
  }

  // Initial State
  if (!searched && results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-cyan-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <p className="text-slate-400 text-sm mb-2">Start searching</p>
        <p className="text-slate-500 text-xs">
          {searchMode === "basic"
            ? "Use Basic mode to search by candidate ID (max 1 result)"
            : "Use Premium mode to search by skills and location (multiple results)"}
        </p>
      </div>
    );
  }

  return null;
}
