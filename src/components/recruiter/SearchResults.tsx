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
    <div className="glass-panel p-5 hover:shadow-lg transition-all duration-200 border border-[#2C4A3B]/10 hover:border-emerald-500/30">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-[#1A2F25] text-lg">
            {result.displayName}
          </h3>
          {result.role && (
            <p className="text-sm text-[#1A2F25]/70 flex items-center gap-1 mt-1">
              <span>💼</span>
              {result.role}
            </p>
          )}
          {result.location && (
            <p className="text-sm text-[#1A2F25]/70 flex items-center gap-1 mt-0.5">
              <span>📍</span>
              {result.location}
            </p>
          )}
        </div>
        {result.hasApproval && (
          <span className="text-xs bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-3 py-1 rounded-full font-medium">
            ✓ Approved
          </span>
        )}
      </div>

      {result.bio && (
        <p className="text-sm text-[#1A2F25]/80 mb-4 line-clamp-2">
          {result.bio}
        </p>
      )}

      {result.skills && result.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {result.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="text-xs bg-[#2C4A3B]/10 text-[#1A2F25]/80 px-3 py-1 rounded-full border border-[#2C4A3B]/20 font-medium"
            >
              {skill}
            </span>
          ))}
          {result.skills.length > 4 && (
            <span className="text-xs text-[#1A2F25]/50 px-2 py-1 font-medium">
              +{result.skills.length - 4} more
            </span>
          )}
        </div>
      )}

      <button
        onClick={onSelect}
        className="w-full px-4 py-2.5 bg-gradient-to-r from-[#2C4A3B] to-emerald-600 text-white rounded-lg hover:shadow-md transition-all text-sm font-semibold"
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
    <div className="space-y-4">
      {isLoading && (
        <div className="glass-panel text-center py-12">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#2C4A3B]/20 border-t-emerald-600"></div>
          <p className="mt-4 text-[#1A2F25]/70 font-medium">
            Searching candidates...
          </p>
        </div>
      )}

      {!isLoading && results.length === 0 && query && (
        <div className="glass-panel text-center py-12">
          <div className="text-5xl mx-auto mb-3">🔍</div>
          <p className="text-[#1A2F25] font-medium text-lg mb-1">
            No candidates found matching your criteria
          </p>
          <p className="text-sm text-[#1A2F25]/60">
            Try adjusting your search filters or using different keywords
          </p>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#1A2F25]/70 font-medium">
              Found {results.length} candidate{results.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {results.map((result) => (
              <CandidateCard
                key={result.userId}
                result={result}
                onSelect={() => onSelectCandidate?.(result.userId, result)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
