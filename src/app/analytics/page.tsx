"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { logger } from "@/lib/logger";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

interface SystemAnalytics {
  totalUsers: number;
  totalResumes: number;
  activeRecruiters: number;
  totalViews: number;
  totalContactRequests: number;
  averageAttractiveness: number;
  topIndustries: Array<{ name: string; count: number }>;
  recentActivity: Array<{ type: string; timestamp: string; description: string }>;
  subscriptionDistribution: {
    basic: number;
    premium: number;
    enterprise: number;
  };
}

export default function AnalyticsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { role, loading: roleLoading } = useUserProfile();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch("/api/analytics/system", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You do not have permission to view analytics.");
        }
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      logger.error({ err }, "Failed to fetch analytics");
      setError(err instanceof Error ? err.message : "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && role && (role === "admin" || role === "recruiter")) {
      fetchAnalytics();
    }
  }, [user, role, fetchAnalytics]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/auth");
    } catch (err) {
      logger.error({ err }, "Logout failed");
    }
  };

  if (authLoading || roleLoading) {
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
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Platform Overview
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-[#1A2F25] tracking-tight">
            System Analytics
          </h1>
          <p className="mt-2 text-[#1A2F25]/60 max-w-2xl">
            Real-time insights into platform performance, user engagement, and resume metrics.
          </p>
        </div>

        {loading && (
          <div className="glass-panel rounded-2xl p-20 flex flex-col items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-500 mb-4"></div>
            <p className="text-[#1A2F25]/60 font-medium">Crunching platform data...</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-red-900 mb-1">Failed to Load Data</h3>
            <p className="text-red-700/80 mb-6">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="inline-flex items-center px-6 py-3 border border-red-200 bg-white text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors shadow-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && analytics && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Primary Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Users"
                value={analytics.totalUsers.toLocaleString()}
                icon="👥"
                trend="+12%"
                color="blue"
              />
              <MetricCard
                title="Total Resumes"
                value={analytics.totalResumes.toLocaleString()}
                icon="📄"
                trend="+8%"
                color="cyan"
              />
              <MetricCard
                title="Active Recruiters"
                value={analytics.activeRecruiters.toLocaleString()}
                icon="🎯"
                trend="+5%"
                color="emerald"
              />
              <MetricCard
                title="Total Views"
                value={analytics.totalViews.toLocaleString()}
                icon="👁️"
                trend="+18%"
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
                  trend="+15%"
                  color="purple"
                />

                <MetricCard
                  title="Avg Attractiveness"
                  value={`${analytics.averageAttractiveness}%`}
                  icon="⭐"
                  trend="+3.2%"
                  color="amber"
                />

                <div className="glass-panel rounded-2xl p-6 border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A2F25]/60">
                      Subscription Tiers
                    </h3>
                    <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      💳
                    </div>
                  </div>
                  <div className="space-y-4">
                    <TierBar label="Basic" count={analytics.subscriptionDistribution.basic} total={analytics.totalUsers} color="bg-slate-400" />
                    <TierBar label="Premium" count={analytics.subscriptionDistribution.premium} total={analytics.totalUsers} color="bg-indigo-500" />
                    <TierBar label="Enterprise" count={analytics.subscriptionDistribution.enterprise} total={analytics.totalUsers} color="bg-emerald-500" />
                  </div>
                </div>
              </div>

              {/* Data Visualization Sections */}
              <div className="lg:col-span-2 space-y-8">
                <div className="glass-panel rounded-2xl p-6 border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A2F25]/60 flex items-center">
                      <span className="mr-2 h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
                      Top Industries
                    </h3>
                    <span className="text-[10px] font-bold text-[#1A2F25]/40 uppercase tracking-widest">
                      Volume per Market
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analytics.topIndustries.map((industry, index) => (
                      <div key={industry.name} className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-slate-100/50">
                        <div className="flex items-center">
                          <span className="text-xs font-bold text-slate-300 w-5">{(index + 1).toString().padStart(2, '0')}</span>
                          <span className="text-sm font-semibold text-[#1A2F25] ml-2">{industry.name}</span>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded-md bg-cyan-50 text-cyan-700">
                          {industry.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-6 border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A2F25]/60 flex items-center">
                      <span className="mr-2 h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                      Recent Platform Activity
                    </h3>
                    <span className="text-[10px] font-bold text-[#1A2F25]/40 uppercase tracking-widest">
                      Live Pulse
                    </span>
                  </div>
                  <div className="space-y-4">
                    {analytics.recentActivity.map((activity, index) => (
                      <div key={index} className="relative pl-6 pb-4 border-l border-slate-200 last:pb-0">
                        <div className="absolute top-0 left-[-4.5px] h-2 w-2 rounded-full bg-blue-500"></div>
                        <p className="text-sm font-semibold text-[#1A2F25]">
                          {activity.description}
                        </p>
                        <p className="text-[10px] font-bold text-[#1A2F25]/40 uppercase mt-1">
                          {new Date(activity.timestamp).toLocaleString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: 'numeric',
                            month: 'short'
                          })}
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

function MetricCard({ title, value, icon, trend, color }: {
  title: string;
  value: string;
  icon: string;
  trend: string;
  color: 'blue' | 'cyan' | 'emerald' | 'indigo' | 'purple' | 'amber';
}) {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    cyan: 'text-cyan-600 bg-cyan-50 border-cyan-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    purple: 'text-purple-600 bg-purple-50 border-purple-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm group hover:border-blue-300 transition-all">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A2F25]/60">{title}</h3>
        <span className={`h-10 w-10 flex items-center justify-center rounded-xl text-xl border ${colorMap[color]}`}>{icon}</span>
      </div>
      <div className="flex items-baseline gap-3">
        <p className="text-3xl font-extrabold text-[#1A2F25]">{value}</p>
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
          {trend}
        </span>
      </div>
    </div>
  );
}

function TierBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-[#1A2F25]/70">{label}</span>
        <span className="text-[#1A2F25]">{count} <span className="text-[#1A2F25]/40 text-[10px]">({percentage.toFixed(0)}%)</span></span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-1000`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
