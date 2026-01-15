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
    <div className="bg-white p-5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px]">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold font-serif text-slate-900 text-lg">
            {result.displayName}
          </h3>
          {result.role && (
            <p className="text-sm text-slate-600 flex items-center gap-1 mt-1 font-medium">
              <span>💼</span>
              {result.role}
            </p>
          )}
          {result.location && (
            <p className="text-sm text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
              <span>📍</span>
              {result.location}
            </p>
          )}
        </div>
        {result.hasApproval && (
          <span className="text-xs bg-emerald-100 text-emerald-900 border-2 border-black px-3 py-1 rounded-full font-bold">
            ✓ Approved
          </span>
        )}
      </div>

      {result.bio && (
        <p className="text-sm text-slate-700 mb-4 line-clamp-2">
          {result.bio}
        </p>
      )}

      {result.skills && result.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {result.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="text-xs bg-slate-50 text-slate-900 px-3 py-1 rounded-full border border-black font-bold"
            >
              {skill}
            </span>
          ))}
          {result.skills.length > 4 && (
            <span className="text-xs text-slate-500 px-2 py-1 font-medium">
              +{result.skills.length - 4} more
            </span>
          )}
        </div>
      )}

      <button
        onClick={onSelect}
        className="w-full px-4 py-2.5 bg-black text-white rounded-lg hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] transition-all text-sm font-bold border-2 border-black"
      >
        Request Contact Information
      </button>
    </div>
  );
}

import { SearchResultsSkeleton } from "@/components/recruiter/SearchResultsSkeleton";

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
      {isLoading && <SearchResultsSkeleton />}

      {!isLoading && results.length === 0 && query && (
        <div className="bg-white border-2 border-black rounded-xl text-center py-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-5xl mx-auto mb-3">🔍</div>
          <p className="text-slate-900 font-bold font-serif text-lg mb-1">
            No candidates found matching your criteria
          </p>
          <p className="text-sm text-slate-600 font-medium">
            Try adjusting your search filters or using different keywords
          </p>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 font-bold uppercase tracking-wide">
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
