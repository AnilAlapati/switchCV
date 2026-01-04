"use client";

import { logger } from "@/lib/logger";
// src/app/dashboard/page.tsx

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { JobSeekerDashboard } from "@/components/dashboard/JobSeekerDashboard";
import { RecruiterDashboard } from "@/components/dashboard/RecruiterDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useResume } from "@/hooks/useResume";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { DashboardMetricsProvider } from "@/context/DashboardMetricsContext";
import { getVerificationRoute } from "@/lib/config";

const VERIFICATION_ROUTE = getVerificationRoute();

export default function Dashboard() {
  const {
    user,
    logout,
    loading: authLoading,
    needsEmailVerification,
  } = useAuth();
  const router = useRouter();

  const { role, loading: profileLoading } = useUserProfile();
  const userIsRecruiter = role === "recruiter" || role === "admin";

  const {
    jobSeekerMetrics,
    recruiterMetrics,
    loading: metricsLoading,
    refreshJobSeekerMetrics,
    refreshRecruiterMetrics,
  } = useDashboardMetrics();

  const {
    hasResume,
    resumeId,
    loading: resumeLoading,
    resume,
    resumes,
    refetch: refreshResume,
  } = useResume({ enabled: !authLoading && !!user });

  const recruiterSearchRef = useRef<HTMLDivElement>(null);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/auth");
      router.refresh();
    } catch (error) {
      logger.error({ err: error }, "Failed to log out");
    }
  }, [logout, router]);

  useEffect(() => {
    if (!authLoading && (!user || needsEmailVerification)) {
      router.push(VERIFICATION_ROUTE);
    }
  }, [user, authLoading, needsEmailVerification, router]);

  // Redirect to role selection if user hasn't selected a role yet
  useEffect(() => {
    if (
      !authLoading &&
      !profileLoading &&
      user &&
      !needsEmailVerification &&
      !role
    ) {
      router.push("/select-role");
    }
  }, [authLoading, profileLoading, user, needsEmailVerification, role, router]);

  const handleLaunchSearch = useCallback(() => {
    if (recruiterSearchRef.current) {
      recruiterSearchRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  const metricsProviderValue = useMemo(
    () => ({
      loading: metricsLoading,
      jobSeekerMetrics,
      recruiterMetrics: userIsRecruiter ? recruiterMetrics : null,
      refreshJobSeekerMetrics,
      refreshRecruiterMetrics: userIsRecruiter
        ? refreshRecruiterMetrics
        : undefined,
    }),
    [
      metricsLoading,
      jobSeekerMetrics,
      recruiterMetrics,
      refreshJobSeekerMetrics,
      refreshRecruiterMetrics,
      userIsRecruiter,
    ]
  );

  const isPostBootLoading = authLoading || (user && profileLoading);

  // Don't show anything while checking auth
  if (authLoading) {
    return (
      <DashboardBackground>
        <div className="relative z-20 flex min-h-screen items-center justify-center">
          <div className="rounded-lg bg-black/60 px-8 py-6 text-center backdrop-blur-sm">
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-cyan-500/30 border-t-cyan-400"></div>
            <p className="text-lg font-semibold text-white">
              Loading your dashboard…
            </p>
          </div>
        </div>
      </DashboardBackground>
    );
  }

  if (!user || needsEmailVerification) {
    return null;
  }

  // Show loading while redirecting to role selection
  if (!role) {
    return null; // Let the useEffect handle the redirect to /select-role
  }

  return (
    <DashboardBackground>
      <DashboardHeader
        userEmail={user.email}
        onLogout={handleLogout}
        userRole={role}
      />

      <DashboardMetricsProvider value={metricsProviderValue}>
        <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {userIsRecruiter ? (
            <RecruiterDashboard
              metrics={recruiterMetrics}
              metricsLoading={metricsLoading}
              onLaunchSearch={handleLaunchSearch}
              searchSectionRef={recruiterSearchRef}
              resumes={resumes}
            />
          ) : (
            <JobSeekerDashboard
              hasResume={hasResume}
              resumeId={resumeId}
              resumeLoading={resumeLoading}
              metrics={jobSeekerMetrics}
              metricsLoading={metricsLoading}
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
