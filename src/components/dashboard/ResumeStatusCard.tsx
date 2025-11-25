"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { reloadPage } from "@/lib/utils/navigation";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
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
      console.error("Error updating visibility:", error);
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

      console.log(`🗑️ Resume deleted: ${resumeId}`);

      // Reload the page to reflect the changes
      reloadPage();
    } catch (error) {
      console.error("Error deleting resume:", error);
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
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40 transition hover:border-cyan-500/40">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-cyan-300">
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
              <dt className="text-sm font-medium text-slate-400 truncate mb-2">
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
                  <div className="absolute left-0 bottom-full mb-2 hidden w-56 rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-xs text-slate-300 shadow-xl backdrop-blur-sm group-hover:block z-20">
                    <p className="font-medium text-white mb-0.5">
                      {status.label}
                    </p>
                    <p className="text-slate-400 leading-relaxed">
                      {status.desc}
                    </p>
                    <div className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 border-b border-r border-slate-700 bg-slate-900/95"></div>
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
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25"
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

      {/* Delete Confirmation Dialog - Positioned in Middle of Page */}
      <DeleteConfirmationDialog
        isOpen={showDeleteConfirm}
        isDeleting={isDeleting}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteResume}
      />
    </>
  );
}
