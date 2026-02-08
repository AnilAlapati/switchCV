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
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { ResumeScoreCard } from "@/components/analytics/ResumeScoreCard";
import { InboundInterestsCard } from "@/components/analytics/InboundInterestsCard";
import { ActivityPulseFeed } from "@/components/analytics/ActivityPulseFeed";
import type { Analytics, AnalyticsEvent } from "@/types";

export default function ResumeAnalyticsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { tier } = useTier();
  const router = useRouter();
  const params = useParams();
  const resumeId = params?.resumeId as string;

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);
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
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50/80 px-4 py-1.5 border border-blue-100/50 backdrop-blur-sm shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-[10px] font-black text-blue-700 uppercase tracking-[0.2em]">
              Alpha-Beta Preview v0.4.2
            </span>
          </div>
        </div>

        <AnalyticsHeader
          resumeTitle={resumeTitle}
          tier={tier}
          loading={loading}
          onRefresh={fetchAnalytics}
        />

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
            <AnalyticsMetrics analytics={analytics} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {analytics.engagement && (
                <div className="glass-panel rounded-2xl border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm overflow-hidden text-[#1A2F25]">
                  <EngagementDetails engagement={analytics.engagement} />
                </div>
              )}

              {analytics.requests && (
                <div className="glass-panel rounded-2xl border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm overflow-hidden text-[#1A2F25]">
                  <RequestStatistics requests={analytics.requests} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 glass-panel rounded-2xl border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm overflow-hidden text-[#1A2F25]">
                <TopReferrers referrers={analytics.views.topReferrers} />
              </div>

              <ResumeScoreCard analytics={analytics} />

              {analytics.demographics && (
                <InboundInterestsCard demographics={analytics.demographics} />
              )}
            </div>

            <ActivityPulseFeed recentEvents={recentEvents} />
          </div>
        )}
      </main>
    </DashboardBackground>
  );
}
