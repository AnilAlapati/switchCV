"use client";

import type { ReactElement } from "react";
import { logger } from "@/lib/logger";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalDashboardMetricsContext } from "@/context/DashboardMetricsContext";
import type { RecruiterSearchBreakdown } from "@/types/dashboard";
import { DEFAULT_SEARCH_BREAKDOWN } from "@/app/dashboard/metricsDefaults";
import { useUserProfile } from "@/hooks/useUserProfile";
import { RECRUITER_SEARCH_LIMITS } from "@/lib/config.client";

interface SearchMetrics {
  totalSearches: number;
  searchBreakdown: RecruiterSearchBreakdown;
}

const createEmptyBreakdown = (): RecruiterSearchBreakdown => ({
  searchesLast24h: 0,
  searchesLast7Days: 0,
  uniqueCandidatesLast7Days: 0,
  topSkillsLast7Days: [],
  topLocationsLast7Days: [],
});

const normalizeBreakdown = (
  breakdown?: Partial<RecruiterSearchBreakdown> | null
): RecruiterSearchBreakdown => ({
  searchesLast24h: breakdown?.searchesLast24h ?? 0,
  searchesLast7Days: breakdown?.searchesLast7Days ?? 0,
  uniqueCandidatesLast7Days: breakdown?.uniqueCandidatesLast7Days ?? 0,
  topSkillsLast7Days: breakdown?.topSkillsLast7Days
    ? [...breakdown.topSkillsLast7Days]
    : [],
  topLocationsLast7Days: breakdown?.topLocationsLast7Days
    ? [...breakdown.topLocationsLast7Days]
    : [],
});

export function CandidatesSearchedCard(): ReactElement {
  const { user } = useAuth();
  const { tier } = useUserProfile();
  const isBasic = tier === "basic";

  const metricsContext = useOptionalDashboardMetricsContext();
  const usingContext = Boolean(
    metricsContext && metricsContext.recruiterMetrics
  );
  const contextMetrics = metricsContext?.recruiterMetrics;
  const contextLoading = metricsContext?.loading ?? false;
  const [metrics, setMetrics] = useState<SearchMetrics>({
    totalSearches: 0,
    searchBreakdown: createEmptyBreakdown(),
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

    const fetchMetrics = async (): Promise<void> => {
      try {
        const response = await fetch(
          `/api/recruiter/metrics?userId=${user?.uid}`
        );
        if (response.ok) {
          const data = await response.json();
          setMetrics({
            totalSearches: data.totalSearches || 0,
            searchBreakdown: normalizeBreakdown(
              data.searchBreakdown ?? DEFAULT_SEARCH_BREAKDOWN
            ),
          });
        }
      } catch (error) {
        logger.error({ err: error }, "Failed to fetch search metrics:");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user, usingContext]);

  const totalSearches = usingContext
    ? contextMetrics?.totalSearches ?? 0
    : metrics.totalSearches;

  const breakdown = usingContext
    ? contextMetrics?.searchBreakdown ?? DEFAULT_SEARCH_BREAKDOWN
    : metrics.searchBreakdown;

  const recentSearches = breakdown?.searchesLast7Days ?? 0;
  const uniqueRecent = breakdown?.uniqueCandidatesLast7Days ?? 0;
  const lastDaySearches = breakdown?.searchesLast24h ?? 0;
  const loadingState = usingContext ? contextLoading : loading;

  return (
    <Link href="/recruiter/search">
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">
                Search Intelligence
              </dt>
              <dd className="text-3xl font-serif font-bold text-black">
                {loadingState ? "-" : recentSearches}
              </dd>
            </dl>
          </div>
        </div>
        <div className="mt-4 relative z-10 flex items-center justify-between">
          <p className="text-sm text-gray-500 font-sans">
            {loadingState
              ? "Loading..."
              : totalSearches === 0
                ? "Start searching for candidates"
                : isBasic
                  ? `${totalSearches} / ${RECRUITER_SEARCH_LIMITS.basic} analyses used`
                  : `${totalSearches} all-time · ${uniqueRecent} unique candidates`}
          </p>
          {!loadingState && (
            <p className="text-xs text-gray-400 font-mono">
              {isBasic
                ? `${RECRUITER_SEARCH_LIMITS.basic - totalSearches} remaining`
                : `${lastDaySearches} in past 24h`}
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
