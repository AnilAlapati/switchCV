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
    <div className="glass-panel rounded-xl p-4 transition hover:shadow-lg hover:shadow-[#2C4A3B]/10 hover:border-white">
      <h2 className="text-lg font-semibold text-[#1A2F25] flex items-center gap-2">
        <svg
          className="w-5 h-5 text-[#2C4A3B]"
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
      <p className="text-sm text-[#1A2F25]/70 mt-2">
        <span className="font-medium text-[#1A2F25]">Title:</span>{" "}
        {title || "Untitled resume"}
      </p>
      {summary && (
        <p className="text-sm text-[#1A2F25]/70 mt-2">
          <span className="font-medium text-[#1A2F25]">Summary:</span> {summary}
        </p>
      )}
      {updatedAt && (
        <p className="text-xs text-[#2C4A3B]/60 mt-3">
          Last updated {new Date(updatedAt).toLocaleString()}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        <Link
          href={`/resumes/${resumeId}`}
          className="inline-flex items-center px-3 py-1.5 text-sm glass-button font-medium rounded-lg"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Public Resume
        </Link>
        <Link
          href={`/resumes/${resumeId}/edit`}
          className="inline-flex items-center px-3 py-1.5 text-sm glass-button font-medium rounded-lg"
        >
          Open Manual Editor
        </Link>
      </div>
    </div>
  );
}
