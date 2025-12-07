"use client";

import { logger } from "@/lib/logger";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalDashboardMetricsContext } from "@/context/DashboardMetricsContext";

interface ProfileMetrics {
  profileViews: number;
}

export function ProfileViewsCard() {
  const { user } = useAuth();
  const metricsContext = useOptionalDashboardMetricsContext();
  const usingContext = Boolean(metricsContext);
  const contextMetrics = metricsContext?.jobSeekerMetrics;
  const contextLoading = metricsContext?.loading ?? false;
  const [metrics, setMetrics] = useState<ProfileMetrics>({ profileViews: 0 });
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
          `/api/jobseeker/metrics?userId=${user?.uid}`
        );
        if (response.ok) {
          const data = await response.json();
          setMetrics({ profileViews: data.profileViews || 0 });
        }
      } catch (error) {
        logger.error({ err: error }, "Failed to fetch profile views:");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user, usingContext]);
  const displayValue = usingContext
    ? contextMetrics?.profileViews ?? 0
    : metrics.profileViews;
  const loadingState = usingContext ? contextLoading : loading;

  return (
    <div className="glass-panel rounded-3xl p-6 transition hover:shadow-lg hover:shadow-[#2C4A3B]/10 hover:border-white">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-200/50 bg-blue-100/30 text-blue-600">
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
            <dt className="text-sm font-bold text-[#2C4A3B]/60 truncate">
              Profile Views
            </dt>
            <dd className="text-2xl font-bold text-[#1A2F25]">
              {loadingState ? "-" : displayValue}
            </dd>
          </dl>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-[#1A2F25]/60">
          {loadingState
            ? "Loading..."
            : displayValue === 0
              ? "No views yet"
              : `${displayValue} profile view${displayValue !== 1 ? "s" : ""}`}
        </p>
      </div>
    </div>
  );
}
