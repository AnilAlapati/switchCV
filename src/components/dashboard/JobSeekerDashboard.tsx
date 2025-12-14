"use client";

import { useMemo } from "react";
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
  const resumeIdString = resumeId ? String(resumeId) : null;
  const resumeUrl =
    hasResume && resumeIdString ? getResumeUrl(resumeIdString) : null;

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
            isPublished={!!(resume?.publishedAt && !resume?.isBeingEdited)}
            lastUpdated={resume?.updatedAt || resume?.lastUpdatedAt}
            onRefresh={onRefreshResume}
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
