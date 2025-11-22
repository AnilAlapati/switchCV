import type { JobSeekerMetrics, RecruiterMetrics } from "@/types/dashboard";

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
  } satisfies RecruiterMetrics;
}
