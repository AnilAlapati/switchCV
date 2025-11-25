"use client";

import Link from "next/link";

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
  return (
    <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-4">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <svg
          className="w-5 h-5 text-cyan-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        Current Snapshot
      </h2>
      <p className="text-sm text-gray-300 mt-2">
        <span className="font-medium text-gray-200">Title:</span>{" "}
        {title || "Untitled resume"}
      </p>
      {summary && (
        <p className="text-sm text-gray-300 mt-2">
          <span className="font-medium text-gray-200">Summary:</span> {summary}
        </p>
      )}
      {updatedAt && (
        <p className="text-xs text-gray-500 mt-3">
          Last updated {new Date(updatedAt).toLocaleString()}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        <Link
          href={`/resumes/${resumeId}`}
          className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-700/70 rounded-lg border border-gray-600 hover:bg-gray-700"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Public Resume
        </Link>
        <Link
          href={`/resumes/${resumeId}/edit`}
          className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-700/70 rounded-lg border border-gray-600 hover:bg-gray-700"
        >
          Open Manual Editor
        </Link>
      </div>
    </div>
  );
}
