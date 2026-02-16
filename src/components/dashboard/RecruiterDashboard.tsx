"use client";

import { useMemo } from "react";
import { OpportunityInsightsCard } from "@/components/dashboard/OpportunityInsightsCard";
import { WelcomeBanner } from "@/components/dashboard/recruiter/WelcomeBanner";
import { QuickActionsGrid } from "@/components/dashboard/recruiter/QuickActionsGrid";
import { TodoChips } from "@/components/dashboard/recruiter/TodoChips";
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


interface RecruiterDashboardProps {
  metrics: RecruiterMetrics | null;
  metricsLoading: boolean;
  resumes?: DashboardResume[];
}

export function RecruiterDashboard({
  metrics,
  metricsLoading,
  resumes,
}: RecruiterDashboardProps) {
  const actionItems = useMemo(
    () => buildRecruiterActionPlan({ metrics }),
    [metrics],
  );

  const insights = useMemo(() => buildRecruiterInsights(metrics), [metrics]);

  // Show skeleton while initial data is loading
  if (metricsLoading && !metrics) {
    return <RecruiterDashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* 1. Welcome Banner with Pipeline Score */}
      <WelcomeBanner metrics={metrics} loading={metricsLoading} />

      {/* 3. Quick Actions Navigation */}
      <PremiumFeatureLock
        featureName="Quick Actions"
        description={TIER_RESTRICTION_MESSAGES.PREMIUM_FEATURE}
      >
        <QuickActionsGrid />
      </PremiumFeatureLock>

      {/* 4. Priority To-Do Chips */}
      <PremiumFeatureLock
        featureName="Priority Actions"
        description={TIER_RESTRICTION_MESSAGES.PRIORITY_ACTIONS}
      >
        <TodoChips items={actionItems} loading={metricsLoading} />
      </PremiumFeatureLock>

      {/* Debug resume list */}
      {ENABLE_SEEDING_AND_DEBUG_LISTS && resumes !== undefined && resumes.length > 0 && (
        <ResumeList resumes={resumes} />
      )}



      {/* 6. Pipeline Insights */}
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
