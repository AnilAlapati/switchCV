"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalDashboardMetricsContext } from "@/context/DashboardMetricsContext";

interface ViewMetrics {
  totalProfileViews: number;
}

export function RecruiterProfileViewsCard() {
  const { user } = useAuth();
  const metricsContext = useOptionalDashboardMetricsContext();
  const usingContext = Boolean(
    metricsContext && metricsContext.recruiterMetrics
  );
  const contextMetrics = metricsContext?.recruiterMetrics;
  const contextLoading = metricsContext?.loading ?? false;
  const [metrics, setMetrics] = useState<ViewMetrics>({ totalProfileViews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (usingContext) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    fetchMetrics();
  }, [user, usingContext]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(
        `/api/recruiter/metrics?userId=${user?.uid}`
      );
      if (response.ok) {
        const data = await response.json();
        setMetrics({ totalProfileViews: data.totalProfileViews || 0 });
      }
    } catch (error) {
      console.error("Failed to fetch profile views:", error);
    } finally {
      setLoading(false);
    }
  };

  const displayValue = usingContext
    ? contextMetrics?.totalProfileViews ?? 0
    : metrics.totalProfileViews;
  const loadingState = usingContext ? contextLoading : loading;

  return (
    <div className="backdrop-blur-xl rounded-3xl border border-white/20 bg-white/10 p-6 shadow-lg shadow-slate-950/40 transition hover:border-cyan-500/40">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-white">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-slate-400 truncate">
              Candidates Viewed
            </dt>
            <dd className="text-2xl font-bold text-white">
              {loadingState ? "-" : displayValue}
            </dd>
          </dl>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-300">
          {loadingState
            ? "Loading..."
            : displayValue === 0
            ? "No candidates viewed yet"
            : `${displayValue} candidate${
                displayValue !== 1 ? "s" : ""
              } viewed`}
        </p>
      </div>
    </div>
  );
}
