// src/components/AnalyticsDashboard.tsx
/**
 * Analytics Dashboard Component
 * Displays view counts, engagement metrics, and request statistics
 */

"use client";

import { useEffect, useState } from "react";
import { Analytics, EngagementMetrics, RequestStatistics } from "@/types";
import { AnalyticsMetrics } from "@/components/analytics/AnalyticsMetrics";
import { RequestStatistics as RequestStatsComponent } from "@/components/analytics/RequestStatistics";
import { TopReferrers } from "@/components/analytics/TopReferrers";
import { EngagementDetails } from "@/components/analytics/EngagementDetails";

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
      <AnalyticsMetrics analytics={analytics} />

      {requests && <RequestStatsComponent requests={requests} />}

      <TopReferrers referrers={analytics.views.topReferrers} />

      {engagement && showDetails && <EngagementDetails engagement={engagement} />}

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
