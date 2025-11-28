"use client";

import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
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

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch metrics");
  }
  return res.json();
};

export function useDashboardMetrics(): UseDashboardMetricsResult {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: profileLoading } = useUserProfile();

  const isRecruiter = role === "recruiter" || role === "admin";
  const userId = user?.uid;

  // Job Seeker Metrics SWR
  const jobMetricsKey =
    !authLoading && !profileLoading && userId && !isRecruiter
      ? [`/api/jobseeker/metrics?userId=${userId}`, userId]
      : null;

  const {
    data: jobData,
    error: jobError,
    isLoading: jobLoading,
    mutate: mutateJob,
  } = useSWR(
    jobMetricsKey,
    ([url]) => user!.getIdToken().then((token) => fetcher(url, token)),
    {
      dedupingInterval: 60000, // 1 minute
      fallbackData: DEFAULT_JOB_METRICS,
    }
  );

  // Recruiter Metrics SWR
  const recruiterMetricsKey =
    !authLoading && !profileLoading && userId && isRecruiter
      ? [`/api/recruiter/metrics?userId=${userId}`, userId]
      : null;

  const {
    data: recruiterData,
    error: recruiterError,
    isLoading: recruiterLoading,
    mutate: mutateRecruiter,
  } = useSWR(
    recruiterMetricsKey,
    ([url]) => user!.getIdToken().then((token) => fetcher(url, token)),
    {
      dedupingInterval: 60000, // 1 minute
      fallbackData: DEFAULT_RECRUITER_METRICS,
    }
  );

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
