"use client";

import { useMemo, useState } from "react";
import { ResumeActionCenter } from "@/components/dashboard/ResumeActionCenter";

import { PriorityActionsCard } from "@/components/dashboard/PriorityActionsCard";
import { OpportunityInsightsCard } from "@/components/dashboard/OpportunityInsightsCard";
import { ResourceLinksCard } from "@/components/dashboard/ResourceLinksCard";
import { ResumeList } from "@/components/dashboard/ResumeList";
import {
  buildJobSeekerActionPlan,
  buildJobSeekerInsights,
  calculateReadinessScore,
  readinessLabel,
} from "@/lib/dashboard/jobSeekerInsights";
import { getResumeUrl, ENABLE_SEEDING_AND_DEBUG_LISTS } from "@/lib/config";
import type { JobSeekerMetrics } from "@/types/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { logger } from "@/lib/logger";

interface JobSeekerDashboardProps {
  hasResume: boolean;
  resumeId: string | number | null;
  resumeLoading: boolean;
  metrics: JobSeekerMetrics | null;
  metricsLoading: boolean;
  resume?: any;
  resumes?: any[];
  onRefreshResume?: () => void;
}

export function JobSeekerDashboard({
  hasResume,
  resumeId,
  resumeLoading,
  metrics,
  metricsLoading,
  resume,
  resumes,
  onRefreshResume,
}: JobSeekerDashboardProps) {
  const { user } = useAuth();
  const { tier, profile } = useUserProfile();
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  const resumeIdString = resumeId ? String(resumeId) : null;
  const resumeUrl =
    hasResume && resumeIdString ? getResumeUrl(resumeIdString) : null;

  // Use property 'isPublic' if available (from new API), fallback to 'publishedAt' logic
  // Also check 'visibility' string for 'public'
  const isPublished = useMemo(() => {
    if (!resume) return false;
    // If 'isPublic' is explicitly defined (boolean), use it.
    if (typeof resume.isPublic === "boolean") return resume.isPublic;
    // If 'visibility' is 'public', use it.
    if (resume.visibility === "public") return true;
    // Fallback: check publishedAt and not being edited
    return !!(resume.publishedAt && !resume.isBeingEdited);
  }, [resume]);

  // Optimistic UI state
  const [optimisticStatus, setOptimisticStatus] = useState<boolean | null>(
    null
  );
  const currentStatus = optimisticStatus ?? isPublished;

  const handleToggleVisibility = async () => {
    if (!user || !resumeIdString) return;

    // Store previous status for rollback
    const previousStatus = currentStatus;
    // Optimistic update
    setOptimisticStatus(!previousStatus);
    setIsUpdatingVisibility(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/resumes/${resumeIdString}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublic: !previousStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update visibility");
      }

      if (onRefreshResume) {
        onRefreshResume();
      }

      // Clear optimistic state after successful refresh (or let it stay until prop updates)
      // Usually, we want to clear it once the prop updates, but relies on effect.
      // Safest is to keep it null once parent refreshes, but setting it to null immediately might flicker if refresh is slow.
      // Better: keep it null, rely on onRefreshResume to trigger re-render with new prop.
      // But props change might be slower. The persisted optimistic state is fine until next full mount or we can sync it.
      // Simplest: just leave it, but we need to reset it if `isPublished` prop changes externally?
      // Let's reset it to null after a short delay or assume refresh handles it.
      // Actually, if we just set it to null here, we might flash back to old value if refresh hasn't finished.
      // Ideally, we wait for props to change.
      // For now, let's keep the optimistic value until the component unmounts or we verify strict sync.
      // Or simply: don't clear it. The displayed value matches the server state anyway now.
    } catch (error) {
      logger.error({ err: error }, "Error updating visibility:");
      alert("Failed to update visibility settings.");
      // Revert on error
      setOptimisticStatus(previousStatus);
    } finally {
      setIsUpdatingVisibility(false);
      // Optional: Clear optimistic status after a delay to ensure props have caught up
      setTimeout(() => setOptimisticStatus(null), 2000);
    }
  };

  const actionItems = useMemo(
    () =>
      buildJobSeekerActionPlan({
        metrics,
        hasResume,
        resumeId: resumeIdString,
        resumeUrl,
        tier,
        resumeData: resume,
        userProfile: profile,
      }),
    [metrics, hasResume, resumeIdString, resumeUrl, tier, resume, profile]
  );

  const opportunityInsights = useMemo(
    () => buildJobSeekerInsights(metrics),
    [metrics]
  );

  const readinessScore = useMemo(
    () => calculateReadinessScore(metrics, hasResume),
    [metrics, hasResume]
  );

  const readinessText = useMemo(
    () => readinessLabel(readinessScore),
    [readinessScore]
  );

  const careerResources = useMemo(
    () => [
      {
        id: "interview-prep",
        title: "Interview Prep Guide",
        description: "Master the STAR method and common behavioral questions.",
        href: "/create-resume", // Fallback
      },
      {
        id: "market-trends",
        title: "Market Trends 2025",
        description: "See which skills are trending in your target industry.",
        href: "/profile",
      },
      {
        id: "referral-network",
        title: "Referral Network",
        description:
          "Connect with peers at top companies for internal referrals.",
        href: "/dashboard",
      },
    ],
    []
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero Section: Performance & Insights */}
      <div
        className={
          tier === "basic" ? "w-full" : "grid gap-6 lg:grid-cols-[1fr,3fr]"
        }
      >
        {tier !== "basic" && (
          <div className="glass-panel rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/10">
            <div className="relative mb-4">
              <svg className="h-24 w-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-200/20"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * readinessScore) / 100}
                  className="text-indigo-500 transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-[#1A2F25]">
                  {readinessScore}%
                </span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-[#1A2F25] mb-1">
              {readinessText}
            </h3>
            <p className="text-xs text-[#1A2F25]/60 uppercase tracking-wider font-semibold">
              Readiness Score
            </p>
          </div>
        )}

        <OpportunityInsightsCard
          title="Performance Overview"
          subtitle="Real-time signals from recruiters and the market"
          insights={opportunityInsights}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr] xl:grid-cols-[3fr,2fr]">
        <div className="space-y-6">
          {ENABLE_SEEDING_AND_DEBUG_LISTS && resumes && resumes.length > 1 && (
            <ResumeList resumes={resumes} />
          )}

          <ResumeActionCenter
            hasResume={hasResume}
            resumeId={resumeId}
            resumeLoading={resumeLoading}
            isPublished={currentStatus}
            lastUpdated={resume?.updatedAt || resume?.lastUpdatedAt}
            onToggleVisibility={handleToggleVisibility}
            isUpdatingVisibility={isUpdatingVisibility}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <ResourceLinksCard
              title="Career Growth"
              caption="Resources to help you level up"
              links={careerResources}
            />
            <div className="glass-panel rounded-3xl p-6 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border-cyan-500/10">
              <h3 className="text-lg font-bold text-[#1A2F25] mb-4">
                Quick Tips
              </h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="h-5 w-5 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold">1</span>
                  </div>
                  <p className="text-sm text-[#1A2F25]/70">
                    Profiles with a professional photo get{" "}
                    <span className="font-bold text-[#1A2F25]">
                      14x more views
                    </span>
                    .
                  </p>
                </li>
                <li className="flex gap-3">
                  <div className="h-5 w-5 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold">2</span>
                  </div>
                  <p className="text-sm text-[#1A2F25]/70">
                    Quantifying your impact with numbers increases recruiter
                    engagement by{" "}
                    <span className="font-bold text-[#1A2F25]">40%</span>.
                  </p>
                </li>
                <li className="flex gap-3">
                  <div className="h-5 w-5 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold">3</span>
                  </div>
                  <p className="text-sm text-[#1A2F25]/70">
                    Updating your resume every 2 weeks keeps you at the top of
                    search results.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-6 h-full">
          {tier !== "basic" ? (
            <PriorityActionsCard
              headline="Priority Actions"
              items={actionItems}
              loading={metricsLoading}
              emptyMessage="You're all set! No urgent actions right now."
            />
          ) : (
            <div className="glass-panel rounded-3xl p-8 bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/10 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#1A2F25] mb-2">
                Priority Actions
              </h3>
              <p className="text-sm text-[#1A2F25]/60 mb-6">
                Upgrade to Premium to unlock personalized priority actions and
                accelerate your job search.
              </p>
              <button
                onClick={() => (window.location.href = "/pricing")}
                className="px-6 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors shadow-lg shadow-amber-600/20"
              >
                View Plans
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
