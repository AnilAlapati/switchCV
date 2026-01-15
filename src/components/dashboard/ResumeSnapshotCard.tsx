"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { RestrictedFeature } from "@/components/ui/RestrictedFeature";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Edit3, Eye, Trash2, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { JobSeekerMetrics } from "@/types/dashboard";
import { DeleteResumeDialog } from "./DeleteResumeDialog";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DashboardResume } from "@/types";

interface ResumeSnapshotCardProps {
  hasResume: boolean;
  resumeId: string | number | null;
  resumeLoading: boolean;
  isPublished: boolean;
  resumeData?: DashboardResume;
  metrics?: JobSeekerMetrics | null;
  onToggleVisibility?: () => void;
  isUpdatingVisibility?: boolean;
}

export function ResumeSnapshotCard({
  hasResume,
  resumeId,
  resumeLoading,
  isPublished,
  resumeData,
  metrics,
  onToggleVisibility,
  isUpdatingVisibility,
}: ResumeSnapshotCardProps) {
  const { tier } = useUserProfile();
  const isBasicUser = tier === "basic";
  const resumeIdString = resumeId ? String(resumeId) : null;
  const lastUpdated = resumeData?.updatedAt || resumeData?.lastUpdatedAt;
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!resumeIdString) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/resumes/${resumeIdString}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete resume");
      }

      toast.success("Resume deleted successfully");
      setShowDeleteDialog(false);
      router.refresh();
    } catch {
      toast.error("Failed to delete resume");
    } finally {
      setIsDeleting(false);
    }
  };

  if (resumeLoading) {
    return (
      <div className="glass-panel overflow-hidden rounded-3xl p-8 animate-pulse">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-3 w-1/2">
            <div className="h-8 bg-slate-200/20 rounded w-full"></div>
            <div className="h-4 bg-slate-200/10 rounded w-3/4"></div>
          </div>
          <div className="h-10 w-24 bg-slate-200/20 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="h-20 bg-slate-200/10 rounded-2xl"></div>
          <div className="h-20 bg-slate-200/10 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!hasResume) {
    return (
      <div className="group relative overflow-hidden bg-white p-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="relative z-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-lg space-y-3">
            <div className="flex items-center gap-2 text-blue-600">
              <Sparkles className="h-5 w-5" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                AI-Powered Resume
              </span>
            </div>
            <h2 className="text-3xl font-serif font-bold tracking-tight text-black">
              Build Your Spotlight
            </h2>
            <p className="text-base text-gray-600 leading-relaxed">
              Create a professional resume in minutes and get discovered by top
              recruiters.
            </p>
          </div>

          <Link
            href="/create-resume"
            className="group/btn inline-flex items-center justify-center bg-black px-8 py-4 font-bold text-white transition-all hover:scale-105 border-2 border-black"
          >
            <span className="mr-2">Start Building</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </div>
      </div>
    );
  }

  const skills = resumeData?.skills?.slice(0, 5) || [];

  return (
    <div className="glass-panel relative overflow-hidden rounded-3xl border-transparent bg-white/40 shadow-xl transition-all hover:shadow-2xl">
      {/* Visual Accent */}
      <div className="absolute top-0 right-0 h-32 w-32 -mr-8 -mt-8 bg-indigo-500/10 blur-[80px] rounded-full"></div>

      <div className="relative z-10 p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="group relative">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-help ${isPublished
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    }`}
                >
                  <span
                    className={`mr-1.5 h-1.5 w-1.5 rounded-full ${isPublished ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                  ></span>
                  {isPublished ? "Public" : "Private"}
                </span>

                {/* Tooltip */}
                <div className="absolute left-0 top-full mt-2 hidden group-hover:block w-56 rounded-xl border border-white/60 bg-white/80 backdrop-blur-xl p-3 text-xs text-[black]/80 shadow-xl z-30">
                  <p className="font-bold text-[black] mb-0.5">
                    {isPublished ? "Public Resume" : "Private Resume"}
                  </p>
                  <p className="text-black/60 leading-relaxed">
                    {isPublished
                      ? "Your resume is visible to recruiters and can be shared with a public link."
                      : "Your resume is only visible to you. Recruiters cannot find or view it."}
                  </p>
                  {/* Arrow pointing up */}
                  <div className="absolute -top-1.5 left-6 h-3 w-3 -rotate-45 border-t border-r border-white/60 bg-white/80"></div>
                </div>
              </div>

              {lastUpdated && (
                <span className="text-[10px] text-black/40 font-medium">
                  Updated{" "}
                  {formatDistanceToNow(new Date(lastUpdated), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>

            <h2 className="text-3xl font-extrabold text-black mb-2 tracking-tight">
              {resumeData?.title || "My Resume"}
            </h2>
            <p className="text-black/60 line-clamp-2 max-w-xl text-sm leading-relaxed mb-6">
              {resumeData?.summary ||
                "Add a professional summary to help recruiters understand your background."}
            </p>

            <div className="flex flex-wrap gap-2 mb-8">
              {skills.map((skill: string | { name: string }, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-lg bg-white/60 border border-white/80 text-xs font-semibold text-black/70 shadow-sm"
                >
                  {typeof skill === "string" ? skill : skill.name}
                </span>
              ))}
              {resumeData?.skills && resumeData.skills.length > 5 && (
                <span className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 text-xs font-bold">
                  +{resumeData.skills.length - 5}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap lg:flex-col gap-3">
            <div className="flex items-center gap-2 p-1 bg-white/50 rounded-xl border border-white/80 shadow-sm mb-2">
              <span className="text-[10px] font-bold text-black/40 ml-2 mr-1">
                VISIBILITY
              </span>
              <button
                onClick={onToggleVisibility}
                disabled={isUpdatingVisibility}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                  ${isPublished ? "bg-emerald-500" : "bg-slate-300"}
                  ${isUpdatingVisibility ? "opacity-50 cursor-wait" : ""}
                `}
              >
                <span
                  className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out
                  ${isPublished ? "translate-x-5" : "translate-x-0"}
                `}
                />
              </button>
            </div>

            <div className="flex lg:flex-col gap-2">
              <RestrictedFeature
                messageKey="AI_EDIT"
                requiredTier="premium"
                tooltipPosition="left"
              >
                {isBasicUser ? (
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-400 text-sm font-bold border border-slate-200 cursor-not-allowed shadow-none"
                  >
                    <Edit3 className="h-4 w-4 text-slate-300" />
                    Edit
                  </button>
                ) : (
                  <Link
                    href={`/resumes/${resumeIdString}/ai-edit`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[black] text-sm font-bold border border-slate-200 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-95"
                  >
                    <Edit3 className="h-4 w-4 text-indigo-600" />
                    Edit
                  </Link>
                )}
              </RestrictedFeature>
              <Link
                href={`/resumes/${resumeIdString}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:shadow-indigo-600/30 active:scale-95"
              >
                <Eye className="h-4 w-4" />
                View
              </Link>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/resumes/${resumeIdString}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Link copied to clipboard!", {
                    description: "Share your resume with recruiters",
                    duration: 3000,
                  });
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[black] text-sm font-bold border border-slate-200 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-95"
              >
                Share
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-red-600 text-sm font-bold border border-slate-200 shadow-sm transition-all hover:bg-red-50 hover:border-red-200 hover:shadow-md active:scale-95"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <DeleteResumeDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
          isBasicUser={isBasicUser}
        />

        <div className="mt-8 pt-6 border-t border-[black]/5 flex flex-wrap gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[black]/40 uppercase tracking-widest mb-1">
              Impact Factor
            </span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                  style={{ width: `${metrics?.quality || 0}%` }}
                ></div>
              </div>
              <span className="text-sm font-bold text-[black]">
                {metrics?.quality
                  ? metrics.quality > 75
                    ? "High"
                    : metrics.quality > 40
                      ? "Medium"
                      : "Developing"
                  : "Not analyzed"}
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[black]/40 uppercase tracking-widest mb-1">
              Recruiter Searches
            </span>
            <span className="text-sm font-bold text-[black]">
              {metrics?.profileViews ?? 0} this week
            </span>
          </div>
          <div className="flex flex-col ml-auto">
            <Link
              href={`/analytics/${resumeIdString}`}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              View Analytics →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
