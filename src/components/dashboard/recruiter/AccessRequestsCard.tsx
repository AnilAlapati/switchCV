"use client";

import { useEffect, useState } from "react";
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

    fetchMetrics();
  }, [user, usingContext]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(
        `/api/recruiter/metrics?userId=${user?.uid}`
      );
      if (response.ok) {
        const data = await response.json();
        const requests = data.accessRequests || {
          pending: 0,
          approved: 0,
          denied: 0,
        };
        setMetrics(requests);
      }
    } catch (error) {
      console.error("Failed to fetch access requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const displayMetrics = usingContext
    ? contextMetrics?.accessRequests ?? metrics
    : metrics;
  const loadingState = usingContext ? contextLoading : loading;
  const total =
    displayMetrics.pending + displayMetrics.approved + displayMetrics.denied;

  return (
    <div className="backdrop-blur-xl rounded-3xl border border-white/20 bg-white/10 p-6 shadow-lg shadow-slate-950/40 transition hover:border-cyan-500/40">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-white">
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
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-slate-400 truncate">
              Access Requests
            </dt>
            <dd className="text-2xl font-bold text-white">
              {loadingState ? "-" : total}
            </dd>
          </dl>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <div className="mb-1 text-xs text-slate-400">Pending</div>
            <div className="text-lg font-semibold text-yellow-400">
              {loadingState ? "-" : displayMetrics.pending}
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-1 text-xs text-slate-400">Approved</div>
            <div className="text-lg font-semibold text-green-400">
              {loadingState ? "-" : displayMetrics.approved}
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-1 text-xs text-slate-400">Denied</div>
            <div className="text-lg font-semibold text-red-400">
              {loadingState ? "-" : displayMetrics.denied}
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-300">
          {loadingState
            ? "Loading..."
            : total === 0
            ? "No access requests"
            : `${total} total request${total !== 1 ? "s" : ""}`}
        </p>
      </div>
    </div>
  );
}
