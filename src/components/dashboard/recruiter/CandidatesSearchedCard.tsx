"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalDashboardMetricsContext } from "@/context/DashboardMetricsContext";

interface SearchMetrics {
  totalSearches: number;
}

export function CandidatesSearchedCard() {
  const { user } = useAuth();
  const metricsContext = useOptionalDashboardMetricsContext();
  const usingContext = Boolean(
    metricsContext && metricsContext.recruiterMetrics
  );
  const contextMetrics = metricsContext?.recruiterMetrics;
  const contextLoading = metricsContext?.loading ?? false;
  const [metrics, setMetrics] = useState<SearchMetrics>({ totalSearches: 0 });
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
        setMetrics({ totalSearches: data.totalSearches || 0 });
      }
    } catch (error) {
      console.error("Failed to fetch search metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const displayValue = usingContext
    ? contextMetrics?.totalSearches ?? 0
    : metrics.totalSearches;
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-slate-400 truncate">
              Candidates Searched
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
            ? "Start searching for candidates"
            : `${displayValue} search${
                displayValue !== 1 ? "es" : ""
              } performed`}
        </p>
      </div>
    </div>
  );
}
