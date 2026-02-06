"use client";

import { useMemo, useState } from "react";
import { ResumeSnapshotCard } from "@/components/dashboard/ResumeSnapshotCard";
import { AgentStatus } from "@/components/dashboard/AgentStatus";
import { MarketPulseCard } from "@/components/dashboard/MarketPulseCard";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { PriorityActionsCard } from "@/components/dashboard/PriorityActionsCard";
import { OpportunityInsightsCard } from "@/components/dashboard/OpportunityInsightsCard";
import { ResourceLinksCard } from "@/components/dashboard/ResourceLinksCard";
import { ResumeList } from "@/components/dashboard/ResumeList";
import { JobSeekerDashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { PremiumFeatureLock } from "@/components/ui/PremiumFeatureLock";
import { TIER_RESTRICTION_MESSAGES } from "@/lib/utils/tier-restrictions";
import {
  buildJobSeekerActionPlan,
  buildJobSeekerInsights,
} from "@/lib/dashboard/jobSeekerInsights";
import { getResumeUrl, ENABLE_SEEDING_AND_DEBUG_LISTS } from "@/lib/config";
import type { JobSeekerMetrics } from "@/types/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type { DashboardResume } from "@/types";

interface JobSeekerDashboardProps {
  hasResume: boolean;
  resumeId: string | number | null;
  resumeLoading: boolean;
  metrics: JobSeekerMetrics | null;
  metricsLoading: boolean;
  resume?: DashboardResume;
  resumes?: DashboardResume[];
  onRefreshResume?: () => void;
}

function ProTips() {
  return (
    <div className="glass-panel rounded-3xl p-8 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 border-indigo-500/10 h-full">
      <h3 className="text-xl font-bold text-black mb-6">Agent Insights</h3>
      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
            1
          </div>
          <p className="text-sm text-black/70 leading-relaxed">
            Profiles with a professional photo get{" "}
            <span className="font-bold text-black">14x more views</span>.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="h-6 w-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
            2
          </div>
          <p className="text-sm text-black/70 leading-relaxed">
            Quantifying your impact increases recruiter engagement by{" "}
            <span className="font-bold text-black">40%</span>.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="h-6 w-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
            3
          </div>
          <p className="text-sm text-black/70 leading-relaxed">
            Weekly updates keep you at the{" "}
            <span className="font-bold text-[#1A1F25]">
              top of search results
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );
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

  const isPublished = useMemo(() => {
    if (!resume) return false;
    if (typeof resume.isPublic === "boolean") return resume.isPublic;
    if (resume.visibility === "public") return true;
    return !!(resume.publishedAt && !resume.isBeingEdited);
  }, [resume]);

  const [optimisticStatus, setOptimisticStatus] = useState<boolean | null>(
    null,
  );
  const currentStatus = optimisticStatus ?? isPublished;

  const handleToggleVisibility = async () => {
    if (!user || !resumeIdString) return;

    const previousStatus = currentStatus;
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
    } catch (error) {
      logger.error({ err: error }, "Error updating visibility:");
      toast.error("Failed to update visibility settings.");
      setOptimisticStatus(previousStatus);
    } finally {
      setIsUpdatingVisibility(false);
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
    [metrics, hasResume, resumeIdString, resumeUrl, tier, resume, profile],
  );

  const opportunityInsights = useMemo(
    () => buildJobSeekerInsights(metrics),
    [metrics],
  );

  const careerResources = useMemo(
    () => [
      {
        id: "interview-prep",
        title: "Interview Prep Guide",
        description: "Master the STAR method and common behavioral questions.",
        href: "/create-resume",
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
    [],
  );

  // Show skeleton while initial data is loading
  if (metricsLoading && !metrics) {
    return <JobSeekerDashboardSkeleton />;
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Top Section: Spotlight & Actions */}
      <div className="grid gap-8 lg:grid-cols-[2fr,1fr] xl:grid-cols-[3fr,1fr]">
        <div className="space-y-8">
          <ResumeSnapshotCard
            hasResume={hasResume}
            resumeId={resumeId}
            resumeLoading={resumeLoading || metricsLoading}
            isPublished={currentStatus}
            resumeData={resume}
            metrics={metrics}
            onToggleVisibility={handleToggleVisibility}
            isUpdatingVisibility={isUpdatingVisibility}
          />

          {/* Only show Market Reach for Premium and Enterprise users */}
          {(tier === "premium" || tier === "enterprise") && (
            <div className="md:col-span-2">
              <OpportunityInsightsCard
                title="Global Market Reach"
                subtitle="How your profile is performing"
                insights={opportunityInsights}
              />
            </div>
          )}
        </div>

        <div className="space-y-8">
          <AgentStatus />
          <PriorityActionsCard
            headline="Career Co-pilot"
            items={actionItems}
            loading={metricsLoading}
            emptyMessage="You're crushing it! No urgent actions."
          />
        </div>
      </div>

      {/* Middle Section: Market & Community */}
      <div className="grid gap-8 lg:grid-cols-[1fr,2fr]">
        <MarketPulseCard />

        <div className="grid gap-8 md:grid-cols-2">
          <ResourceLinksCard
            title="Professional Toolkit"
            caption="Resources to help you level up"
            links={careerResources}
            lockForBasic={true}
          />

          <div className="h-full">
            <PremiumFeatureLock
              featureName="AI Insights"
              description={TIER_RESTRICTION_MESSAGES.PRIORITY_ACTIONS}
              className="h-full"
            >
              <ProTips />
            </PremiumFeatureLock>
          </div>
        </div>
      </div>

      {/* Activity Timeline Section */}
      <div className="grid gap-8">
        <ActivityTimeline />
      </div>

      {ENABLE_SEEDING_AND_DEBUG_LISTS && resumes && resumes.length > 1 && (
        <div className="mt-12">
          <h3 className="text-sm font-bold text-[black]/40 uppercase tracking-widest mb-4 px-2">
            Manage All Resumes
          </h3>
          <ResumeList resumes={resumes} />
        </div>
      )}
    </div>
  );
}
