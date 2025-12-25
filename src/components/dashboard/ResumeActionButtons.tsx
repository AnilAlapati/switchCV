import React from "react";
import Link from "next/link";
import { getResumeUrl } from "@/lib/config";
import { useUserProfile } from "@/hooks/useUserProfile";
import { RestrictedFeature } from "@/components/ui/RestrictedFeature";

interface ResumeActionButtonsProps {
  resumeId: string | number | null;
  isPublished: boolean;
  isUpdatingVisibility: boolean;
  onToggleVisibility: () => void;
  onDelete: () => void;
}

export function ResumeActionButtons({
  resumeId,
  isPublished,
  isUpdatingVisibility,
  onToggleVisibility,
  onDelete,
}: ResumeActionButtonsProps) {
  const { tier } = useUserProfile();
  const isBasicUser = tier === "basic";
  const resumeIdString = resumeId ? String(resumeId) : null;

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={getResumeUrl(resumeId || "")}
        target="_blank"
        rel="noopener noreferrer"
        title={`Resume ID: ${resumeId || "Loading..."}`}
        className="inline-flex items-center gap-2 rounded-xl glass-button px-4 py-2 text-sm font-bold transition-all shadow-sm"
      >
        View Resume
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>

      <button
        onClick={onToggleVisibility}
        disabled={isUpdatingVisibility}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all border ${
          isPublished
            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/20"
            : "bg-white/40 text-[#1A2F25]/60 border-white/60 hover:bg-white/60 hover:text-[#1A2F25]"
        }`}
      >
        {isUpdatingVisibility ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isPublished ? (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        ) : (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
          </svg>
        )}
        {isPublished ? "Public" : "Private"}
      </button>

      {resumeIdString ? (
        <RestrictedFeature
          messageKey="AI_EDIT"
          requiredTier="premium"
          tooltipPosition="left"
        >
          {isBasicUser ? (
            <button
              disabled
              className="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2 text-sm font-bold text-slate-400 cursor-not-allowed opacity-60"
            >
              Edit
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5h2m-1-1v2m1 5h-4m6-9.5l1.5 1.5M5 19l4.586-4.586a2 2 0 012.828 0L17 19"
                />
              </svg>
            </button>
          ) : (
            <Link
              href={`/resumes/${resumeIdString}/edit`}
              className="inline-flex items-center gap-2 rounded-xl bg-white/40 border border-white/60 px-4 py-2 text-sm font-bold text-[#1A2F25] transition hover:bg-white/60 shadow-sm"
            >
              Edit
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5h2m-1-1v2m1 5h-4m6-9.5l1.5 1.5M5 19l4.586-4.586a2 2 0 012.828 0L17 19"
                />
              </svg>
            </Link>
          )}
        </RestrictedFeature>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2 text-sm font-bold text-slate-400 opacity-60"
        >
          Edit
        </button>
      )}
      <button
        onClick={onDelete}
        className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:border-red-200 hover:bg-red-100"
      >
        Delete
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}
