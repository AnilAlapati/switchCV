// src/__tests__/components/AnalyticsDashboard.test.tsx
/**
 * Tests for the Analytics Dashboard component
 */

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  AnalyticsDashboard,
  AnalyticsCard,
} from "@/components/AnalyticsDashboard";
import { Analytics } from "@/types";

// Mock fetch
global.fetch = jest.fn();

describe("AnalyticsDashboard Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("AnalyticsDashboard", () => {
    it("should render loading state initially", () => {
      (global.fetch as jest.Mock).mockReturnValueOnce(
        new Promise(() => {}) // Never resolves
      );

      render(<AnalyticsDashboard resumeId="test-resume" />);

      // Should show loading skeleton
      expect(document.querySelector(".animate-pulse")).toBeTruthy();
    });

    it("should display analytics metrics when data loads", async () => {
      const mockAnalytics: Analytics = {
        slug: "test-slug",
        resumeId: "test-resume",
        userId: "user-123",
        views: {
          count: 100,
          lastViewedAt: new Date().toISOString(),
          topReferrers: {
            "google.com": 50,
            "linkedin.com": 30,
          },
          uniqueViewers: 85,
          avgSessionDuration: 240,
        },
        totalInteractions: 120,
        lastUpdatedAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analytics: mockAnalytics,
          engagement: null,
          requests: null,
        }),
      });

      render(<AnalyticsDashboard resumeId="test-resume" />);

      await waitFor(() => {
        expect(screen.getByText("100")).toBeInTheDocument(); // Total views
      });
    });

    it("should display total views metric", async () => {
      const mockAnalytics: Analytics = {
        slug: "test-slug",
        resumeId: "test-resume",
        userId: "user-123",
        views: {
          count: 256,
          lastViewedAt: new Date().toISOString(),
          topReferrers: {},
          uniqueViewers: 200,
          avgSessionDuration: 180,
        },
        totalInteractions: 300,
        lastUpdatedAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analytics: mockAnalytics,
          engagement: null,
          requests: null,
        }),
      });

      render(<AnalyticsDashboard resumeId="test-resume" />);

      await waitFor(() => {
        expect(screen.getByText("Total Views")).toBeInTheDocument();
        expect(screen.getByText("256")).toBeInTheDocument();
      });
    });

    it("should display unique visitors metric", async () => {
      const mockAnalytics: Analytics = {
        slug: "test-slug",
        resumeId: "test-resume",
        userId: "user-123",
        views: {
          count: 500,
          lastViewedAt: new Date().toISOString(),
          topReferrers: {},
          uniqueViewers: 350,
          avgSessionDuration: 200,
        },
        totalInteractions: 520,
        lastUpdatedAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analytics: mockAnalytics,
          engagement: null,
          requests: null,
        }),
      });

      render(<AnalyticsDashboard resumeId="test-resume" />);

      await waitFor(() => {
        expect(screen.getByText("Unique Visitors")).toBeInTheDocument();
        expect(screen.getByText("350")).toBeInTheDocument();
      });
    });

    it("should display average session duration", async () => {
      const mockAnalytics: Analytics = {
        slug: "test-slug",
        resumeId: "test-resume",
        userId: "user-123",
        views: {
          count: 100,
          lastViewedAt: new Date().toISOString(),
          topReferrers: {},
          uniqueViewers: 85,
          avgSessionDuration: 320,
        },
        totalInteractions: 110,
        lastUpdatedAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analytics: mockAnalytics,
          engagement: null,
          requests: null,
        }),
      });

      render(<AnalyticsDashboard resumeId="test-resume" />);

      await waitFor(() => {
        expect(screen.getByText("Avg Session")).toBeInTheDocument();
        expect(screen.getByText("320s")).toBeInTheDocument();
      });
    });

    it("should display top referrers when available", async () => {
      const mockAnalytics: Analytics = {
        slug: "test-slug",
        resumeId: "test-resume",
        userId: "user-123",
        views: {
          count: 100,
          lastViewedAt: new Date().toISOString(),
          topReferrers: {
            "google.com": 60,
            "linkedin.com": 25,
            "twitter.com": 15,
          },
          uniqueViewers: 85,
          avgSessionDuration: 240,
        },
        totalInteractions: 120,
        lastUpdatedAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analytics: mockAnalytics,
          engagement: null,
          requests: null,
        }),
      });

      render(<AnalyticsDashboard resumeId="test-resume" />);

      await waitFor(() => {
        expect(screen.getByText("Top Referrers")).toBeInTheDocument();
        expect(
          screen.getByText("google.com", { exact: false })
        ).toBeInTheDocument();
      });
    });

    it("should show no analytics message when data doesn't exist", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "No analytics found" }),
      });

      render(<AnalyticsDashboard resumeId="test-resume" />);

      await waitFor(() => {
        expect(
          screen.getByText("No analytics data available yet")
        ).toBeInTheDocument();
      });
    });
  });

  describe("AnalyticsCard Component", () => {
    it("should display compact metrics", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analytics: {
            views: { count: 45 },
          },
          requests: { totalRequests: 5 },
        }),
      });

      render(<AnalyticsCard resumeId="test-resume" />);

      await waitFor(() => {
        expect(screen.getByText("45")).toBeInTheDocument(); // Views
        expect(screen.getByText("5")).toBeInTheDocument(); // Requests
      });
    });

    it("should display views and requests in compact format", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analytics: {
            views: { count: 123 },
          },
          requests: { totalRequests: 8 },
        }),
      });

      render(<AnalyticsCard resumeId="test-resume" />);

      await waitFor(() => {
        expect(screen.getByText("views")).toBeInTheDocument();
        expect(screen.getByText("requests")).toBeInTheDocument();
      });
    });
  });

  describe("Metrics display", () => {
    it("should format large numbers with thousands separator", async () => {
      const mockAnalytics: Analytics = {
        slug: "test-slug",
        resumeId: "test-resume",
        userId: "user-123",
        views: {
          count: 1234567,
          lastViewedAt: new Date().toISOString(),
          topReferrers: {},
          uniqueViewers: 987654,
          avgSessionDuration: 240,
        },
        totalInteractions: 1300000,
        lastUpdatedAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analytics: mockAnalytics,
          engagement: null,
          requests: null,
        }),
      });

      render(<AnalyticsDashboard resumeId="test-resume" />);

      await waitFor(() => {
        // Should use toLocaleString() for formatting
        const viewsText = screen.getByText("1,234,567");
        expect(viewsText).toBeInTheDocument();
      });
    });

    it("should update when resumeId changes", async () => {
      const { rerender } = render(<AnalyticsDashboard resumeId="resume-1" />);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analytics: {
            slug: "test-slug",
            resumeId: "resume-2",
            userId: "user-123",
            views: {
              count: 100,
              uniqueViewers: 50,
              avgSessionDuration: 120,
              lastViewedAt: new Date().toISOString(),
              topReferrers: {
                "google.com": 40,
                direct: 30,
              },
            },
            totalInteractions: 110,
            lastUpdatedAt: new Date().toISOString(),
          },
        }),
      });

      rerender(<AnalyticsDashboard resumeId="resume-2" />);

      await waitFor(() => {
        expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(
          1
        );
      });
    });
  });
});
