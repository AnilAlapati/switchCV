"use client";

import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { CandidatesSearchedCard } from "@/components/dashboard/recruiter/CandidatesSearchedCard";
import { AvailableResumesCard } from "@/components/dashboard/recruiter/AvailableResumesCard";
import { AccessRequestsCard } from "@/components/dashboard/recruiter/AccessRequestsCard";
import { CandidatesInteractedCard } from "@/components/dashboard/recruiter/CandidatesInteractedCard";
import { DashboardMetricsProvider } from "@/context/DashboardMetricsContext";
import { Sparkles, RefreshCcw } from "lucide-react";

export function RecruiterAnalyticsView() {
  const {
    recruiterMetrics,
    loading: metricsLoading,
    refreshRecruiterMetrics,
  } = useDashboardMetrics();

  const metricsProviderValue = {
    loading: metricsLoading,
    jobSeekerMetrics: null,
    recruiterMetrics: recruiterMetrics || null,
    refreshJobSeekerMetrics: async () => {},
    refreshRecruiterMetrics: refreshRecruiterMetrics,
  };

  return (
    <DashboardMetricsProvider value={metricsProviderValue}>
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/50">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                Personal Recruitment Insights
              </span>
            </div>
            <h1 className="text-4xl font-black text-black tracking-tight">
              Your Analytics
            </h1>
            <p className="text-black/60 font-medium">
              Track your sourcing performance and candidate engagement.
            </p>
          </div>

          <button
            onClick={() => refreshRecruiterMetrics?.()}
            aria-busy={metricsLoading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95 text-sm"
          >
            <RefreshCcw
              className={`w-4 h-4 ${metricsLoading ? "animate-spin" : ""}`}
              role="status"
              aria-live="polite"
              aria-label={metricsLoading ? "Refreshing data" : undefined}
            />
            Refresh Data
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CandidatesSearchedCard />
          <AvailableResumesCard />
          <AccessRequestsCard />
          <CandidatesInteractedCard />
        </div>

        {/* Informational Section */}
        <div className="glass-panel rounded-3xl p-8 border border-white/60 bg-white/40 backdrop-blur-sm">
          <h3 className="text-xl font-bold text-black mb-4">
            About Your Analytics
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="font-bold text-indigo-600">Candidate Search</div>
              <p className="text-sm text-black/60 leading-relaxed">
                Tracks how many unique candidates you've discovered through our
                AI search platform.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-bold text-emerald-600">Engagement Score</div>
              <p className="text-sm text-black/60 leading-relaxed">
                Measures your successful interactions and approved access
                requests.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-bold text-amber-600">Talent Pool</div>
              <p className="text-sm text-black/60 leading-relaxed">
                Shows the current number of high-quality resumes matching your
                searching patterns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardMetricsProvider>
  );
}
