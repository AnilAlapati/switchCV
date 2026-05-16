"use client";

import Link from "next/link";
import { useUserProfile } from "@/hooks/useUserProfile";
import { RestrictedFeature } from "@/components/ui/RestrictedFeature";

interface ResumeSnapshotCardProps {
  resumeId: string;
  title?: string | null;
  summary?: string | null;
  updatedAt?: string | null;
}

export function ResumeSnapshotCard({
  resumeId,
  title,
  summary,
  updatedAt,
}: ResumeSnapshotCardProps) {
  const { tier } = useUserProfile();
  const isBasicUser = tier === "basic";

  return (
    <div className="border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Current snapshot
      </h2>
      <p className="text-sm text-gray-700 mt-2">
        <span className="font-medium text-gray-900">Title:</span>{" "}
        {title || "Untitled resume"}
      </p>
      {summary && (
        <p className="text-sm text-gray-600 mt-1.5">
          <span className="font-medium text-gray-900">Summary:</span> {summary}
        </p>
      )}
      {updatedAt && (
        <p className="text-xs text-gray-400 mt-2">
          Last updated {new Date(updatedAt).toLocaleString()}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/resumes/${resumeId}`}
          className="inline-flex items-center px-3 py-1.5 text-sm border-2 border-black bg-black text-white font-semibold hover:bg-gray-800 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          View public resume
        </Link>
        <RestrictedFeature messageKey="AI_EDIT" requiredTier="premium">
          {isBasicUser ? (
            <button
              disabled
              className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-200 bg-gray-50 text-gray-400 font-medium cursor-not-allowed"
            >
              Open manual editor
            </button>
          ) : (
            <Link
              href={`/resumes/${resumeId}/edit`}
              className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 bg-white text-gray-700 font-medium hover:border-gray-900 transition-colors"
            >
              Open manual editor
            </Link>
          )}
        </RestrictedFeature>
      </div>
    </div>
  );
}
