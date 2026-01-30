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
} from "@/lib/dashboard/recruiterInsights";
import { PremiumFeatureLock } from "@/components/ui/PremiumFeatureLock";
import { TIER_RESTRICTION_MESSAGES } from "@/lib/utils/tier-restrictions";
import type { RecruiterMetrics } from "@/types/dashboard";
import type { DashboardResume } from "@/types";
import { Search, FileText, Sparkles } from "lucide-react";
import Link from "next/link";

interface RecruiterDashboardProps {
  metrics: RecruiterMetrics | null;
  metricsLoading: boolean;
  onLaunchSearch?: () => void;
  searchSectionRef?: React.RefObject<HTMLDivElement | null>;
  resumes?: DashboardResume[];
}

export function RecruiterDashboard({
  metrics,
  metricsLoading,
  onLaunchSearch,
  searchSectionRef,
  resumes,
}: RecruiterDashboardProps) {
  const actionItems = useMemo(
    () => buildRecruiterActionPlan({ metrics, onLaunchSearch }),
    [metrics, onLaunchSearch],
  );

  const insights = useMemo(() => buildRecruiterInsights(metrics), [metrics]);

  const resources = useMemo(() => {
    return [
      {
        id: "search",
        title: "Run an advanced talent search",
        description: "Filter by role, skills, and location.",
        href: "/recruiter/search",
      },
      {
        id: "jd-search",
        title: "Search by Job Description",
        description: "Upload a JD to find matching candidates.",
        href: "/recruiter/search?mode=jd",
      },
    ];
  }, []);

  // Show skeleton while initial data is loading
  if (metricsLoading && !metrics) {
    return <RecruiterDashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions Header */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/recruiter/search"
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          <Search className="w-4 h-4" />
          Search Candidates
        </Link>
        <Link
          href="/recruiter/search?mode=jd"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-black text-black rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Upload Job Description
        </Link>
      </div>

      {ENABLE_SEEDING_AND_DEBUG_LISTS && resumes !== undefined && resumes.length > 0 && (
        <div>
          <ResumeList resumes={resumes} />
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <CandidatesSearchedCard />
        <AvailableResumesCard />
        <AccessRequestsCard />
        <CandidatesInteractedCard />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Search & Actions (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Compact AI Info Banner */}
          <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1">
                  AI-Powered Talent Discovery
                </h3>
                <p className="text-sm text-gray-600">
                  Describe your ideal candidate or upload a job description — our AI extracts requirements
                  and finds the best matches automatically.
                </p>
              </div>
              <Link
                href="/recruiter/search"
                className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-black bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Try Now →
              </Link>
            </div>
          </div>

          {/* Search Box */}
          <div ref={searchSectionRef}>
            <RecruiterSearchBox />
          </div>
        </div>

        {/* Right Column - Quick Actions (1/3 width) */}
        <div className="space-y-6">
          <PremiumFeatureLock
            featureName="Priority Actions"
            description={TIER_RESTRICTION_MESSAGES.PRIORITY_ACTIONS}
          >
            <ActionPlanCard
              headline="Priority Actions"
              items={actionItems}
              loading={metricsLoading}
            />
          </PremiumFeatureLock>

          <PremiumFeatureLock
            featureName="Quick Links"
            description={TIER_RESTRICTION_MESSAGES.PREMIUM_FEATURE}
          >
            <ResourceLinksCard
              title="Quick Links"
              caption="Common workflows"
              links={resources}
            />
          </PremiumFeatureLock>
        </div>
      </div>

      {/* Insights - Collapsed by default */}
      <PremiumFeatureLock
        featureName="Pipeline Insights"
        description={TIER_RESTRICTION_MESSAGES.ANALYTICS_DASHBOARD}
      >
        <OpportunityInsightsCard
          title="Pipeline Insights"
          insights={insights}
        />
      </PremiumFeatureLock>
    </div>
  );
}

