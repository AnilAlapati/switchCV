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
import {
  DashboardMetricsProvider,
  type DashboardMetricsContextValue,
} from "@/context/DashboardMetricsContext";
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

  const { role, loading: profileLoading, profile } = useUserProfile();
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
    // Google/OAuth users with pending admin approval must be sent back to /auth
    // (profile must be loaded first to avoid a flash-redirect before we know the status)
    if (
      !authLoading &&
      !profileLoading &&
      user &&
      profile?.approvalStatus === "pending"
    ) {
      router.push(VERIFICATION_ROUTE);
    }
  }, [
    user,
    authLoading,
    profileLoading,
    profile,
    needsEmailVerification,
    router,
  ]);

  // Redirect to role selection if user hasn't selected a role yet
  // (only for approved users — pending users are redirected to /auth above)
  useEffect(() => {
    if (
      !authLoading &&
      !profileLoading &&
      user &&
      !needsEmailVerification &&
      profile?.approvalStatus !== "pending" &&
      !role
    ) {
      router.push("/select-role");
    }
  }, [
    authLoading,
    profileLoading,
    user,
    needsEmailVerification,
    profile,
    role,
    router,
  ]);

  const metricsProviderValue: DashboardMetricsContextValue = useMemo(
    () => ({
      loading: metricsLoading,
      jobSeekerMetrics,
      recruiterMetrics: userIsRecruiter ? recruiterMetrics : null,
      refreshJobSeekerMetrics: refreshJobSeekerMetrics as () => Promise<void>,
      refreshRecruiterMetrics: userIsRecruiter
        ? (refreshRecruiterMetrics as () => Promise<void>)
        : undefined,
    }),
    [
      metricsLoading,
      jobSeekerMetrics,
      recruiterMetrics,
      refreshJobSeekerMetrics,
      refreshRecruiterMetrics,
      userIsRecruiter,
    ],
  );

  // Don't show anything while checking auth
  if (authLoading) {
    return (
      <DashboardBackground>
        <div className="relative z-20 flex min-h-screen items-center justify-center">
          <div className="bg-white border border-gray-200 px-8 py-6 text-center shadow-lg">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
            <p className="text-lg font-serif font-bold text-black tracking-tight">
              Loading dashboard...
            </p>
          </div>
        </div>
      </DashboardBackground>
    );
  }

  if (
    !user ||
    needsEmailVerification ||
    profile?.approvalStatus === "pending"
  ) {
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
              resumes={resumes}
            />
          ) : (
            <JobSeekerDashboard
              hasResume={hasResume}
              resumeId={resumeId}
              resumeLoading={resumeLoading}
              metrics={jobSeekerMetrics}
              metricsLoading={metricsLoading}
              resume={resume || undefined}
              resumes={resumes}
              onRefreshResume={refreshResume}
            />
          )}
        </main>
      </DashboardMetricsProvider>
    </DashboardBackground>
  );
}
