"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface AccessMetrics {
  pending: number;
  approved: number;
  denied: number;
}

export function AccessRequestsCard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AccessMetrics>({
    pending: 0,
    approved: 0,
    denied: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchMetrics();
  }, [user]);

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

  const total = metrics.pending + metrics.approved + metrics.denied;

  return (
    <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl shadow-black/50 p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
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
              {loading ? "-" : total}
            </dd>
          </dl>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <div className="text-xs text-slate-400 mb-1">Pending</div>
            <div className="text-lg font-semibold text-yellow-400">
              {loading ? "-" : metrics.pending}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-slate-400 mb-1">Approved</div>
            <div className="text-lg font-semibold text-green-400">
              {loading ? "-" : metrics.approved}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-slate-400 mb-1">Denied</div>
            <div className="text-lg font-semibold text-red-400">
              {loading ? "-" : metrics.denied}
            </div>
          </div>
        </div>
        <p className="text-slate-400 text-sm">
          {loading
            ? "Loading..."
            : total === 0
            ? "No access requests"
            : `${total} total request${total !== 1 ? "s" : ""}`}
        </p>
      </div>
    </div>
  );
}
