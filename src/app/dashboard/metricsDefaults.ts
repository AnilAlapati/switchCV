import type { JobSeekerMetrics, RecruiterMetrics } from "@/types/dashboard";

export const DEFAULT_SEARCH_BREAKDOWN = {
  searchesLast24h: 0,
  searchesLast7Days: 0,
  uniqueCandidatesLast7Days: 0,
  topSkillsLast7Days: [] as { name: string; count: number }[],
  topLocationsLast7Days: [] as { name: string; count: number }[],
};

export const DEFAULT_JOB_METRICS: JobSeekerMetrics = {
  profileViews: 0,
  contactRequests: 0,
  downloads: 0,
  quality: 0,
  lastUpdated: null,
};

export const DEFAULT_RECRUITER_METRICS: RecruiterMetrics = {
  totalSearches: 0,
  totalProfileViews: 0,
  totalCandidatesInteracted: 0,
  accessRequests: {
    pending: 0,
    approved: 0,
    denied: 0,
  },
  lastActivityAt: null,
  searchBreakdown: {
    ...DEFAULT_SEARCH_BREAKDOWN,
    topSkillsLast7Days: [],
    topLocationsLast7Days: [],
  },
};

export function normalizeJobSeekerMetrics(
  data?: Partial<JobSeekerMetrics> | null
) {
  return {
    profileViews: data?.profileViews ?? 0,
    contactRequests: data?.contactRequests ?? 0,
    downloads: data?.downloads ?? 0,
    quality: data?.quality ?? 0,
    lastUpdated: data?.lastUpdated ?? null,
  } satisfies JobSeekerMetrics;
}

export function normalizeRecruiterMetrics(
  data?: Partial<RecruiterMetrics> | null
) {
  return {
    totalSearches: data?.totalSearches ?? 0,
    totalProfileViews: data?.totalProfileViews ?? 0,
    totalCandidatesInteracted: data?.totalCandidatesInteracted ?? 0,
    accessRequests: {
      pending: data?.accessRequests?.pending ?? 0,
      approved: data?.accessRequests?.approved ?? 0,
      denied: data?.accessRequests?.denied ?? 0,
    },
    lastActivityAt: data?.lastActivityAt ?? null,
    searchBreakdown: {
      searchesLast24h: data?.searchBreakdown?.searchesLast24h ?? 0,
      searchesLast7Days: data?.searchBreakdown?.searchesLast7Days ?? 0,
      uniqueCandidatesLast7Days:
        data?.searchBreakdown?.uniqueCandidatesLast7Days ?? 0,
      topSkillsLast7Days: data?.searchBreakdown?.topSkillsLast7Days
        ? [...data.searchBreakdown.topSkillsLast7Days]
        : [],
      topLocationsLast7Days: data?.searchBreakdown?.topLocationsLast7Days
        ? [...data.searchBreakdown.topLocationsLast7Days]
        : [],
    },
  } satisfies RecruiterMetrics;
}
