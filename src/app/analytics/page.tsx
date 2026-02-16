"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSystemAnalytics } from "@/hooks/useSystemAnalytics";
import { logger } from "@/lib/logger";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AnalyticsPageSkeleton } from "@/components/analytics/AnalyticsSkeleton";
import { RecruiterAnalyticsView } from "@/components/analytics/RecruiterAnalyticsView";

import {
  MetricCard,
  TierBar,
  IndustryDistribution,
  RecentActivity
} from "@/components/analytics/AnalyticsComponents";

export default function AnalyticsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { role, loading: roleLoading } = useUserProfile();
  const router = useRouter();

  // Use SWR hook for analytics data with caching
  // Fetch platform-wide analytics only for admins
  const canFetchPlatformAnalytics =
    !authLoading &&
    !roleLoading &&
    !!user &&
    role === "admin";
  const {
    analytics,
    loading: analyticsLoading,
    error,
    refresh,
  } = useSystemAnalytics(canFetchPlatformAnalytics);

  // General check for ANY analytics access (admin or recruiter)
  const hasPageAccess =
    !authLoading &&
    !roleLoading &&
    !!user &&
    (role === "admin" || role === "recruiter");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
      return;
    }

    // Only admins and recruiters can access this page
    if (!roleLoading && role && role !== "admin" && role !== "recruiter") {
      router.push("/dashboard");
      return;
    }
  }, [user, authLoading, role, roleLoading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/auth");
    } catch (err) {
      logger.error({ err }, "Logout failed");
    }
  };

  // Only block on auth check, not on data loading
  if (authLoading) {
    return (
      <DashboardBackground>
        <div className="flex min-h-screen items-center justify-center">
          <div className="rounded-lg bg-black/5 px-8 py-6 text-center backdrop-blur-sm">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-500"></div>
            <p className="text-[#1A2F25] font-medium">Authenticating...</p>
          </div>
        </div>
      </DashboardBackground>
    );
  }

  if (!user || (!roleLoading && role !== "admin" && role !== "recruiter")) {
    return null;
  }

  return (
    <DashboardBackground>
      <DashboardHeader
        userEmail={user.email}
        onLogout={handleLogout}
        userRole={role}
      />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {role === "recruiter" ? (
          <RecruiterAnalyticsView />
        ) : (
          <>
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 bg-black border border-black"></div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Platform Overview
                </span>
              </div>
              <h1 className="text-4xl font-bold font-serif text-slate-900 tracking-tight">
                System Analytics
              </h1>
              <p className="mt-2 text-slate-600 max-w-2xl font-serif">
                Real-time insights into platform performance, user engagement, and
                resume metrics.
              </p>
            </div>

            {/* Show skeleton while initial data is loading */}
            {analyticsLoading && !analytics && <AnalyticsPageSkeleton />}

            {error && (
              <div className="rounded-lg border-2 border-red-600 bg-red-50 p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4 border-2 border-red-200">
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
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-red-900 mb-1 font-serif">
                  Failed to Load Data
                </h3>
                <p className="text-red-700/80 mb-6">{error}</p>
                <button
                  onClick={() => refresh()}
                  className="inline-flex items-center px-6 py-3 border-2 border-red-200 bg-white text-red-600 rounded-lg font-bold hover:bg-red-50 transition-colors shadow-[4px_4px_0px_0px_rgba(254,202,202,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                  Try Again
                </button>
              </div>
            )}

            {!analyticsLoading && !error && analytics && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Primary Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="Total Users"
                    value={analytics.totalUsers.toLocaleString()}
                    icon="👥"
                    trend="Live"
                    color="blue"
                  />
                  <MetricCard
                    title="Total Resumes"
                    value={analytics.totalResumes.toLocaleString()}
                    icon="📄"
                    trend="Live"
                    color="cyan"
                  />
                  <MetricCard
                    title="Active Recruiters"
                    value={analytics.activeRecruiters.toLocaleString()}
                    icon="🎯"
                    trend="Live"
                    color="emerald"
                  />
                  <MetricCard
                    title="Total Views"
                    value={analytics.totalViews.toLocaleString()}
                    icon="👁️"
                    trend="Live"
                    color="indigo"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Secondary Metrics & Distribution */}
                  <div className="lg:col-span-1 space-y-6">
                    <MetricCard
                      title="Contact Requests"
                      value={analytics.totalContactRequests.toLocaleString()}
                      icon="✉️"
                      trend="Live"
                      color="purple"
                    />

                    <MetricCard
                      title="Avg Attractiveness"
                      value={`${analytics.averageAttractiveness}%`}
                      icon="⭐"
                      trend="Score"
                      color="amber"
                    />

                    <div className="rounded-xl p-6 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                          Subscription Tiers
                        </h3>
                        <div className="h-8 w-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                          💳
                        </div>
                      </div>
                      <div className="space-y-4">
                        <TierBar
                          label="Basic"
                          count={analytics.subscriptionDistribution.basic}
                          total={analytics.totalUsers}
                          color="bg-slate-400"
                        />
                        <TierBar
                          label="Premium"
                          count={analytics.subscriptionDistribution.premium}
                          total={analytics.totalUsers}
                          color="bg-indigo-600"
                        />
                        <TierBar
                          label="Enterprise"
                          count={analytics.subscriptionDistribution.enterprise}
                          total={analytics.totalUsers}
                          color="bg-emerald-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Data Visualization Sections */}
                  <div className="lg:col-span-2 space-y-8">
                    <IndustryDistribution industries={analytics.topIndustries} />
                    <RecentActivity activities={analytics.recentActivity} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </DashboardBackground>
  );
}

