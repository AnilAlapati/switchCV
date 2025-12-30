"use client";

import { logger } from "@/lib/logger";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalDashboardMetricsContext } from "@/context/DashboardMetricsContext";

interface AccessMetrics {
  pending: number;
  approved: number;
  denied: number;
}

export function AvailableResumesCard() {
  const { user } = useAuth();
  const metricsContext = useOptionalDashboardMetricsContext();
  const usingContext = Boolean(
    metricsContext && metricsContext.recruiterMetrics
  );
  const contextMetrics = metricsContext?.recruiterMetrics;
  const contextLoading = metricsContext?.loading ?? false;
  const [metrics, setMetrics] = useState<AccessMetrics>({
    pending: 0,
    approved: 0,
    denied: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (usingContext) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      try {
        const response = await fetch(
          `/api/recruiter/metrics?userId=${user?.uid}`
        );
        if (response.ok) {
          const data = await response.json();
          const requests = data.accessRequests || {};
          setMetrics({
            pending: requests.pending || 0,
            approved: requests.approved || 0,
            denied: requests.denied || 0,
          });
        }
      } catch (error) {
        logger.error(
          { err: error },
          "Failed to fetch metrics for available resumes:"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user, usingContext]);

  const displayMetrics = usingContext
    ? contextMetrics?.accessRequests ?? metrics
    : metrics;
  const loadingState = usingContext ? contextLoading : loading;

  const availableCount = displayMetrics.approved;

  return (
    <Link href="/dashboard/recruiter/requests?tab=active">
      <div className="glass-panel rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/20 hover:border-cyan-400/50 cursor-pointer h-full flex flex-col justify-between group hover:scale-[1.02]">
        <div className="flex items-center relative z-10">
          <div className="flex-shrink-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 transition-all duration-300 group-hover:border-cyan-400 group-hover:shadow-lg group-hover:shadow-cyan-500/30">
              <svg
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-bold text-gray-900 transition-colors group-hover:text-cyan-700">
                Unlocked Talent Profiles
              </dt>
              <dd className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                {loadingState ? "-" : availableCount}
              </dd>
            </dl>
          </div>
        </div>
        <div className="mt-5 relative z-10 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 transition-colors group-hover:text-gray-900">
            {loadingState
              ? "Loading..."
              : availableCount === 0
                ? "No active grants"
                : `${availableCount} resume${availableCount !== 1 ? "s" : ""
                } unlocked`}
          </p>
          <div className="opacity-0 transform translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-cyan-500/10 border border-cyan-500/30">
              <svg
                className="w-4 h-4 text-cyan-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
