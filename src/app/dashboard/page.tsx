// src/app/dashboard/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { JobSeekerDashboard } from "@/components/dashboard/JobSeekerDashboard";
import { RecruiterDashboard } from "@/components/dashboard/RecruiterDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useResume } from "@/hooks/useResume";
import { DashboardMetricsProvider } from "@/context/DashboardMetricsContext";
import {
  DEFAULT_JOB_METRICS,
  DEFAULT_RECRUITER_METRICS,
  normalizeJobSeekerMetrics,
  normalizeRecruiterMetrics,
} from "@/app/dashboard/metricsDefaults";
import type { JobSeekerMetrics, RecruiterMetrics } from "@/types/dashboard";

export default function Dashboard() {
  const { user, logout, loading, needsEmailVerification } = useAuth();
  const {
    hasResume,
    resumeId,
    loading: resumeLoading,
    resume,
    resumes,
    refetch: refreshResume,
  } = useResume();
  const router = useRouter();

  const [userIsRecruiter, setUserIsRecruiter] = useState(false);
  const [jobMetrics, setJobMetrics] = useState<JobSeekerMetrics | null>(null);
  const [recruiterMetrics, setRecruiterMetrics] =
    useState<RecruiterMetrics | null>(null);
  const [jobMetricsLoading, setJobMetricsLoading] = useState(true);
  const [recruiterMetricsLoading, setRecruiterMetricsLoading] = useState(true);

  const recruiterSearchRef = useRef<HTMLDivElement>(null);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/auth");
      router.refresh();
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }, [logout, router]);

  useEffect(() => {
    if (!loading && (!user || needsEmailVerification)) {
      router.push("/auth?mode=verify-email");
    }
  }, [user, loading, needsEmailVerification, router]);

  useEffect(() => {
    const fetchUserStatus = async () => {
      if (!user || needsEmailVerification) {
        setUserIsRecruiter(false);
        return;
      }

      const userId = typeof user.uid === "string" ? user.uid : "";
      if (!userId || typeof user.getIdToken !== "function") {
        setUserIsRecruiter(false);
        return;
      }

      if (typeof fetch !== "function") {
        setUserIsRecruiter(false);
        return;
      }

      try {
        const idToken = await user.getIdToken();
        const response = await fetch(
          `/api/user/settings?userId=${encodeURIComponent(userId)}`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (!response || !response.ok) {
          setUserIsRecruiter(false);
          return;
        }

        const data = await response.json();
        setUserIsRecruiter(Boolean(data?.isRecruiter));
      } catch (error) {
        console.error("Failed to fetch user status:", error);
        setUserIsRecruiter(false);
      }
    };

    fetchUserStatus();
  }, [user, needsEmailVerification]);

  const fetchJobMetrics = useCallback(
    async (signal?: AbortSignal) => {
      const userId =
        typeof user?.uid === "string" && user.uid ? user.uid : null;

      if (!user || !userId || needsEmailVerification) {
        setJobMetrics(null);
        setJobMetricsLoading(false);
        return;
      }
      if (typeof fetch !== "function") {
        setJobMetrics(DEFAULT_JOB_METRICS);
        setJobMetricsLoading(false);
        return;
      }
      setJobMetricsLoading(true);
      try {
        const response = await fetch(
          `/api/jobseeker/metrics?userId=${encodeURIComponent(userId)}`,
          {
            signal,
            cache: "no-store",
          }
        );

        if (!response || !response.ok) {
          throw new Error("Failed to fetch job seeker metrics");
        }

        const data = (await response.json()) as Partial<JobSeekerMetrics>;
        if (!signal?.aborted) {
          setJobMetrics(normalizeJobSeekerMetrics(data));
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("Failed to load job seeker metrics:", error);
        if (!signal?.aborted) {
          setJobMetrics(DEFAULT_JOB_METRICS);
        }
      } finally {
        if (!signal?.aborted) {
          setJobMetricsLoading(false);
        }
      }
    },
    [user, needsEmailVerification]
  );

  const fetchRecruiterMetrics = useCallback(
    async (signal?: AbortSignal) => {
      const userId =
        typeof user?.uid === "string" && user.uid ? user.uid : null;

      if (!user || !userId || !userIsRecruiter || needsEmailVerification) {
        setRecruiterMetrics(userIsRecruiter ? DEFAULT_RECRUITER_METRICS : null);
        setRecruiterMetricsLoading(false);
        return;
      }
      if (typeof fetch !== "function") {
        setRecruiterMetrics(DEFAULT_RECRUITER_METRICS);
        setRecruiterMetricsLoading(false);
        return;
      }
      setRecruiterMetricsLoading(true);
      try {
        const response = await fetch(
          `/api/recruiter/metrics?userId=${encodeURIComponent(userId)}`,
          {
            signal,
            cache: "no-store",
          }
        );

        if (!response || !response.ok) {
          const errorText = await response.text();
          console.error(
            "Recruiter metrics fetch failed:",
            response.status,
            errorText
          );
          throw new Error(
            `Failed to fetch recruiter metrics: ${response.status} ${errorText}`
          );
        }

        const data = (await response.json()) as Partial<RecruiterMetrics>;
        if (!signal?.aborted) {
          setRecruiterMetrics(normalizeRecruiterMetrics(data));
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("Failed to load recruiter metrics:", error);
        if (!signal?.aborted) {
          setRecruiterMetrics(DEFAULT_RECRUITER_METRICS);
        }
      } finally {
        if (!signal?.aborted) {
          setRecruiterMetricsLoading(false);
        }
      }
    },
    [user, userIsRecruiter, needsEmailVerification]
  );

  useEffect(() => {
    if (!user || needsEmailVerification) {
      setJobMetrics(null);
      setJobMetricsLoading(false);
      return;
    }

    const controller = new AbortController();
    fetchJobMetrics(controller.signal);
    return () => controller.abort();
  }, [user, needsEmailVerification, fetchJobMetrics]);

  useEffect(() => {
    if (!userIsRecruiter) {
      setRecruiterMetrics(null);
      setRecruiterMetricsLoading(false);
      return;
    }

    const controller = new AbortController();
    fetchRecruiterMetrics(controller.signal);
    return () => controller.abort();
  }, [userIsRecruiter, fetchRecruiterMetrics]);

  const handleLaunchSearch = useCallback(() => {
    if (recruiterSearchRef.current) {
      recruiterSearchRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  const jobMetricsValue = useMemo(
    () => jobMetrics ?? DEFAULT_JOB_METRICS,
    [jobMetrics]
  );

  const recruiterMetricsValue = useMemo(
    () => recruiterMetrics ?? DEFAULT_RECRUITER_METRICS,
    [recruiterMetrics]
  );
  const refreshJobMetrics = useCallback(
    () => fetchJobMetrics(),
    [fetchJobMetrics]
  );
  const refreshRecruiterMetrics = useCallback(
    () => fetchRecruiterMetrics(),
    [fetchRecruiterMetrics]
  );

  const combinedMetricsLoading =
    jobMetricsLoading || (userIsRecruiter ? recruiterMetricsLoading : false);

  const metricsProviderValue = useMemo(
    () => ({
      loading: combinedMetricsLoading,
      jobSeekerMetrics: jobMetricsValue,
      recruiterMetrics: userIsRecruiter ? recruiterMetricsValue : null,
      refreshJobSeekerMetrics: refreshJobMetrics,
      refreshRecruiterMetrics: userIsRecruiter
        ? refreshRecruiterMetrics
        : undefined,
    }),
    [
      combinedMetricsLoading,
      jobMetricsValue,
      recruiterMetricsValue,
      refreshJobMetrics,
      refreshRecruiterMetrics,
      userIsRecruiter,
    ]
  );

  if (loading) {
    return (
      <DashboardBackground>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-cyan-500/30 border-t-cyan-400"></div>
            <p className="text-lg text-slate-300">Loading your dashboard…</p>
          </div>
        </div>
      </DashboardBackground>
    );
  }

  if (!user || needsEmailVerification) {
    return null;
  }

  return (
    <DashboardBackground>
      <DashboardHeader userEmail={user.email} onLogout={handleLogout} />

      <DashboardMetricsProvider value={metricsProviderValue}>
        <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {userIsRecruiter ? (
            <RecruiterDashboard
              metrics={recruiterMetricsValue}
              metricsLoading={recruiterMetricsLoading}
              onLaunchSearch={handleLaunchSearch}
              searchSectionRef={recruiterSearchRef}
              resumes={resumes}
            />
          ) : (
            <JobSeekerDashboard
              hasResume={hasResume}
              resumeId={resumeId}
              resumeLoading={resumeLoading}
              metrics={jobMetricsValue}
              metricsLoading={jobMetricsLoading}
              resume={resume}
              resumes={resumes}
              onRefreshResume={refreshResume}
            />
          )}
        </main>
      </DashboardMetricsProvider>
    </DashboardBackground>
  );
}
