"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ActionPlanCard } from "@/components/dashboard/ActionPlanCard";
import { OpportunityInsightsCard } from "@/components/dashboard/OpportunityInsightsCard";
import { ResourceLinksCard } from "@/components/dashboard/ResourceLinksCard";
import { RecruiterSearchBox } from "@/components/dashboard/RecruiterSearchBox";
import { CandidatesSearchedCard } from "@/components/dashboard/recruiter/CandidatesSearchedCard";
import { RecruiterProfileViewsCard } from "@/components/dashboard/recruiter/RecruiterProfileViewsCard";
import { AccessRequestsCard } from "@/components/dashboard/recruiter/AccessRequestsCard";
import { CandidatesInteractedCard } from "@/components/dashboard/recruiter/CandidatesInteractedCard";
import {
  buildRecruiterActionPlan,
  buildRecruiterInsights,
  calculatePipelineScore,
  formatLastActivity,
  pipelineLabel,
} from "@/lib/dashboard/recruiterInsights";
import type { RecruiterMetrics } from "@/types/dashboard";

interface RecruiterDashboardProps {
  metrics: RecruiterMetrics | null;
  metricsLoading: boolean;
  onLaunchSearch?: () => void;
  searchSectionRef?: React.RefObject<HTMLDivElement>;
}

export function RecruiterDashboard({
  metrics,
  metricsLoading,
  onLaunchSearch,
  searchSectionRef,
}: RecruiterDashboardProps) {
  const pipelineScore = useMemo(
    () => calculatePipelineScore(metrics),
    [metrics]
  );

  const heroMeta = useMemo(
    () => ({
      label: pipelineLabel(pipelineScore),
      lastActivity: formatLastActivity(metrics?.lastActivityAt ?? null),
    }),
    [pipelineScore, metrics?.lastActivityAt]
  );

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

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/50 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
              Pipeline health
            </span>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Build a responsive talent pipeline
              </h2>
              <p className="text-sm text-slate-200 sm:text-base">
                Prioritise follow-ups, keep approvals moving, and surface new
                talent each week.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleLaunchSearch}
                className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Launch search
              </button>
              <Link
                href="/recruiter/search"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-500/40"
              >
                View saved filters
              </Link>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
            <div className="flex items-baseline justify-between text-xs text-slate-400">
              <span>Pipeline score</span>
              <span>{heroMeta.lastActivity}</span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className="text-4xl font-bold text-white">
                {pipelineScore}
              </div>
              <div className="flex-1">
                <div className="h-2 w-full rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-cyan-500 transition-all duration-500"
                    style={{ width: `${Math.max(pipelineScore, 4)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                  {heroMeta.label}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs text-slate-300">
              <div>
                <span className="block text-lg font-semibold text-white">
                  {metrics?.totalSearches ?? 0}
                </span>
                Searches
              </div>
              <div>
                <span className="block text-lg font-semibold text-white">
                  {metrics?.totalProfileViews ?? 0}
                </span>
                Profiles viewed
              </div>
              <div>
                <span className="block text-lg font-semibold text-white">
                  {metrics?.totalCandidatesInteracted ?? 0}
                </span>
                Contacted
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <CandidatesSearchedCard />
            <RecruiterProfileViewsCard />
            <AccessRequestsCard />
            <CandidatesInteractedCard />
          </div>

          <div ref={searchSectionRef}>
            <RecruiterSearchBox />
          </div>
        </div>

        <div className="space-y-6">
          <ActionPlanCard
            headline="Keep the pipeline warm"
            items={actionItems}
            loading={metricsLoading}
          />
          <ResourceLinksCard
            title="Speed up hiring"
            caption="Use these tools to keep stakeholders aligned."
            links={resources}
          />
        </div>
      </div>

      <OpportunityInsightsCard
        title="Signals from your pipeline"
        insights={insights}
      />
    </div>
  );
}
