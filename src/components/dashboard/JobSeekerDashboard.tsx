"use client";

import { useMemo } from "react";
import { ResumeStatusCard } from "@/components/dashboard/ResumeStatusCard";
import { ProfileViewsCard } from "@/components/dashboard/ProfileViewsCard";
import { ContactRequestsCard } from "@/components/dashboard/ContactRequestsCard";
import { ResumeQualityCard } from "@/components/dashboard/ResumeQualityCard";
import { LastUpdatedCard } from "@/components/dashboard/LastUpdatedCard";

import { ActionPlanCard } from "@/components/dashboard/ActionPlanCard";
import { OpportunityInsightsCard } from "@/components/dashboard/OpportunityInsightsCard";
import { ResourceLinksCard } from "@/components/dashboard/ResourceLinksCard";
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
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          {ENABLE_SEEDING_AND_DEBUG_LISTS && resumes && resumes.length > 1 && (
            <ResumeList resumes={resumes} />
          )}

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
