"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ResumeStatusCard } from "@/components/dashboard/ResumeStatusCard";
import { ProfileViewsCard } from "@/components/dashboard/ProfileViewsCard";
import { ContactRequestsCard } from "@/components/dashboard/ContactRequestsCard";
import { ResumeQualityCard } from "@/components/dashboard/ResumeQualityCard";
import { LastUpdatedCard } from "@/components/dashboard/LastUpdatedCard";
import { DownloadsCard } from "@/components/dashboard/DownloadsCard";
import { ActionPlanCard } from "@/components/dashboard/ActionPlanCard";
import { OpportunityInsightsCard } from "@/components/dashboard/OpportunityInsightsCard";
import { ResourceLinksCard } from "@/components/dashboard/ResourceLinksCard";
import {
  buildJobSeekerActionPlan,
  buildJobSeekerInsights,
  calculateReadinessScore,
  formatLastUpdatedMessage,
  readinessLabel,
} from "@/lib/dashboard/jobSeekerInsights";
import { getResumeUrl } from "@/lib/config";
import type { JobSeekerMetrics } from "@/types/dashboard";

interface JobSeekerDashboardProps {
  hasResume: boolean;
  resumeId: string | number | null;
  resumeLoading: boolean;
  metrics: JobSeekerMetrics | null;
  metricsLoading: boolean;
  resume?: any;
  onRefreshResume?: () => void;
}

export function JobSeekerDashboard({
  hasResume,
  resumeId,
  resumeLoading,
  metrics,
  metricsLoading,
  resume,
  onRefreshResume,
}: JobSeekerDashboardProps) {
  const resumeIdString = resumeId ? String(resumeId) : null;
  const resumeUrl =
    hasResume && resumeIdString ? getResumeUrl(resumeIdString) : null;

  const readinessScore = useMemo(
    () => calculateReadinessScore(metrics, hasResume),
    [metrics, hasResume]
  );

  const heroInsights = useMemo(
    () => ({
      lastUpdatedLabel: formatLastUpdatedMessage(metrics?.lastUpdated ?? null),
      label: readinessLabel(readinessScore),
    }),
    [metrics?.lastUpdated, readinessScore]
  );

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

  const resources = useMemo(() => {
    const list = [] as Array<{
      id: string;
      title: string;
      description: string;
      href: string;
      external?: boolean;
    }>;

    if (hasResume && resumeIdString) {
      list.push({
        id: "edit-resume",
        title: "Polish your resume copy",
        description:
          "Tweak bullet points, keywords, and formatting to lift your quality score.",
        href: `/resumes/${resumeIdString}/edit`,
      });

      if (resumeUrl) {
        list.push({
          id: "share-resume",
          title: "Share with recruiters",
          description:
            "Copy your live SwitchCV link and include a personal note when you reach out.",
          href: resumeUrl,
          external: true,
        });
      }
    } else {
      list.push({
        id: "create-resume",
        title: "Create your first resume",
        description:
          "We will walk you through the essentials so you can publish a shareable resume today.",
        href: "/create-resume",
      });
    }

    list.push({
      id: "update-profile",
      title: "Refresh your profile essentials",
      description:
        "Align your headline, target role, and locations with the roles you want next.",
      href: "/profile",
    });

    list.push({
      id: "practice-interviews",
      title: "Draft interview stories",
      description:
        "Outline your key STAR stories so you can respond confidently when interviews pop up.",
      href: "/create-resume",
    });

    return list;
  }, [hasResume, resumeIdString, resumeUrl]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/50 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
              Opportunity readiness
            </span>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Let's land your next role
              </h2>
              <p className="text-sm text-slate-200 sm:text-base">
                Follow the action plan on the right, track how recruiters
                engage, and keep your resume fresh.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {hasResume && resumeIdString ? (
                <Link
                  href={`/resumes/${resumeIdString}/edit`}
                  className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Improve resume
                </Link>
              ) : (
                <Link
                  href="/create-resume"
                  className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Create resume
                </Link>
              )}
              <Link
                href="/profile"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-500/40"
              >
                Update profile
              </Link>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
            <div className="flex items-baseline justify-between text-xs text-slate-400">
              <span>Readiness score</span>
              <span>{heroInsights.lastUpdatedLabel}</span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className="text-4xl font-bold text-white">
                {readinessScore}
              </div>
              <div className="flex-1">
                <div className="h-2 w-full rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-cyan-500 transition-all duration-500"
                    style={{ width: `${Math.max(readinessScore, 4)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                  {heroInsights.label}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs text-slate-300">
              <div>
                <span className="block text-lg font-semibold text-white">
                  {metrics?.profileViews ?? 0}
                </span>
                Views
              </div>
              <div>
                <span className="block text-lg font-semibold text-white">
                  {metrics?.contactRequests ?? 0}
                </span>
                Requests
              </div>
              <div>
                <span className="block text-lg font-semibold text-white">
                  {metrics?.downloads ?? 0}
                </span>
                Downloads
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <ResumeStatusCard
            hasResume={hasResume}
            resumeId={resumeId}
            resumeLoading={resumeLoading}
            isPublished={resume?.published ?? false}
            onRefresh={onRefreshResume}
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <ProfileViewsCard />
            <ContactRequestsCard />
            <ResumeQualityCard hasResume={hasResume} />
            <LastUpdatedCard hasResume={hasResume} />
            <DownloadsCard hasResume={hasResume} />
          </div>
        </div>

        <div className="space-y-6">
          <ActionPlanCard
            headline="Today's next steps"
            items={actionItems}
            loading={metricsLoading}
          />
          <ResourceLinksCard
            title="Keep momentum"
            caption="Drop into these focus areas between applications."
            links={resources}
          />
        </div>
      </div>

      <OpportunityInsightsCard
        title="Where to focus next"
        subtitle="Signals from your profile activity"
        insights={opportunityInsights}
      />
    </div>
  );
}
