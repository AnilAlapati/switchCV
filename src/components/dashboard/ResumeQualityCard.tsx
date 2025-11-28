"use client";

import { logger } from "@/lib/logger";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalDashboardMetricsContext } from "@/context/DashboardMetricsContext";

interface QualityMetrics {
  quality: number;
}

interface ResumeQualityCardProps {
  hasResume?: boolean;
}

export function ResumeQualityCard({ hasResume }: ResumeQualityCardProps) {
  const { user } = useAuth();
  const metricsContext = useOptionalDashboardMetricsContext();
  const usingContext = Boolean(metricsContext);
  const contextMetrics = metricsContext?.jobSeekerMetrics;
  const contextLoading = metricsContext?.loading ?? false;
  const [metrics, setMetrics] = useState<QualityMetrics>({ quality: 0 });
  const [loading, setLoading] = useState(true);
  const displayQuality = usingContext
    ? contextMetrics?.quality ?? 0
    : metrics.quality;
  const loadingState = usingContext ? contextLoading : loading;
  const resumePrompt = !loadingState && hasResume === false;
  const qualityValue = resumePrompt ? 0 : displayQuality;

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
          setMetrics({ quality: data.quality || 0 });
        }
      } catch (error) {
        logger.error({ err: error }, "Failed to fetch resume quality:");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user, usingContext]);

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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-slate-400 truncate">
              Resume Quality
            </dt>
            <dd className="text-2xl font-bold text-white">
              {loading ? "-" : `${qualityValue}%`}
            </dd>
          </dl>
        </div>
      </div>
      <div className="mt-4">
        <div className="h-2 w-full rounded-full bg-slate-800">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 transition-all duration-500"
            style={{ width: loadingState ? "0%" : `${qualityValue}%` }}
          ></div>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          {loadingState
            ? "Loading..."
            : resumePrompt
            ? "Create a resume to see quality insights"
            : qualityValue === 0
            ? "Generate your first analysis to view quality"
            : qualityValue >= 80
            ? "Well optimized resume"
            : qualityValue >= 60
            ? "Good resume quality"
            : "Resume needs improvement"}
        </p>
      </div>
    </div>
  );
}
