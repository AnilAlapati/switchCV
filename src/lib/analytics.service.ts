// Advanced Analytics Service - Core calculations and metrics

import type {
  ResumeAnalytics,
  ViewEvent,
  SectionHeatmap,
  RecruiterEngagement,
  IndustryBenchmark,
  AnalyticsDashboard,
  AttractivenesScoreBreakdown,
  ScoringFactors,
  AnalyticsTimeSeries,
} from "./analytics.types";

/**
 * Core analytics service for calculations
 */
export class AnalyticsService {
  /**
   * Calculate attractiveness score from various factors
   */
  static calculateAttractiveness(
    factors: ScoringFactors
  ): AttractivenesScoreBreakdown {
    const weights = {
      viewCount: 0.25,
      downloadCount: 0.2,
      shareCount: 0.15,
      recruiterInteractions: 0.25,
      resumeCompleteness: 0.1,
      keywordMatching: 0.03,
      formatQuality: 0.02,
    };

    // Normalize each factor to 0-100 scale
    const normalizedFactors = {
      viewCount: Math.min((factors.viewCount / 100) * 100, 100),
      downloadCount: Math.min((factors.downloadCount / 20) * 100, 100),
      shareCount: Math.min((factors.shareCount / 10) * 100, 100),
      recruiterInteractions: Math.min(
        (factors.recruiterInteractions / 50) * 100,
        100
      ),
      resumeCompleteness: Math.min(factors.resumeCompleteness, 100),
      keywordMatching: Math.min(factors.keywordMatching, 100),
      formatQuality: Math.min(factors.formatQuality, 100),
    };

    // Calculate weighted score
    const totalScore =
      normalizedFactors.viewCount * weights.viewCount +
      normalizedFactors.downloadCount * weights.downloadCount +
      normalizedFactors.shareCount * weights.shareCount +
      normalizedFactors.recruiterInteractions * weights.recruiterInteractions +
      normalizedFactors.resumeCompleteness * weights.resumeCompleteness +
      normalizedFactors.keywordMatching * weights.keywordMatching +
      normalizedFactors.formatQuality * weights.formatQuality;

    return {
      totalScore: Math.round(totalScore),
      factors,
      weights,
      percentile: AnalyticsService.calculatePercentile(totalScore),
      recommendation: AnalyticsService.getScoreRecommendation(totalScore),
    };
  }

  /**
   * Calculate percentile ranking
   */
  static calculatePercentile(score: number): number {
    // Using normal distribution approximation
    if (score >= 85) return 95;
    if (score >= 75) return 80;
    if (score >= 65) return 60;
    if (score >= 50) return 40;
    return Math.max(score / 50, 0) * 25;
  }

  /**
   * Get recommendation based on score
   */
  static getScoreRecommendation(score: number): string {
    if (score >= 85) {
      return "Excellent! Your resume is highly attractive to recruiters.";
    }
    if (score >= 75) {
      return "Good! Your resume is competitive. Consider enhancing key sections.";
    }
    if (score >= 65) {
      return "Fair. Focus on improving completeness and recruiter keywords.";
    }
    if (score >= 50) {
      return "Below average. Add more detail and optimize for your industry.";
    }
    return "Needs improvement. Consider a complete resume revamp.";
  }

  /**
   * Generate heatmap for resume sections
   */
  static generateHeatmap(
    viewEvents: ViewEvent[],
    resumeId: string,
    sections: string[]
  ): SectionHeatmap[] {
    const sectionMap = new Map<
      string,
      { views: number; timeSpent: number; clicks: number }
    >();

    // Initialize all sections
    sections.forEach((section) => {
      sectionMap.set(section, { views: 0, timeSpent: 0, clicks: 0 });
    });

    // Process view events
    viewEvents.forEach((event) => {
      if (event.resumeId === resumeId && event.metadata) {
        const section = (event.metadata.section as string) || "general";
        const current = sectionMap.get(section) || {
          views: 0,
          timeSpent: 0,
          clicks: 0,
        };

        current.views += 1;
        current.timeSpent += event.duration;
        current.clicks += (event.metadata.clicks as number) || 0;

        sectionMap.set(section, current);
      }
    });

    // Convert to heatmap data
    return Array.from(sectionMap.entries()).map(([sectionName, data]) => ({
      resumeId,
      sectionName,
      viewCount: data.views,
      avgTimeSpent: data.views > 0 ? data.timeSpent / data.views : 0,
      clickCount: data.clicks,
      engagementScore: AnalyticsService.calculateEngagementScore(
        data.views,
        data.timeSpent,
        data.clicks
      ),
    }));
  }

  /**
   * Calculate section engagement score (0-100)
   */
  static calculateEngagementScore(
    views: number,
    timeSpent: number,
    clicks: number
  ): number {
    const viewScore = Math.min(views / 5, 1) * 40;
    const timeScore = Math.min(timeSpent / 60, 1) * 40; // 1 min = max time score
    const clickScore = Math.min(clicks / 10, 1) * 20;

    return Math.round(viewScore + timeScore + clickScore);
  }

  /**
   * Calculate recruiter engagement level
   */
  static calculateEngagementLevel(
    engagement: RecruiterEngagement
  ): "low" | "medium" | "high" | "very-high" {
    const score = engagement.score;
    if (score >= 80) return "very-high";
    if (score >= 60) return "high";
    if (score >= 40) return "medium";
    return "low";
  }

  /**
   * Aggregate analytics into dashboard view
   */
  static aggregateToDashboard(
    analytics: ResumeAnalytics,
    heatmaps: SectionHeatmap[],
    recruiters: RecruiterEngagement[],
    benchmark: IndustryBenchmark | null
  ): AnalyticsDashboard {
    const topSections = heatmaps
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 5);

    const topRecruiters = recruiters
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      resumeId: analytics.resumeId,
      userId: analytics.userId,
      totalViews: analytics.viewCount,
      uniqueViews: analytics.uniqueViewCount,
      totalDownloads: analytics.downloadCount,
      totalShares: analytics.shareCount,
      attractivenessScore: analytics.attractivenessScore,
      industryRank: benchmark
        ? AnalyticsService.calculateIndustryRank(analytics, benchmark)
        : 0,
      industryPercentile: analytics.attractivenessScore,
      topSections,
      topRecruiters,
      benchmark,
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate industry rank
   */
  static calculateIndustryRank(
    analytics: ResumeAnalytics,
    benchmark: IndustryBenchmark
  ): number {
    const scoreRatio =
      analytics.attractivenessScore / (benchmark.avgAttractivenessScore || 50);
    return Math.round(scoreRatio * 100);
  }

  /**
   * Generate time-series analytics
   */
  static generateTimeSeries(
    analytics: ResumeAnalytics,
    viewEvents: ViewEvent[],
    startDate: Date,
    endDate: Date
  ): AnalyticsTimeSeries[] {
    const timeSeries: Map<string, AnalyticsTimeSeries> = new Map();

    // Initialize daily buckets
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split("T")[0];
      if (!timeSeries.has(dateKey)) {
        timeSeries.set(dateKey, {
          resumeId: analytics.resumeId,
          date: new Date(current),
          views: 0,
          downloads: 0,
          shares: 0,
          attractivenessScore: analytics.attractivenessScore,
        });
      }
      current.setDate(current.getDate() + 1);
    }

    // Aggregate view events into buckets
    viewEvents.forEach((event) => {
      if (event.resumeId === analytics.resumeId) {
        const dateKey = event.viewedAt.toISOString().split("T")[0];
        const bucket = timeSeries.get(dateKey);
        if (bucket) {
          bucket.views += 1;
        }
      }
    });

    return Array.from(timeSeries.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
  }

  /**
   * Compare with industry benchmark
   */
  static compareWithBenchmark(
    analytics: ResumeAnalytics,
    benchmark: IndustryBenchmark
  ): Record<string, number> {
    return {
      scoreVsBenchmark:
        analytics.attractivenessScore - benchmark.avgAttractivenessScore,
      viewsVsBenchmark: analytics.viewCount - benchmark.avgViewCount,
      downloadsVsBenchmark:
        analytics.downloadCount - benchmark.avgDownloadCount,
      scorePercentageAbove:
        ((analytics.attractivenessScore - benchmark.avgAttractivenessScore) /
          benchmark.avgAttractivenessScore) *
        100,
    };
  }

  /**
   * Calculate trend (positive or negative change)
   */
  static calculateTrend(previousValue: number, currentValue: number): number {
    if (previousValue === 0) return currentValue > 0 ? 100 : 0;
    return ((currentValue - previousValue) / previousValue) * 100;
  }

  /**
   * Export analytics data
   */
  static formatForExport(
    dashboard: AnalyticsDashboard
  ): Record<string, unknown> {
    return {
      summary: {
        totalViews: dashboard.totalViews,
        uniqueViews: dashboard.uniqueViews,
        totalDownloads: dashboard.totalDownloads,
        totalShares: dashboard.totalShares,
        attractivenessScore: dashboard.attractivenessScore,
      },
      engagement: {
        industryRank: dashboard.industryRank,
        industryPercentile: dashboard.industryPercentile,
        topSections: dashboard.topSections,
        topRecruiters: dashboard.topRecruiters,
      },
      benchmark: dashboard.benchmark,
      lastUpdated: dashboard.lastUpdated,
    };
  }
}
