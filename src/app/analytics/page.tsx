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

export default function AnalyticsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { role, loading: roleLoading } = useUserProfile();
  const router = useRouter();

  // Use SWR hook for analytics data with caching
  const canFetchAnalytics =
    !authLoading &&
    !roleLoading &&
    !!user &&
    (role === "admin" || role === "recruiter");
  const {
    analytics,
    loading: analyticsLoading,
    error,
    refresh,
  } = useSystemAnalytics(canFetchAnalytics);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
      return;
    }

    // Only admins and recruiters can access analytics
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

  if (!user || (role !== "admin" && role !== "recruiter")) {
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
                <div className="rounded-xl p-6 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center">
                      <span className="mr-2 h-2 w-2 bg-cyan-600 border border-black"></span>
                      Top Industries
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 px-2 py-1 rounded">
                      Volume per Market
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analytics.topIndustries.map((industry, index) => (
                      <div
                        key={industry.name}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border-2 border-slate-200 hover:border-black transition-colors"
                      >
                        <div className="flex items-center">
                          <span className="text-xs font-bold text-slate-400 w-6 font-mono">
                            {(index + 1).toString().padStart(2, "0")}
                          </span>
                          <span className="text-sm font-bold text-slate-900 ml-1">
                            {industry.name}
                          </span>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded border border-cyan-200 bg-cyan-50 text-cyan-700">
                          {industry.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl p-6 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center">
                      <span className="mr-2 h-2 w-2 bg-purple-600 border border-black"></span>
                      Recent Platform Activity
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 px-2 py-1 rounded">
                      Live Pulse
                    </span>
                  </div>
                  <div className="space-y-4">
                    {analytics.recentActivity.map((activity, index) => (
                      <div
                        key={index}
                        className="relative pl-6 pb-4 border-l-2 border-slate-200 last:pb-0"
                      >
                        <div className="absolute top-0 left-[-5px] h-2 w-2 bg-blue-600 border border-black"></div>
                        <p className="text-sm font-bold text-slate-900">
                          {activity.description}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 font-mono">
                          {new Date(activity.timestamp).toLocaleString(
                            undefined,
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "numeric",
                              month: "short",
                            }
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </DashboardBackground>
  );
}

function MetricCard({
  title,
  value,
  icon,
  trend,
  color,
}: {
  title: string;
  value: string;
  icon: string;
  trend: string;
  color: "blue" | "cyan" | "emerald" | "indigo" | "purple" | "amber";
}) {
  const colorMap = {
    blue: "text-blue-600 border-blue-200 bg-blue-50",
    cyan: "text-cyan-600 border-cyan-200 bg-cyan-50",
    emerald: "text-emerald-600 border-emerald-200 bg-emerald-50",
    indigo: "text-indigo-600 border-indigo-200 bg-indigo-50",
    purple: "text-purple-600 border-purple-200 bg-purple-50",
    amber: "text-amber-600 border-amber-200 bg-amber-50",
  };

  return (
    <div className="group rounded-xl p-6 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {title}
        </h3>
        <span
          className={`h-10 w-10 flex items-center justify-center rounded-lg text-xl border-2 ${colorMap[color]}`}
        >
          {icon}
        </span>
      </div>
      <div className="flex items-baseline gap-3">
        <p className="text-3xl font-bold font-serif text-slate-900">{value}</p>
        <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
          {trend}
        </span>
      </div>
    </div>
  );
}

function TierBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-slate-600 uppercase tracking-widest">{label}</span>
        <span className="text-slate-900 font-mono">
          {count}{" "}
          <span className="text-slate-400 text-[10px]">
            ({percentage.toFixed(0)}%)
          </span>
        </span>
      </div>
      <div className="h-3 w-full bg-slate-100 border border-slate-200 rounded-sm overflow-hidden">
        <div
          className={`h-full ${color} border-r border-black transition-all duration-1000`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
