// React Hook for Analytics Dashboard State Management

"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  AnalyticsDashboard,
  ResumeAnalytics,
  SectionHeatmap,
  RecruiterEngagement,
} from "@/lib/analytics.types";
import { AnalyticsService } from "@/lib/analytics.service";

/**
 * Hook state interface
 */
interface UseAnalyticsState {
  dashboard: AnalyticsDashboard | null;
  loading: boolean;
  error: Error | null;
  isRefreshing: boolean;
}

/**
 * Hook return interface
 */
interface UseAnalyticsReturn extends UseAnalyticsState {
  fetchDashboard: (resumeId: string, userId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  updateMetrics: (updates: Partial<ResumeAnalytics>) => void;
  getTopSections: () => SectionHeatmap[];
  getTopRecruiters: () => RecruiterEngagement[];
  compareWithBenchmark: () => Record<string, number> | null;
  exportData: (format: "json" | "csv") => string;
}

/**
 * Advanced Analytics Dashboard Hook
 * Manages analytics state, fetching, and calculations
 */
export function useAnalytics(initialResumeId?: string): UseAnalyticsReturn {
  const [state, setState] = useState<UseAnalyticsState>({
    dashboard: null,
    loading: false,
    error: null,
    isRefreshing: false,
  });

  /**
   * Fetch analytics dashboard data
   */
  const fetchDashboard = useCallback(
    async (resumeId: string, userId: string): Promise<void> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch("/api/analytics/dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeId, userId }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
        }

        const data = (await response.json()) as AnalyticsDashboard;
        setState((prev) => ({
          ...prev,
          dashboard: data,
          loading: false,
        }));
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState((prev) => ({
          ...prev,
          error,
          loading: false,
        }));
      }
    },
    []
  );

  /**
   * Refresh analytics data
   */
  const refreshData = useCallback(async (): Promise<void> => {
    if (!state.dashboard) return;

    setState((prev) => ({ ...prev, isRefreshing: true }));

    try {
      const response = await fetch("/api/analytics/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: state.dashboard.resumeId }),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh analytics");
      }

      const updated = (await response.json()) as AnalyticsDashboard;
      setState((prev) => ({
        ...prev,
        dashboard: updated,
        isRefreshing: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState((prev) => ({
        ...prev,
        error,
        isRefreshing: false,
      }));
    }
  }, [state.dashboard]);

  /**
   * Update local metrics
   */
  const updateMetrics = useCallback(
    (updates: Partial<ResumeAnalytics>): void => {
      setState((prev) => {
        if (!prev.dashboard) return prev;

        return {
          ...prev,
          dashboard: {
            ...prev.dashboard,
            totalViews: updates.viewCount ?? prev.dashboard.totalViews,
            uniqueViews: updates.uniqueViewCount ?? prev.dashboard.uniqueViews,
            totalDownloads:
              updates.downloadCount ?? prev.dashboard.totalDownloads,
            totalShares: updates.shareCount ?? prev.dashboard.totalShares,
            attractivenessScore:
              updates.attractivenessScore ?? prev.dashboard.attractivenessScore,
          },
        };
      });
    },
    []
  );

  /**
   * Get top sections from heatmap
   */
  const getTopSections = useCallback((): SectionHeatmap[] => {
    if (!state.dashboard) return [];
    return state.dashboard.topSections;
  }, [state.dashboard]);

  /**
   * Get top recruiters
   */
  const getTopRecruiters = useCallback((): RecruiterEngagement[] => {
    if (!state.dashboard) return [];
    return state.dashboard.topRecruiters;
  }, [state.dashboard]);

  /**
   * Compare with industry benchmark
   */
  const compareWithBenchmark = useCallback((): Record<
    string,
    number
  > | null => {
    if (!state.dashboard || !state.dashboard.benchmark) return null;

    return {
      scoreVsBenchmark:
        state.dashboard.attractivenessScore -
        state.dashboard.benchmark.avgAttractivenessScore,
      viewsVsBenchmark:
        state.dashboard.totalViews - state.dashboard.benchmark.avgViewCount,
      downloadsVsBenchmark:
        state.dashboard.totalDownloads -
        state.dashboard.benchmark.avgDownloadCount,
    };
  }, [state.dashboard]);

  /**
   * Export dashboard data
   */
  const exportData = useCallback(
    (format: "json" | "csv"): string => {
      if (!state.dashboard) return "";

      if (format === "json") {
        return JSON.stringify(
          AnalyticsService.formatForExport(state.dashboard),
          null,
          2
        );
      }

      // CSV format
      const rows: string[] = [
        "Metric,Value",
        `Total Views,${state.dashboard.totalViews}`,
        `Unique Views,${state.dashboard.uniqueViews}`,
        `Downloads,${state.dashboard.totalDownloads}`,
        `Shares,${state.dashboard.totalShares}`,
        `Attractiveness Score,${state.dashboard.attractivenessScore}`,
        `Industry Rank,${state.dashboard.industryRank}`,
        `Industry Percentile,${state.dashboard.industryPercentile}`,
      ];

      return rows.join("\n");
    },
    [state.dashboard]
  );

  // Auto-fetch on mount if resumeId provided
  useEffect(() => {
    if (initialResumeId) {
      // Placeholder - would need userId from context
      void fetchDashboard(initialResumeId, "");
    }
  }, [initialResumeId, fetchDashboard]);

  return {
    ...state,
    fetchDashboard,
    refreshData,
    updateMetrics,
    getTopSections,
    getTopRecruiters,
    compareWithBenchmark,
    exportData,
  };
}
