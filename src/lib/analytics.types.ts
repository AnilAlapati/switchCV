// Analytics Types & Interfaces for Advanced Analytics Dashboard

/**
 * Resume analytics data structure
 */
export interface ResumeAnalytics {
  resumeId: string;
  userId: string;
  viewCount: number;
  uniqueViewCount: number;
  downloadCount: number;
  shareCount: number;
  attractivenessScore: number;
  lastViewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * View event for tracking individual resume views
 */
export interface ViewEvent {
  id: string;
  resumeId: string;
  viewerId?: string;
  viewedAt: Date;
  duration: number; // in seconds
  sourceType: "direct" | "search" | "shared" | "recommendation";
  metadata?: Record<string, unknown>;
}

/**
 * Heatmap data for resume sections
 */
export interface SectionHeatmap {
  resumeId: string;
  sectionName: string;
  viewCount: number;
  avgTimeSpent: number; // in seconds
  clickCount: number;
  engagementScore: number; // 0-100
}

/**
 * Recruiter engagement metrics
 */
export interface RecruiterEngagement {
  resumeId: string;
  recruiterId: string;
  viewCount: number;
  interactionCount: number;
  lastInteractedAt: Date;
  engagementLevel: "low" | "medium" | "high" | "very-high";
  score: number; // 0-100
}

/**
 * Industry benchmark data
 */
export interface IndustryBenchmark {
  industry: string;
  avgAttractivenessScore: number;
  avgViewCount: number;
  avgDownloadCount: number;
  topSkills: string[];
  benchmarkDate: Date;
}

/**
 * Analytics dashboard summary
 */
export interface AnalyticsDashboard {
  resumeId: string;
  userId: string;
  totalViews: number;
  uniqueViews: number;
  totalDownloads: number;
  totalShares: number;
  attractivenessScore: number;
  industryRank: number;
  industryPercentile: number;
  topSections: SectionHeatmap[];
  topRecruiters: RecruiterEngagement[];
  benchmark: IndustryBenchmark | null;
  lastUpdated: Date;
}

/**
 * Time-series analytics data
 */
export interface AnalyticsTimeSeries {
  resumeId: string;
  date: Date;
  views: number;
  downloads: number;
  shares: number;
  attractivenessScore: number;
}

/**
 * Analytics filters for querying
 */
export interface AnalyticsFilter {
  resumeId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  industry?: string;
  minScore?: number;
  sourceType?: string;
}

/**
 * Analytics response structure
 */
export interface AnalyticsResponse {
  success: boolean;
  data: unknown;
  message?: string;
  timestamp: Date;
}

/**
 * Heatmap calculation options
 */
export interface HeatmapOptions {
  resumeId: string;
  timeframe?: "week" | "month" | "quarter" | "year" | "all";
  minViewThreshold?: number;
}

/**
 * Scoring factors for attractiveness
 */
export interface ScoringFactors {
  viewCount: number;
  downloadCount: number;
  shareCount: number;
  recruiterInteractions: number;
  resumeCompleteness: number;
  keywordMatching: number;
  formatQuality: number;
}

/**
 * Attractiveness score breakdown
 */
export interface AttractivenesScoreBreakdown {
  totalScore: number;
  factors: ScoringFactors;
  weights: Partial<Record<keyof ScoringFactors, number>>;
  percentile: number;
  recommendation: string;
}

/**
 * Export analytics options
 */
export interface ExportAnalyticsOptions {
  format: "json" | "csv" | "pdf";
  includeCharts?: boolean;
  timeframe?: "week" | "month" | "quarter" | "year" | "all";
}

/**
 * Batch analytics update
 */
export interface BatchAnalyticsUpdate {
  resumeId: string;
  viewCount?: number;
  downloadCount?: number;
  shareCount?: number;
  lastViewedAt?: Date;
}
