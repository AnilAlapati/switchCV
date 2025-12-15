"use client";

import { useMemo, useState } from "react";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { ResumeActionCenter } from "@/components/dashboard/ResumeActionCenter";
import { ProfileViewsCard } from "@/components/dashboard/ProfileViewsCard";
import { ContactRequestsCard } from "@/components/dashboard/ContactRequestsCard";

import { PriorityActionsCard } from "@/components/dashboard/PriorityActionsCard";
import { OpportunityInsightsCard } from "@/components/dashboard/OpportunityInsightsCard";
import { ResumeList } from "@/components/dashboard/ResumeList";
import {
  buildJobSeekerActionPlan,
  buildJobSeekerInsights,
} from "@/lib/dashboard/jobSeekerInsights";
import { getResumeUrl, ENABLE_SEEDING_AND_DEBUG_LISTS } from "@/lib/config";
import type { JobSeekerMetrics } from "@/types/dashboard";
import { useAuth } from "@/hooks/useAuth";
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
      }),
    [metrics, hasResume, resumeIdString, resumeUrl]
  );

  const opportunityInsights = useMemo(
    () => buildJobSeekerInsights(metrics),
    [metrics]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <DashboardHero>
        <ProfileViewsCard />
        <ContactRequestsCard />
      </DashboardHero>

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

          <OpportunityInsightsCard
            title="Insights & Signals"
            subtitle="Based on your recent activity"
            insights={opportunityInsights}
          />
        </div>

        <div className="space-y-6 h-full">
          <PriorityActionsCard
            headline="Priority Actions"
            items={actionItems}
            loading={metricsLoading}
            emptyMessage="You're all set! No urgent actions right now."
          />
        </div>
      </div>
    </div>
  );
}
