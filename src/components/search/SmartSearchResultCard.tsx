"use client";

import Link from "next/link";

export interface SmartSearchResult {
  resumeId: number;
  userId: string;
  score: number;
  title: string;
  skills: string[];
  matchReason?: string;
}

interface SmartSearchResultCardProps {
  result: SmartSearchResult;
  onSelect?: (result: SmartSearchResult) => void;
}

export function SmartSearchResultCard({
  result,
  onSelect,
}: SmartSearchResultCardProps) {
  const scorePercentage = Math.round(result.score * 100);
  const scoreColor =
    scorePercentage >= 80
      ? "text-green-400"
      : scorePercentage >= 60
      ? "text-yellow-400"
      : "text-orange-400";

  return (
    <div
      className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-purple-500/50 transition-colors cursor-pointer"
      onClick={() => onSelect?.(result)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <Link
            href={`/resumes/${result.resumeId}`}
            className="text-lg font-medium text-white hover:text-purple-400 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {result.title || `Resume #${result.resumeId}`}
          </Link>
        </div>
        <div className={`text-sm font-medium ${scoreColor}`}>
          {scorePercentage}% match
        </div>
      </div>

      {/* Skills */}
      {result.skills && result.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {result.skills.slice(0, 6).map((skill, i) => (
            <span
              key={i}
              className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-full"
            >
              {skill}
            </span>
          ))}
          {result.skills.length > 6 && (
            <span className="px-2 py-1 text-gray-500 text-xs">
              +{result.skills.length - 6} more
            </span>
          )}
        </div>
      )}

      {/* Match reason (if provided by AI) */}
      {result.matchReason && (
        <p className="text-sm text-gray-400 italic">
          &ldquo;{result.matchReason}&rdquo;
        </p>
      )}

      {/* View Button */}
      <div className="mt-3 flex justify-end">
        <Link
          href={`/resumes/${result.resumeId}`}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          View Profile →
        </Link>
      </div>
    </div>
  );
}
