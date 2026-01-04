"use client";

import { useMemo } from "react";
import { ActionPlanCard } from "@/components/dashboard/ActionPlanCard";
import { OpportunityInsightsCard } from "@/components/dashboard/OpportunityInsightsCard";
import { ResourceLinksCard } from "@/components/dashboard/ResourceLinksCard";
import { RecruiterSearchBox } from "@/components/dashboard/RecruiterSearchBox";
import { CandidatesSearchedCard } from "@/components/dashboard/recruiter/CandidatesSearchedCard";
import { AvailableResumesCard } from "@/components/dashboard/recruiter/AvailableResumesCard";
import { AccessRequestsCard } from "@/components/dashboard/recruiter/AccessRequestsCard";
import { CandidatesInteractedCard } from "@/components/dashboard/recruiter/CandidatesInteractedCard";
import { ResumeList } from "@/components/dashboard/ResumeList";
import { RecruiterDashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { ENABLE_SEEDING_AND_DEBUG_LISTS } from "@/lib/config";
import {
  buildRecruiterActionPlan,
  buildRecruiterInsights,
  calculatePipelineScore,
  formatLastActivity,
  pipelineLabel,
} from "@/lib/dashboard/recruiterInsights";
import { PremiumFeatureLock } from "@/components/ui/PremiumFeatureLock";
import { TIER_RESTRICTION_MESSAGES } from "@/lib/utils/tier-restrictions";
import type { RecruiterMetrics } from "@/types/dashboard";

const pipelinePanelEnabled =
  process.env.NEXT_PUBLIC_FEATURE_PIPELINE_PANEL === "true";

interface RecruiterDashboardProps {
  metrics: RecruiterMetrics | null;
  metricsLoading: boolean;
  onLaunchSearch?: () => void;
  searchSectionRef?: React.RefObject<HTMLDivElement | null>;
  resumes?: any[];
}

export function RecruiterDashboard({
  metrics,
  metricsLoading,
  onLaunchSearch,
  searchSectionRef,
  resumes,
}: RecruiterDashboardProps) {
  const pipelinePanelData = useMemo(() => {
    if (!pipelinePanelEnabled) {
      return null;
    }

    const score = calculatePipelineScore(metrics);
    return {
      score,
      label: pipelineLabel(score),
      lastActivity: formatLastActivity(metrics?.lastActivityAt ?? null),
      totalSearches: metrics?.totalSearches ?? 0,
      totalProfileViews: metrics?.totalProfileViews ?? 0,
      totalCandidatesInteracted: metrics?.totalCandidatesInteracted ?? 0,
    };
  }, [metrics]);

  const actionItems = useMemo(
    () => buildRecruiterActionPlan({ metrics, onLaunchSearch }),
    [metrics, onLaunchSearch]
  );

  const insights = useMemo(() => buildRecruiterInsights(metrics), [metrics]);

  const resources = useMemo(() => {
    return [
      {
        id: "search",
        title: "Run an advanced talent search",
        description:
          "Filter by role, skills, and location to uncover candidates aligned to your open reqs.",
        href: "/recruiter/search",
      },
      {
        id: "notes",
        title: "Log candidate notes",
        description:
          "Capture context on each conversation so you can re-engage when timing is right.",
        href: "/recruiter/search",
      },
      {
        id: "share-feedback",
        title: "Share feedback with hiring managers",
        description:
          "Summarise the strongest profiles you find and send them straight from SwitchCV.",
        href: "/recruiter/search",
      },
    ];
  }, []);

  const handleLaunchSearch = () => {
    if (onLaunchSearch) {
      onLaunchSearch();
    }
  };

  // Show skeleton while initial data is loading
  if (metricsLoading && !metrics) {
    return <RecruiterDashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {pipelinePanelData && (
        <PremiumFeatureLock
          featureName="Pipeline Health"
          description={TIER_RESTRICTION_MESSAGES.ENTERPRISE_FEATURE}
          disabledOpacity={40}
        >
          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/50 lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex-1 space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                  Pipeline Integrity
                </span>
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-white sm:text-3xl">
                    Build a responsive talent pipeline
                  </h2>
                  <p className="text-sm text-slate-200 sm:text-base">
                    Prioritise follow-ups, keep approvals moving, and surface
                    new talent each week.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleLaunchSearch}
                    className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    Start Discovery
                  </button>
                </div>
              </div>

              <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                <div className="flex items-baseline justify-between text-xs text-slate-400">
                  <span>Pipeline score</span>
                  <span>{pipelinePanelData.lastActivity}</span>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <div className="text-4xl font-bold text-white">
                    {pipelinePanelData.score}
                  </div>
                  <div className="flex-1">
                    <div className="h-2 w-full rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-cyan-500 transition-all duration-500"
                        style={{
                          width: `${Math.max(pipelinePanelData.score, 4)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                      {pipelinePanelData.label}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs text-slate-300">
                  <div>
                    <span className="block text-lg font-semibold text-white">
                      {pipelinePanelData.totalSearches}
                    </span>
                    Searches
                  </div>
                  <div>
                    <span className="block text-lg font-semibold text-white">
                      {pipelinePanelData.totalProfileViews}
                    </span>
                    Profiles viewed
                  </div>
                  <div>
                    <span className="block text-lg font-semibold text-white">
                      {pipelinePanelData.totalCandidatesInteracted}
                    </span>
                    Contacted
                  </div>
                </div>
              </div>
            </div>
          </section>
        </PremiumFeatureLock>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          {ENABLE_SEEDING_AND_DEBUG_LISTS && resumes && resumes.length > 0 && (
            <div className="mb-8">
              <ResumeList resumes={resumes} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <CandidatesSearchedCard />
            <AvailableResumesCard />
            <AccessRequestsCard />
            <CandidatesInteractedCard />
          </div>

          <div ref={searchSectionRef}>
            <RecruiterSearchBox />
          </div>
        </div>

        <div className="space-y-6">
          <PremiumFeatureLock
            featureName="Keep the pipeline warm"
            description={TIER_RESTRICTION_MESSAGES.PRIORITY_ACTIONS}
          >
            <ActionPlanCard
              headline="Keep the pipeline warm"
              items={actionItems}
              loading={metricsLoading}
            />
          </PremiumFeatureLock>
          <PremiumFeatureLock
            featureName="Speed up hiring"
            description={TIER_RESTRICTION_MESSAGES.PREMIUM_FEATURE}
          >
            <ResourceLinksCard
              title="Speed up hiring"
              caption="Use these tools to keep stakeholders aligned."
              links={resources}
            />
          </PremiumFeatureLock>
        </div>
      </div>

      <PremiumFeatureLock
        featureName="Agentic Pipeline Signals"
        description={TIER_RESTRICTION_MESSAGES.ANALYTICS_DASHBOARD}
      >
        <OpportunityInsightsCard
          title="Agentic Pipeline Signals"
          insights={insights}
        />
      </PremiumFeatureLock>
    </div>
  );
}
