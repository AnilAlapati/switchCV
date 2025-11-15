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
  );
}
