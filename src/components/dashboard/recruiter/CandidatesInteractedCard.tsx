"use client";

import { logger } from "@/lib/logger";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalDashboardMetricsContext } from "@/context/DashboardMetricsContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { RECRUITER_CONTACT_LIMITS } from "@/lib/config.client";

interface AccessMetrics {
  pending: number;
  approved: number;
  denied: number;
}

export function CandidatesInteractedCard() {
  const { user } = useAuth();
  const { tier } = useUserProfile();
  const isBasic = tier === "basic";

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
          const requests = data.accessRequests || {};
          setMetrics({
            pending: requests.pending || 0,
            approved: requests.approved || 0,
            denied: requests.denied || 0,
          });
        }
      } catch (error) {
        if (abortController.signal.aborted) return;
        logger.error({ err: error }, "Failed to fetch interaction metrics:");
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
  }, [user, usingContext]);

  const displayMetrics = usingContext
    ? contextMetrics?.accessRequests ?? metrics
    : metrics;
  const loadingState = usingContext ? contextLoading : loading;
  const totalContacted =
    displayMetrics.pending + displayMetrics.approved + displayMetrics.denied;

  return (
    <Link href="/dashboard/recruiter/requests?tab=history">
      <div className="glass-panel rounded-3xl p-6 transition hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-200/50 cursor-pointer h-full flex flex-col justify-between group">
        <div className="flex items-center relative z-10">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 transition-colors">
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
                  d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20v-2a3 3 0 015.856-1.487M5 10a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-bold text-[#2C4A3B]/60 truncate transition-colors">
                Candidates Contacted
              </dt>
              <dd className="text-2xl font-bold text-[#1A2F25]">
                {loadingState ? "-" : totalContacted}
              </dd>
            </dl>
          </div>
        </div>
        <div className="mt-4 relative z-10 flex items-center justify-between">
          <p className="text-sm text-[#1A2F25]/60 transition-colors">
            {loadingState
              ? "Loading..."
              : totalContacted === 0
                ? "No candidates contacted yet"
                : isBasic
                  ? `${totalContacted} / ${RECRUITER_CONTACT_LIMITS.basic.amount} contacts used`
                  : `${totalContacted} candidate${totalContacted !== 1 ? "s" : ""
                  } contacted`}
          </p>
          {isBasic && !loadingState && (
            <p className="text-xs text-emerald-600/50 font-medium">
              {RECRUITER_CONTACT_LIMITS.basic.amount - totalContacted} remaining
            </p>
          )}
          <div className="opacity-0 transform translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
            <svg
              className="w-5 h-5 text-emerald-600"
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
