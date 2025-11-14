// src/components/AnalyticsDashboard.tsx
/**
 * Analytics Dashboard Component
 * Displays view counts, engagement metrics, and request statistics
 */

"use client";

import { useEffect, useState } from "react";
import { Analytics, EngagementMetrics, RequestStatistics } from "@/types";

interface AnalyticsDashboardProps {
  resumeId: string;
  slug?: string;
  showDetails?: boolean;
}

export function AnalyticsDashboard({
  resumeId,
  slug,
  showDetails = true,
}: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [engagement, setEngagement] = useState<EngagementMetrics | null>(null);
  const [requests, setRequests] = useState<RequestStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [resumeId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/profiles/analytics?resumeId=${resumeId}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setAnalytics(null);
          setEngagement(null);
          setRequests(null);
          setError(null);
          return;
        }
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setAnalytics(data.analytics);
      setEngagement(data.engagement);
      setRequests(data.requests);
      setError(null);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg border border-gray-700 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
        <p className="text-gray-400 text-sm">No analytics data available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Views */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-blue-500 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Total Views</p>
            <span className="text-blue-400 text-xl">👁️</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {analytics.views.count.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs">
            {analytics.views.uniqueViewers} unique viewers
          </p>
        </div>

        {/* Unique Visitors */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-green-500 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Unique Visitors</p>
            <span className="text-green-400 text-xl">👥</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {analytics.views.uniqueViewers.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs">Individual viewers</p>
        </div>

        {/* Avg Session Duration */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-purple-500 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Avg Session</p>
            <span className="text-purple-400 text-xl">⏱️</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {analytics.views.avgSessionDuration.toFixed(0)}s
          </p>
          <p className="text-gray-500 text-xs">average time spent</p>
        </div>

        {/* Total Interactions */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-orange-500 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Total Interactions</p>
            <span className="text-orange-400 text-xl">⚡</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {analytics.totalInteractions.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs">views + requests + approvals</p>
        </div>
      </div>

      {/* Request Statistics */}
      {requests && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <span className="mr-2">📋</span>
            Access Requests
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Total Requests</p>
              <p className="text-2xl font-bold text-white">
                {requests.totalRequests}
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-400">
                {requests.approvedRequests}
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">
                {requests.pendingRequests}
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Denied</p>
              <p className="text-2xl font-bold text-red-400">
                {requests.deniedRequests}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Referrers */}
      {Object.keys(analytics.views.topReferrers).length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <span className="mr-2">🔗</span>
            Top Referrers
          </h3>
          <div className="space-y-3">
            {Object.entries(analytics.views.topReferrers)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([referrer, count]) => (
                <div
                  key={referrer}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center flex-1">
                    <span className="text-blue-400 mr-3">→</span>
                    <span className="text-gray-300 text-sm truncate">
                      {referrer || "Direct"}
                    </span>
                  </div>
                  <span className="text-white font-semibold ml-4">
                    {count} view{count !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Engagement Metrics */}
      {engagement && showDetails && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <span className="mr-2">📊</span>
            Engagement Details
          </h3>
          <div className="space-y-4">
            {engagement.viewsBySource && (
              <div>
                <p className="text-gray-400 text-sm mb-3">Views by Source</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Object.entries(engagement.viewsBySource).map(
                    ([source, count]) => (
                      <div
                        key={source}
                        className="bg-gray-700 rounded-lg p-3 text-center"
                      >
                        <p className="text-gray-400 text-xs capitalize mb-1">
                          {source}
                        </p>
                        <p className="text-xl font-bold text-white">{count}</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-xs text-gray-500 text-right">
        Last updated:{" "}
        {new Date(analytics.lastUpdatedAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
}

/**
 * Compact version for dashboard cards
 */
export function AnalyticsCard({ resumeId }: { resumeId: string }) {
  const [views, setViews] = useState(0);
  const [requests, setRequests] = useState(0);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(
          `/api/profiles/analytics?resumeId=${resumeId}`
        );
        if (response.ok) {
          const data = await response.json();
          setViews(data.analytics?.views?.count || 0);
          setRequests(data.requests?.totalRequests || 0);
        }
      } catch (error) {
        console.error("Error fetching metrics:", error);
      }
    };

    fetchMetrics();
  }, [resumeId]);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm">Performance</span>
        <span className="text-lg">📈</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-white">{views}</p>
          <p className="text-xs text-gray-500">views</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-400">{requests}</p>
          <p className="text-xs text-gray-500">requests</p>
        </div>
      </div>
    </div>
  );
}
