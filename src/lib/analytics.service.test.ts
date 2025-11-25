// Analytics Service Tests - Core functionality

import { describe, it, expect } from '@jest/globals';
import { AnalyticsService } from '@/lib/analytics.service';
import type {
  ScoringFactors,
  ViewEvent,
  ResumeAnalytics,
  RecruiterEngagement,
  IndustryBenchmark,
} from '@/lib/analytics.types';

describe('AnalyticsService', () => {
  describe('calculateAttractiveness', () => {
    it('should calculate attractiveness score', () => {
      const factors: ScoringFactors = {
        viewCount: 50,
        downloadCount: 10,
        shareCount: 5,
        recruiterInteractions: 30,
        resumeCompleteness: 90,
        keywordMatching: 85,
        formatQuality: 95,
      };

      const result = AnalyticsService.calculateAttractiveness(factors);
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });

    it('should return high score for excellent factors', () => {
      const factors: ScoringFactors = {
        viewCount: 200,
        downloadCount: 50,
        shareCount: 20,
        recruiterInteractions: 100,
        resumeCompleteness: 100,
        keywordMatching: 100,
        formatQuality: 100,
      };

      const result = AnalyticsService.calculateAttractiveness(factors);
      expect(result.totalScore).toBeGreaterThan(80);
    });

    it('should cap normalized scores at 100', () => {
      const factors: ScoringFactors = {
        viewCount: 1000,
        downloadCount: 1000,
        shareCount: 1000,
        recruiterInteractions: 1000,
        resumeCompleteness: 100,
        keywordMatching: 100,
        formatQuality: 100,
      };

      const result = AnalyticsService.calculateAttractiveness(factors);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });
  });

  describe('calculatePercentile', () => {
    it('should return 95 for score >= 85', () => {
      expect(AnalyticsService.calculatePercentile(90)).toBe(95);
    });

    it('should return 80 for score >= 75', () => {
      expect(AnalyticsService.calculatePercentile(80)).toBe(80);
    });

    it('should return 60 for score >= 65', () => {
      expect(AnalyticsService.calculatePercentile(70)).toBe(60);
    });
  });

  describe('getScoreRecommendation', () => {
    it('should return excellent recommendation for high score', () => {
      const rec = AnalyticsService.getScoreRecommendation(90);
      expect(rec).toContain('Excellent');
    });

    it('should return good recommendation for mid-high score', () => {
      const rec = AnalyticsService.getScoreRecommendation(75);
      expect(rec).toContain('Good');
    });
  });

  describe('generateHeatmap', () => {
    it('should generate heatmap for all sections', () => {
      const viewEvents: ViewEvent[] = [
        {
          id: '1',
          resumeId: 'r1',
          viewedAt: new Date(),
          duration: 30,
          sourceType: 'direct',
          metadata: { section: 'skills', clicks: 2 },
        },
      ];

      const sections = ['skills', 'experience', 'summary'];
      const heatmap = AnalyticsService.generateHeatmap(viewEvents, 'r1', sections);

      expect(heatmap).toHaveLength(3);
      expect(heatmap[0].resumeId).toBe('r1');
    });

    it('should handle empty view events', () => {
      const heatmap = AnalyticsService.generateHeatmap([], 'r1', ['skills']);
      expect(heatmap).toHaveLength(1);
      expect(heatmap[0].viewCount).toBe(0);
    });
  });

  describe('calculateEngagementScore', () => {
    it('should return 0 for no engagement', () => {
      expect(AnalyticsService.calculateEngagementScore(0, 0, 0)).toBe(0);
    });

    it('should calculate high score for strong engagement', () => {
      const score = AnalyticsService.calculateEngagementScore(10, 180, 20);
      expect(score).toBeGreaterThan(80);
    });

    it('should cap score at 100', () => {
      const score = AnalyticsService.calculateEngagementScore(100, 1000, 100);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateEngagementLevel', () => {
    it('should return very-high for score >= 80', () => {
      const engagement: RecruiterEngagement = {
        resumeId: 'r1',
        recruiterId: 'rec1',
        viewCount: 5,
        interactionCount: 10,
        lastInteractedAt: new Date(),
        engagementLevel: 'low',
        score: 85,
      };

      expect(AnalyticsService.calculateEngagementLevel(engagement)).toBe('very-high');
    });

    it('should return high for score >= 60', () => {
      const engagement: RecruiterEngagement = {
        resumeId: 'r1',
        recruiterId: 'rec1',
        viewCount: 5,
        interactionCount: 10,
        lastInteractedAt: new Date(),
        engagementLevel: 'low',
        score: 70,
      };

      expect(AnalyticsService.calculateEngagementLevel(engagement)).toBe('high');
    });
  });

  describe('calculateIndustryRank', () => {
    it('should calculate rank based on score ratio', () => {
      const analytics: ResumeAnalytics = {
        resumeId: 'r1',
        userId: 'u1',
        viewCount: 50,
        uniqueViewCount: 30,
        downloadCount: 10,
        shareCount: 5,
        attractivenessScore: 75,
        lastViewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const benchmark: IndustryBenchmark = {
        industry: 'tech',
        avgAttractivenessScore: 50,
        avgViewCount: 40,
        avgDownloadCount: 8,
        topSkills: [],
        benchmarkDate: new Date(),
      };

      const rank = AnalyticsService.calculateIndustryRank(analytics, benchmark);
      expect(rank).toBeGreaterThan(100);
    });
  });

  describe('calculateTrend', () => {
    it('should return 0 for same values', () => {
      expect(AnalyticsService.calculateTrend(50, 50)).toBe(0);
    });

    it('should return positive for increase', () => {
      expect(AnalyticsService.calculateTrend(50, 75)).toBeGreaterThan(0);
    });

    it('should return negative for decrease', () => {
      expect(AnalyticsService.calculateTrend(75, 50)).toBeLessThan(0);
    });
  });

  describe('compareWithBenchmark', () => {
    it('should calculate differences correctly', () => {
      const analytics: ResumeAnalytics = {
        resumeId: 'r1',
        userId: 'u1',
        viewCount: 100,
        uniqueViewCount: 50,
        downloadCount: 20,
        shareCount: 10,
        attractivenessScore: 80,
        lastViewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const benchmark: IndustryBenchmark = {
        industry: 'tech',
        avgAttractivenessScore: 50,
        avgViewCount: 40,
        avgDownloadCount: 10,
        topSkills: [],
        benchmarkDate: new Date(),
      };

      const comparison = AnalyticsService.compareWithBenchmark(analytics, benchmark);

      expect(comparison.scoreVsBenchmark).toBe(30);
      expect(comparison.viewsVsBenchmark).toBe(60);
    });
  });

  describe('formatForExport', () => {
    it('should format dashboard for export', () => {
      const dashboard = {
        resumeId: 'r1',
        userId: 'u1',
        totalViews: 100,
        uniqueViews: 50,
        totalDownloads: 20,
        totalShares: 10,
        attractivenessScore: 75,
        industryRank: 120,
        industryPercentile: 75,
        topSections: [],
        topRecruiters: [],
        benchmark: null,
        lastUpdated: new Date(),
      };

      const exported = AnalyticsService.formatForExport(dashboard);
      expect(exported.summary).toBeDefined();
      expect(exported.engagement).toBeDefined();
    });
  });

  describe('aggregateToDashboard', () => {
    it('should aggregate analytics correctly', () => {
      const analytics: ResumeAnalytics = {
        resumeId: 'r1',
        userId: 'u1',
        viewCount: 50,
        uniqueViewCount: 30,
        downloadCount: 10,
        shareCount: 5,
        attractivenessScore: 75,
        lastViewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dashboard = AnalyticsService.aggregateToDashboard(
        analytics,
        [],
        [],
        null
      );

      expect(dashboard.resumeId).toBe('r1');
      expect(dashboard.totalViews).toBe(50);
    });
  });

  describe('generateTimeSeries', () => {
    it('should generate time series data', () => {
      const analytics: ResumeAnalytics = {
        resumeId: 'r1',
        userId: 'u1',
        viewCount: 10,
        uniqueViewCount: 5,
        downloadCount: 2,
        shareCount: 1,
        attractivenessScore: 70,
        lastViewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const timeSeries = AnalyticsService.generateTimeSeries(analytics, [], startDate, endDate);
      expect(timeSeries.length).toBeGreaterThan(0);
    });
  });
});
