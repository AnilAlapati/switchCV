"use client";

import type { ReactElement } from "react";
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

export function CandidatesInteractedCard(): ReactElement {
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

    const fetchMetrics = async (): Promise<void> => {
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
      <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 transition-all duration-200 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer h-full flex flex-col justify-between group">
        <div className="flex items-center relative z-10">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center bg-black text-white">
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
              <dt className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest truncate">
                Candidates Contacted
              </dt>
              <dd className="text-3xl font-serif font-bold text-black">
                {loadingState ? "-" : totalContacted}
              </dd>
            </dl>
          </div>
        </div>
        <div className="mt-4 relative z-10 flex items-center justify-between">
          <p className="text-sm text-gray-500 font-sans">
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
            <p className="text-xs text-gray-400 font-mono">
              {RECRUITER_CONTACT_LIMITS.basic.amount - totalContacted} remaining
            </p>
          )}
          <div className="opacity-0 transform translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
            <svg
              className="w-5 h-5 text-black"
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
