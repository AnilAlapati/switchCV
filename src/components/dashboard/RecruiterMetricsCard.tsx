"use client";

import { logger } from "@/lib/logger";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface RecruiterMetrics {
  totalSearches: number;
  totalProfileViews: number;
  accessRequests: {
    pending: number;
    approved: number;
    denied: number;
  };
  totalCandidatesInteracted: number;
  lastActivityAt: string | null;
}

interface RecruiterMetricsCardProps {
  isRecruiter: boolean;
}

export function RecruiterMetricsCard({
  isRecruiter,
}: RecruiterMetricsCardProps) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<RecruiterMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isRecruiter || !user) {
      setLoading(false);
      return;
    }

    const abortController = new AbortController();

    const fetchMetrics = async () => {
      try {
        const response = await fetch(
          `/api/recruiter/metrics?userId=${user?.uid}`,
          { signal: abortController.signal }
        );
        if (abortController.signal.aborted) return;
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      } catch (error) {
        if (abortController.signal.aborted) return;
        logger.error({ err: error }, "Failed to fetch recruiter metrics:");
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchMetrics();

    return () => {
      abortController.abort();
    };
  }, [isRecruiter, user]);

  if (!isRecruiter) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-48 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-12 bg-white/10 rounded"></div>
          <div className="h-12 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:border-amber-500/30 transition-all duration-300">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center mr-3">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
          Recruiter Activity
        </h3>
      </div>

      <div className="space-y-4">
        {/* Total Searches */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
          <div>
            <p className="text-slate-400 text-sm">Searches Conducted</p>
            <p className="text-2xl font-bold text-amber-400">
              {metrics?.totalSearches || 0}
            </p>
          </div>
          <svg
            className="w-8 h-8 text-amber-400/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Profile Views */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
          <div>
            <p className="text-slate-400 text-sm">Profile Views Requested</p>
            <p className="text-2xl font-bold text-cyan-400">
              {metrics?.totalProfileViews || 0}
            </p>
          </div>
          <svg
            className="w-8 h-8 text-cyan-400/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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

        {/* Access Requests */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-slate-400 text-sm mb-3">Access Requests</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-slate-500 text-xs">Pending</p>
              <p className="text-lg font-bold text-yellow-400">
                {metrics?.accessRequests.pending || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-slate-500 text-xs">Approved</p>
              <p className="text-lg font-bold text-green-400">
                {metrics?.accessRequests.approved || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-slate-500 text-xs">Denied</p>
              <p className="text-lg font-bold text-red-400">
                {metrics?.accessRequests.denied || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Candidates Interacted */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
          <div>
            <p className="text-slate-400 text-sm">Candidates Interacted</p>
            <p className="text-2xl font-bold text-purple-400">
              {metrics?.totalCandidatesInteracted || 0}
            </p>
          </div>
          <svg
            className="w-8 h-8 text-purple-400/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 12H9m0 0l3-3m-3 3l-3 3"
            />
          </svg>
        </div>

        {/* Last Activity */}
        {metrics?.lastActivityAt && (
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-slate-400 text-sm">Last Activity</p>
            <p className="text-slate-300 font-medium">
              {new Date(metrics.lastActivityAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
