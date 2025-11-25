"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalDashboardMetricsContext } from "@/context/DashboardMetricsContext";

interface DownloadsMetrics {
  downloads: number;
}

interface DownloadsCardProps {
  hasResume?: boolean;
}

export function DownloadsCard({ hasResume }: DownloadsCardProps) {
  const { user } = useAuth();
  const metricsContext = useOptionalDashboardMetricsContext();
  const usingContext = Boolean(metricsContext);
  const contextMetrics = metricsContext?.jobSeekerMetrics;
  const contextLoading = metricsContext?.loading ?? false;
  const [metrics, setMetrics] = useState<DownloadsMetrics>({ downloads: 0 });
  const [loading, setLoading] = useState(true);
  const loadingState = usingContext ? contextLoading : loading;
  const resumePrompt = !loadingState && hasResume === false;
  const downloadsValue = usingContext
    ? contextMetrics?.downloads ?? 0
    : metrics.downloads;

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
          `/api/jobseeker/metrics?userId=${user?.uid}`
        );
        if (response.ok) {
          const data = await response.json();
          setMetrics({ downloads: data.downloads || 0 });
        }
      } catch (error) {
        console.error("Failed to fetch downloads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user, usingContext]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40 transition hover:border-cyan-500/40">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-indigo-300">
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
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-slate-400 truncate">
              Downloads
            </dt>
            <dd className="text-2xl font-bold text-white">
              {loadingState ? "-" : downloadsValue}
            </dd>
          </dl>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-300">
          {loadingState
            ? "Loading..."
            : resumePrompt
            ? "Create your resume to start tracking downloads"
            : downloadsValue === 0
            ? "Downloads will appear here"
            : `${downloadsValue} resume download${
                downloadsValue !== 1 ? "s" : ""
              }`}
        </p>
      </div>
    </div>
  );
}
