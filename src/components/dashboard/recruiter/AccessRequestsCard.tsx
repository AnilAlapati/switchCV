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

export function AccessRequestsCard() {
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
        logger.error({ err: error }, "Failed to fetch access requests:");
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
  // We focus on pending requests for this card
  const pendingCount = displayMetrics.pending;

  return (
    <Link href="/dashboard/recruiter/requests">
      <div className="group relative overflow-hidden backdrop-blur-xl rounded-3xl border border-white/20 bg-white/10 p-6 shadow-lg shadow-slate-950/40 transition-all duration-300 hover:border-amber-500/40 hover:bg-white/15 hover:scale-[1.02] cursor-pointer h-full flex flex-col justify-between">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl transition-all group-hover:bg-amber-500/20"></div>

        <div className="flex items-center relative z-10">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 group-hover:text-amber-300 transition-colors">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-slate-400 truncate group-hover:text-slate-300 transition-colors">
                Pending Requests
              </dt>
              <dd className="text-2xl font-bold text-white">
                {loadingState ? "-" : pendingCount}
              </dd>
            </dl>
          </div>
        </div>
        <div className="mt-4 relative z-10 flex items-center justify-between">
          <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
            {loadingState
              ? "Loading..."
              : pendingCount === 0
              ? "No pending requests"
              : `${pendingCount} request${
                  pendingCount !== 1 ? "s" : ""
                } waiting`}
          </p>
          <div className="opacity-0 transform translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
            <svg
              className="w-5 h-5 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
