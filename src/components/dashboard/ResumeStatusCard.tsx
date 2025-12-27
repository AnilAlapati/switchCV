"use client";

import { logger } from "@/lib/logger";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { reloadPage } from "@/lib/utils/navigation";
import { DeleteResumeDialog } from "./DeleteResumeDialog";
import { useTier } from "@/hooks/useTier";
import { getStatusDetails } from "./useResumeStatus";
import { ResumeActionButtons } from "./ResumeActionButtons";

interface ResumeStatusCardProps {
  hasResume: boolean;
  resumeId?: string | number | null;
  resumeLoading: boolean;
  isPublished?: boolean;
  onRefresh?: () => void;
}

export function ResumeStatusCard({
  hasResume,
  resumeId,
  resumeLoading,
  isPublished = false,
  onRefresh,
}: ResumeStatusCardProps) {
  const { user } = useAuth();
  const { isBasic } = useTier();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  const status = getStatusDetails(resumeLoading, hasResume, isPublished);

  const handleToggleVisibility = async () => {
    if (!user || !resumeId) return;
    setIsUpdatingVisibility(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublic: !isPublished }),
      });

      if (!response.ok) {
        throw new Error("Failed to update visibility");
      }

      if (onRefresh) {
        onRefresh();
      } else {
        reloadPage();
      }
    } catch (error) {
      logger.error({ err: error }, "Error updating visibility:");
      alert("Failed to update visibility settings.");
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!user) {
      alert("You must be logged in to delete your resume.");
      return;
    }

    if (!resumeId) {
      alert("Resume ID not found. Please refresh the page and try again.");
      return;
    }

    setIsDeleting(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/resume/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resumeId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete resume");
      }

      logger.info(`🗑️ Resume deleted: ${resumeId}`);

      // Reload the page to reflect the changes
      reloadPage();
    } catch (error) {
      logger.error({ err: error }, "Error deleting resume:");
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert(`Error deleting resume: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="glass-panel rounded-3xl p-6 transition hover:shadow-lg hover:shadow-[#2C4A3B]/10 hover:border-white">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#2C4A3B]/20 bg-[#2C4A3B]/5 text-[#2C4A3B]">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-bold text-[#2C4A3B]/60 truncate mb-1">
                Resume Status
              </dt>
              <dd className="flex items-center">
                <div
                  className={`group relative flex items-center gap-2.5 px-3 py-1.5 rounded-full border ${status.borderColor} ${status.bgColor} transition-all duration-300 hover:bg-opacity-80 cursor-help`}
                >
                  <span className="relative flex h-2.5 w-2.5">
                    {isPublished && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status.dotColor}`}
                    ></span>
                  </span>
                  <span className={`text-sm font-bold ${status.textColor}`}>
                    {status.label}
                  </span>

                  {/* Tooltip */}
                  {/* Tooltip */}
                  <div className="absolute left-0 top-full mt-2 hidden group-hover:block w-56 rounded-xl border border-white/60 bg-white/80 backdrop-blur-xl p-3 text-xs text-[#2C4A3B]/80 shadow-xl z-20">
                    <p className="font-bold text-slate-900 mb-0.5">
                      {status.label}
                    </p>
                    <p className="text-slate-500 leading-relaxed">
                      {status.desc}
                    </p>
                    <div className="absolute -top-1.5 left-6 h-3 w-3 -rotate-45 border-t border-r border-slate-200 bg-white"></div>
                  </div>
                </div>
              </dd>
            </dl>
          </div>
        </div>
        <div className="mt-4">
          {hasResume ? (
            <ResumeActionButtons
              resumeId={resumeId || null}
              isPublished={isPublished}
              isUpdatingVisibility={isUpdatingVisibility}
              onToggleVisibility={handleToggleVisibility}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          ) : (
            <Link
              href="/create-resume"
              className="inline-flex items-center px-4 py-2 glass-button font-bold rounded-xl"
            >
              Create Resume
              <svg
                className="ml-2 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog - Standardized across dashboard */}
      <DeleteResumeDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteResume}
        isDeleting={isDeleting}
        isBasicUser={isBasic}
      />
    </>
  );
}
