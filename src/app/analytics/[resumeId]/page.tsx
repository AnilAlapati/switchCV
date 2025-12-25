"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { logger } from "@/lib/logger";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AnalyticsMetrics } from "@/components/analytics/AnalyticsMetrics";
import { EngagementDetails } from "@/components/analytics/EngagementDetails";
import { RequestStatistics } from "@/components/analytics/RequestStatistics";
import { TopReferrers } from "@/components/analytics/TopReferrers";
import type { Analytics } from "@/types";

export default function ResumeAnalyticsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { tier } = useTier();
  const router = useRouter();
  const params = useParams();
  const resumeId = params?.resumeId as string;

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumeTitle, setResumeTitle] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
      return;
    }
  }, [user, authLoading, router]);

  const fetchAnalytics = useCallback(async () => {
    if (!user || !resumeId) return;

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch(
        `/api/profiles/analytics?resumeId=${resumeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API returned ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        if (response.status === 403) {
          throw new Error("You don't have permission to view these analytics");
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // The API returns { analytics, engagement, requests, resumeId }
      // We want to combine them into the Analytics type from @/types
      const analyticsData: Analytics = {
        ...data.analytics,
        engagement: data.engagement || undefined,
        requests: data.requests || undefined,
        demographics: data.analytics?.demographics,
      };

      setAnalytics(analyticsData);
      setRecentEvents(data.recentEvents || []);
      setResumeTitle(data.resumeTitle || `Resume #${resumeId}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error(
        { err, resumeId, errorMsg },
        "Failed to fetch resume analytics"
      );
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [user, resumeId]);

  useEffect(() => {
    if (user && resumeId) {
      fetchAnalytics();
    }
  }, [user, resumeId, fetchAnalytics]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/auth");
    } catch (err) {
      logger.error({ err }, "Logout failed");
    }
  };

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

  if (!user) {
    return null;
  }

  return (
    <DashboardBackground>
      <DashboardHeader userEmail={user.email} onLogout={handleLogout} />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Beta Badge Section */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50/80 px-4 py-1.5 border border-blue-100/50 backdrop-blur-sm shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-[10px] font-black text-blue-700 uppercase tracking-[0.2em]">
              Alpha-Beta Preview v0.4.2
            </span>
          </div>
        </div>

        <div className="mb-10">
          <button
            onClick={() => router.push("/dashboard")}
            className="group mb-6 flex items-center gap-2 text-sm font-bold text-blue-600 transition-colors hover:text-blue-700"
          >
            <span className="transition-transform group-hover:-translate-x-1">
              ←
            </span>
            Back to Dashboard
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-cyan-500"></div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-600">
              Resume Analysis
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-extrabold text-[#1A2F25] tracking-tight">
                {resumeTitle}
              </h1>
              <p className="mt-2 text-[#1A2F25]/60 max-w-2xl">
                Detailed performance metrics and engagement signals for this
                profile.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                disabled={tier === "basic"}
                title={
                  tier === "basic"
                    ? "Available for Premium/Enterprise users"
                    : "Download Report"
                }
                className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#1A2F25] shadow-sm transition-all active:scale-95 ${
                  tier === "basic"
                    ? "opacity-40 cursor-not-allowed group relative"
                    : "hover:bg-slate-50"
                }`}
              >
                <span>📥</span> Download Report
                {tier === "basic" && (
                  <span className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 rounded bg-gray-900 px-3 py-1.5 text-[10px] text-white group-hover:scale-100 transition-all shadow-xl whitespace-nowrap z-50">
                    Premium/Enterprise Only
                  </span>
                )}
              </button>
              <button
                onClick={fetchAnalytics}
                disabled={loading || tier === "basic"}
                title={
                  tier === "basic"
                    ? "Available for Premium/Enterprise users"
                    : "Refresh Data"
                }
                className={`flex items-center gap-2 rounded-xl bg-[#1A2F25] px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                  tier === "basic"
                    ? "opacity-40 cursor-not-allowed group relative"
                    : "hover:bg-black"
                }`}
              >
                <span>🔄</span> {loading ? "Refreshing..." : "Refresh Data"}
                {tier === "basic" && (
                  <span className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 rounded bg-gray-900 px-3 py-1.5 text-[10px] text-white group-hover:scale-100 transition-all shadow-xl whitespace-nowrap z-50">
                    Premium/Enterprise Only
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {loading && !analytics && (
          <div className="glass-panel rounded-2xl p-20 flex flex-col items-center justify-center border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-500 mb-4"></div>
            <p className="text-[#1A2F25]/60 font-medium">
              Analyzing resume performance...
            </p>
          </div>
        )}

        {error && (
          <div className="glass-panel rounded-2xl border border-red-200 bg-red-50/50 p-10 text-center backdrop-blur-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4 shadow-sm">
              <svg
                className="h-8 w-8"
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
            <h3 className="text-xl font-bold text-red-900 mb-2">
              Something went wrong
            </h3>
            <p className="text-red-700/80 mb-8 max-w-md mx-auto">{error}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={fetchAnalytics}
                className="inline-flex items-center justify-center px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-md active:scale-95"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center justify-center px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              >
                Go Home
              </button>
            </div>
          </div>
        )}

        {!loading && !error && analytics && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Key Metrics Dashboard */}
            <AnalyticsMetrics analytics={analytics} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Engagement Heartbeat */}
              {analytics.engagement && (
                <div className="glass-panel rounded-2xl border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm overflow-hidden">
                  <EngagementDetails engagement={analytics.engagement} />
                </div>
              )}

              {/* Inquiry Funnel */}
              {analytics.requests && (
                <div className="glass-panel rounded-2xl border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm overflow-hidden text-[#1A2F25]">
                  <RequestStatistics requests={analytics.requests} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Traffic Sources */}
              <div className="lg:col-span-1 glass-panel rounded-2xl border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm overflow-hidden">
                <TopReferrers referrers={analytics.views.topReferrers} />
              </div>

              {/* Attractiveness IQ */}
              <div className="lg:col-span-1 glass-panel rounded-2xl p-8 border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-[#1A2F25]">
                      Resume Score
                    </h2>
                    <span className="text-xl">⭐</span>
                  </div>
                  <p className="text-[#1A2F25]/60 text-sm mb-8">
                    AI-calculated score based on views, depth of engagement, and
                    recruiter intent.
                  </p>
                </div>

                <div className="text-center py-6">
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="h-32 w-32 transform -rotate-90">
                      <circle
                        className="text-slate-100"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="transparent"
                        r="58"
                        cx="64"
                        cy="64"
                      />
                      <circle
                        className="text-indigo-500 transition-all duration-1000 ease-out"
                        strokeWidth="8"
                        strokeDasharray={364}
                        strokeDashoffset={
                          364 -
                          (364 *
                            Math.min(
                              100,
                              Math.round(
                                (analytics.views.count * 0.5 +
                                  (analytics.requests?.totalRequests || 0) *
                                    10 +
                                  (analytics.engagement?.avgSessionDuration ||
                                    0) *
                                    0.1) /
                                  2
                              ) || 0
                            )) /
                            100
                        }
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="58"
                        cx="64"
                        cy="64"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-4xl font-black text-[#1A2F25]">
                        {Math.min(
                          100,
                          Math.round(
                            (analytics.views.count * 0.5 +
                              (analytics.requests?.totalRequests || 0) * 10 +
                              (analytics.engagement?.avgSessionDuration || 0) *
                                0.1) /
                              2
                          ) || 0
                        )}
                      </span>
                      <span className="text-[10px] font-bold text-[#1A2F25]/40 uppercase tracking-widest">
                        Score
                      </span>
                    </div>
                  </div>
                  <p className="text-emerald-600 text-xs font-bold mt-4 flex items-center justify-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Data Pulse
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[10px] text-center text-[#1A2F25]/40 font-bold uppercase tracking-widest leading-relaxed">
                    Powered by Live Analytics Engine
                  </p>
                </div>
              </div>

              {/* Geo/Industry IQ */}
              <div className="lg:col-span-1 space-y-8">
                {analytics.demographics && (
                  <div className="glass-panel rounded-2xl p-6 border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm h-full">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A2F25]/60 mb-6 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                      Top Inbound Interests
                    </h3>

                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-black text-[#1A2F25]/30 uppercase tracking-widest mb-3">
                          Industries
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {analytics.demographics.topIndustries.map(
                            (industry) => (
                              <span
                                key={industry}
                                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100/50"
                              >
                                {industry}
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-[#1A2F25]/30 uppercase tracking-widest mb-3">
                          Markets
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {analytics.demographics.topLocations.map(
                            (location) => (
                              <span
                                key={location}
                                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100/50"
                              >
                                {location}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Feed */}
            <div className="glass-panel rounded-2xl p-8 border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-extrabold text-[#1A2F25] tracking-tight flex items-center gap-3">
                    Recent Activity Pulse
                  </h2>
                  <p className="text-[#1A2F25]/60 text-sm mt-1">
                    Direct visibility into who is engaging with your profile.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 border border-emerald-100">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    Live Monitoring
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {recentEvents.length > 0 ? (
                  recentEvents.map((event, index) => (
                    <div
                      key={event.eventId || index}
                      className="group flex items-center justify-between p-4 rounded-xl transition-all hover:bg-white/60 hover:shadow-sm border border-transparent hover:border-slate-100"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm border ${
                            event.eventType === "view"
                              ? "bg-blue-50 text-blue-600 border-blue-100"
                              : event.eventType === "request"
                              ? "bg-amber-50 text-amber-600 border-amber-100"
                              : "bg-emerald-50 text-emerald-600 border-emerald-100"
                          }`}
                        >
                          {event.eventType === "view"
                            ? "👁️"
                            : event.eventType === "request"
                            ? "📋"
                            : "✅"}
                        </div>
                        <div>
                          <p className="text-[#1A2F25] font-bold capitalize">
                            {event.eventType} Event
                          </p>
                          <p className="text-[#1A2F25]/50 text-xs font-medium">
                            {event.metadata?.source
                              ? `Via ${event.metadata.source}`
                              : "Direct Source"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[#1A2F25] text-xs font-bold">
                          {new Date(event.timestamp).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" }
                          )}
                        </p>
                        <p className="text-[#1A2F25]/40 text-[10px] font-bold uppercase mt-0.5">
                          {new Date(event.timestamp).toLocaleTimeString(
                            undefined,
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-3xl mb-4">🌑</p>
                    <h4 className="text-lg font-bold text-[#1A2F25] mb-2">
                      The pulse is quiet
                    </h4>
                    <p className="text-[#1A2F25]/50 text-sm max-w-xs mx-auto">
                      No recent events have been recorded. Share your profile to
                      start seeing live signals.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </DashboardBackground>
  );
}
