"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Tooltip } from "@/components/ui/Tooltip";
import { useUserProfile } from "@/hooks/useUserProfile";

interface ResumeActionCenterProps {
  hasResume: boolean;
  resumeId: string | number | null;
  resumeLoading: boolean;
  isPublished: boolean;
  lastUpdated?: string | Date | null;
  onToggleVisibility?: () => void;
  isUpdatingVisibility?: boolean;
}

export function ResumeActionCenter({
  hasResume,
  resumeId,
  resumeLoading,
  isPublished,
  lastUpdated,
  onToggleVisibility,
  isUpdatingVisibility,
}: ResumeActionCenterProps) {
  const resumeIdString = resumeId ? String(resumeId) : null;
  const { tier } = useUserProfile();
  const isBasicUser = tier === "basic";

  const statusColor = isPublished ? "text-emerald-500" : "text-amber-500";
  const statusBg = isPublished ? "bg-emerald-500/10" : "bg-amber-500/10";
  const statusBorder = isPublished
    ? "border-emerald-500/20"
    : "border-amber-500/20";
  const statusText = isPublished ? "Public" : "Private";
  const statusTooltip = isPublished
    ? "Visible to recruiters. Contact details masked until you approve access."
    : "Only visible to you. Recruiters cannot discover this resume.";

  if (resumeLoading) {
    return (
      <div className="glass-panel overflow-hidden rounded-3xl p-8 animate-pulse">
        <div className="h-8 w-1/3 bg-slate-700/50 rounded mb-4"></div>
        <div className="h-4 w-1/2 bg-slate-700/30 rounded"></div>
      </div>
    );
  }

  if (!hasResume) {
    return (
      <div className="glass-panel relative overflow-hidden rounded-3xl p-8">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl"></div>

        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-[#1A2F25] mb-2">
            Create Your Resume
          </h2>
          <p className="text-[#1A2F25] mb-6 max-w-lg font-medium">
            Build a professional resume in minutes. Our AI-powered tools help
            you highlight your strengths and get noticed by recruiters.
          </p>

          <Link
            href="/create-resume"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 hover:scale-[1.02]"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Start Building
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel relative rounded-3xl p-0 overflow-visible">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 opacity-50 rounded-3xl"></div>

      <div className="relative z-10 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Tooltip content={statusTooltip}>
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusBg} ${statusColor} ${statusBorder} cursor-help`}
                >
                  <span
                    className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                      isPublished ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  ></span>
                  {statusText}
                </div>
              </Tooltip>

              {onToggleVisibility && (
                <div className="flex items-center">
                  <button
                    onClick={onToggleVisibility}
                    disabled={isUpdatingVisibility}
                    className={`
                                            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
                                            ${
                                              isPublished
                                                ? "bg-emerald-500"
                                                : "bg-gray-200"
                                            }
                                            ${
                                              isUpdatingVisibility
                                                ? "opacity-50 cursor-wait"
                                                : ""
                                            }
                                        `}
                    role="switch"
                    aria-checked={isPublished}
                  >
                    <span className="sr-only">Toggle visibility</span>
                    <span
                      aria-hidden="true"
                      className={`
                                                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                                                ${
                                                  isPublished
                                                    ? "translate-x-5"
                                                    : "translate-x-0"
                                                }
                                            `}
                    />
                  </button>
                </div>
              )}
            </div>

            <h2 className="text-2xl font-bold text-[#1A2F25]">My Resume</h2>
            {lastUpdated && (
              <p className="text-sm text-[#1A2F25]/60 mt-1">
                Last updated{" "}
                {formatDistanceToNow(new Date(lastUpdated), {
                  addSuffix: true,
                })}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            {isBasicUser ? (
              <Tooltip content="AI Edit feature is available for Premium or Enterprise users">
                <button
                  disabled
                  className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-400 cursor-not-allowed border border-slate-200"
                >
                  <svg
                    className="mr-2 h-4 w-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </button>
              </Tooltip>
            ) : (
              <Link
                href={`/resumes/${resumeIdString}/edit`}
                className="inline-flex items-center justify-center rounded-xl bg-white/50 px-4 py-2.5 text-sm font-medium text-[#1A2F25] backdrop-blur-sm transition-all hover:bg-white/80 border border-white/20 shadow-sm"
              >
                <svg
                  className="mr-2 h-4 w-4 text-[#1A2F25]/60"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </Link>
            )}
            <Link
              href={`/resumes/${resumeIdString}`}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30 hover:scale-[1.02]"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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
              View
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-8 pt-6 border-t border-[#1A2F25]/10">
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/40 border border-white/60">
            <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-[#1A2F25] font-medium mb-1">
                Boost Visibility
              </h3>
              <p className="text-sm text-[#1A2F25]/60">
                Optimize keywords to appear in more recruiter searches.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
