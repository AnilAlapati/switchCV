"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalDashboardMetricsContext } from "@/context/DashboardMetricsContext";

interface LastUpdatedMetrics {
  lastUpdated: string | null;
}

interface LastUpdatedCardProps {
  hasResume?: boolean;
}

function formatTimeAgo(timestamp: string | null): string {
  if (!timestamp) return "Never";

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60)
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}

export function LastUpdatedCard({ hasResume }: LastUpdatedCardProps) {
  const { user } = useAuth();
  const metricsContext = useOptionalDashboardMetricsContext();
  const usingContext = Boolean(metricsContext);
  const contextMetrics = metricsContext?.jobSeekerMetrics;
  const contextLoading = metricsContext?.loading ?? false;
  const [metrics, setMetrics] = useState<LastUpdatedMetrics>({
    lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);
  const loadingState = usingContext ? contextLoading : loading;
  const resumePrompt = !loadingState && hasResume === false;
  const lastUpdatedValue = usingContext
    ? contextMetrics?.lastUpdated ?? null
    : metrics.lastUpdated;

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
        `/api/jobseeker/metrics?userId=${user?.uid}`
      );
      if (response.ok) {
        const data = await response.json();
        setMetrics({ lastUpdated: data.lastUpdated || null });
      }
    } catch (error) {
      console.error("Failed to fetch last updated:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40 transition hover:border-cyan-500/40">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-amber-300">
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
            <dt className="text-sm font-medium text-slate-400 truncate">
              Last Updated
            </dt>
            <dd className="text-lg font-bold text-white">
              {loadingState ? "-" : formatTimeAgo(lastUpdatedValue)}
            </dd>
          </dl>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-300">
          {loadingState
            ? "Loading..."
            : resumePrompt
            ? "Create your resume to track updates"
            : lastUpdatedValue
            ? "Keep your resume fresh!"
            : "Update history will appear here"}
        </p>
      </div>
    </div>
  );
}
