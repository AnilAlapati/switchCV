"use client";

import Link from "next/link";

interface ResumeEditChatHeaderProps {
  connectionStatus?: { connected: boolean; model?: string } | null;
  resumeTitle?: string | null;
  resumeId?: string | null;
}

export function ResumeEditChatHeader({
  connectionStatus,
  resumeTitle,
  resumeId,
}: ResumeEditChatHeaderProps) {
  return (
    <div className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {resumeId ? (
            <Link
              href={`/resumes/${resumeId}`}
              className="flex-shrink-0 flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              aria-label="Back to resume"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
              Back
            </Link>
          ) : null}
          <div
            className="h-5 w-px bg-gray-200 flex-shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              AI Resume Editor
            </p>
            {resumeTitle && (
              <p className="text-xs text-gray-500 truncate">{resumeTitle}</p>
            )}
          </div>
        </div>
        {connectionStatus && (
          <div
            className={`flex-shrink-0 px-2.5 py-1 text-xs font-semibold border ${
              connectionStatus.connected
                ? "bg-gray-50 text-gray-700 border-gray-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {connectionStatus.connected
              ? `${connectionStatus.model ?? "Gemini"} ready`
              : "AI unavailable"}
          </div>
        )}
      </div>
    </div>
  );
}
