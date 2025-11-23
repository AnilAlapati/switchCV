"use client";

export interface SearchResult {
  userId: string;
  displayName: string;
  role?: string;
  location?: string;
  skills?: string[];
  bio: string;
  hasApproval: boolean;
}

interface CandidateCardProps {
  result: SearchResult;
  onSelect: () => void;
}

function CandidateCard({ result, onSelect }: CandidateCardProps) {
  return (
    <div className="border border-slate-800 bg-slate-900/50 rounded-lg p-4 hover:border-cyan-500/30 transition-all">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-white">{result.displayName}</h3>
          {result.role && (
            <p className="text-sm text-slate-400 flex items-center gap-1">
              <span>💼</span>
              {result.role}
            </p>
          )}
          {result.location && (
            <p className="text-sm text-slate-400 flex items-center gap-1">
              <span>📍</span>
              {result.location}
            </p>
          )}
        </div>
        {result.hasApproval && (
          <span className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-1 rounded">
            Already Approved
          </span>
        )}
      </div>

      {result.bio && (
        <p className="text-sm text-slate-300 mb-3 line-clamp-2">{result.bio}</p>
      )}

      {result.skills && result.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {result.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700"
            >
              {skill}
            </span>
          ))}
          {result.skills.length > 4 && (
            <span className="text-xs text-slate-500 px-2 py-1">
              +{result.skills.length - 4} more
            </span>
          )}
        </div>
      )}

      <button
        onClick={onSelect}
        className="w-full px-4 py-2 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors text-sm font-medium"
      >
        Request Contact Information
      </button>
    </div>
  );
}

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onSelectCandidate?: (userId: string, result: SearchResult) => void;
}

export function SearchResults({
  results,
  isLoading,
  query,
  onSelectCandidate,
}: SearchResultsProps) {
  return (
    <div className="space-y-3">
      {isLoading && (
        <div className="text-center py-8 text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          <p className="mt-2">Searching candidates...</p>
        </div>
      )}

      {!isLoading && results.length === 0 && query && (
        <div className="text-center py-8 text-slate-400">
          <div className="text-4xl mx-auto mb-2">🔍</div>
          <p>No candidates found matching your criteria</p>
          <p className="text-sm text-slate-500 mt-1">
            Try adjusting your search filters
          </p>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <>
          <p className="text-sm text-slate-400">
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
  );
}
