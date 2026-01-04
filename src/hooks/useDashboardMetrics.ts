"use client";

import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { apiClient } from "@/lib/apiClient";
import {
  DEFAULT_JOB_METRICS,
  DEFAULT_RECRUITER_METRICS,
  normalizeJobSeekerMetrics,
  normalizeRecruiterMetrics,
} from "@/app/dashboard/metricsDefaults";
import { JobSeekerMetrics, RecruiterMetrics } from "@/types/dashboard";

interface UseDashboardMetricsResult {
  jobSeekerMetrics: JobSeekerMetrics;
  recruiterMetrics: RecruiterMetrics;
  loading: boolean;
  error: any;
  refreshJobSeekerMetrics: () => Promise<any>;
  refreshRecruiterMetrics: () => Promise<any>;
}

export function useDashboardMetrics(): UseDashboardMetricsResult {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: profileLoading } = useUserProfile();

  const isRecruiter = role === "recruiter" || role === "admin";
  const userId = user?.uid;

  // Job Seeker Metrics SWR - Optimistically fetch if we have a user, regardless of role loading
  // This helps parallelize fetching. If user turns out to be recruiter, we just ignore this data.
  const jobMetricsKey =
    !authLoading && userId && !isRecruiter
      ? `/api/jobseeker/metrics?userId=${userId}`
      : null;

  const {
    data: jobData,
    error: jobError,
    isLoading: jobLoading,
    mutate: mutateJob,
  } = useSWR(jobMetricsKey, (url) => apiClient(url), {
    dedupingInterval: 300000, // 5 minutes - metrics don't change frequently
    fallbackData: DEFAULT_JOB_METRICS,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // Recruiter Metrics SWR
  const recruiterMetricsKey =
    !authLoading && !profileLoading && userId && isRecruiter
      ? `/api/recruiter/metrics?userId=${userId}`
      : null;

  const {
    data: recruiterData,
    error: recruiterError,
    isLoading: recruiterLoading,
    mutate: mutateRecruiter,
  } = useSWR(recruiterMetricsKey, (url) => apiClient(url), {
    dedupingInterval: 300000, // 5 minutes - metrics don't change frequently
    fallbackData: DEFAULT_RECRUITER_METRICS,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return {
    jobSeekerMetrics: jobData
      ? normalizeJobSeekerMetrics(jobData)
      : DEFAULT_JOB_METRICS,
    recruiterMetrics: recruiterData
      ? normalizeRecruiterMetrics(recruiterData)
      : DEFAULT_RECRUITER_METRICS,
    loading:
      authLoading ||
      profileLoading ||
      (isRecruiter ? recruiterLoading : jobLoading),
    error: jobError || recruiterError,
    refreshJobSeekerMetrics: mutateJob,
    refreshRecruiterMetrics: mutateRecruiter,
  };
}
