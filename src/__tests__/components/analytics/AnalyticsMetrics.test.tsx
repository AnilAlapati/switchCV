import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AnalyticsMetrics } from "@/components/analytics/AnalyticsMetrics";
import type { Analytics } from "@/types";

describe("AnalyticsMetrics", () => {
  const mockAnalytics: Analytics = {
    slug: "test-resume",
    resumeId: "resume-123",
    userId: "user-123",
    views: {
      count: 1500,
      lastViewedAt: "2024-01-15T10:00:00Z",
      topReferrers: { "google.com": 500, "linkedin.com": 300 },
      uniqueViewers: 1200,
      avgSessionDuration: 45.5,
    },
    totalInteractions: 1800,
    lastUpdatedAt: "2024-01-15T10:00:00Z",
  };

  it("renders all metric cards with correct values", () => {
    render(<AnalyticsMetrics analytics={mockAnalytics} />);

    // Check Total Views
    expect(screen.getByText("Total Views")).toBeInTheDocument();
    expect(screen.getByText("1,500")).toBeInTheDocument();
    expect(screen.getByText("1200 unique viewers")).toBeInTheDocument();

    // Check Unique Visitors
    expect(screen.getByText("Unique Visitors")).toBeInTheDocument();
    expect(screen.getByText("1,200")).toBeInTheDocument();
    expect(screen.getByText("Individual viewers")).toBeInTheDocument();

    // Check Avg Session
    expect(screen.getByText("Avg Session")).toBeInTheDocument();
    expect(screen.getByText("46s")).toBeInTheDocument();
    expect(screen.getByText("average time spent")).toBeInTheDocument();

    // Check Total Interactions
    expect(screen.getByText("Total Interactions")).toBeInTheDocument();
    expect(screen.getByText("1,800")).toBeInTheDocument();
    expect(
      screen.getByText("views + requests + approvals")
    ).toBeInTheDocument();
  });

  it("displays formatted numbers correctly", () => {
    const largeNumbersAnalytics: Analytics = {
      ...mockAnalytics,
      views: {
        ...mockAnalytics.views,
        count: 1000000,
        uniqueViewers: 500000,
      },
      totalInteractions: 2000000,
    };

    render(<AnalyticsMetrics analytics={largeNumbersAnalytics} />);

    expect(screen.getByText("1,000,000")).toBeInTheDocument();
    expect(screen.getByText("500,000")).toBeInTheDocument();
    expect(screen.getByText("2,000,000")).toBeInTheDocument();
  });

  it("renders icons correctly", () => {
    render(<AnalyticsMetrics analytics={mockAnalytics} />);

    expect(screen.getByText("👁️")).toBeInTheDocument(); // Views icon
    expect(screen.getByText("👥")).toBeInTheDocument(); // Visitors icon
    expect(screen.getByText("⏱️")).toBeInTheDocument(); // Session icon
    expect(screen.getByText("⚡")).toBeInTheDocument(); // Interactions icon
  });

  it("applies correct border colors on hover", () => {
    render(<AnalyticsMetrics analytics={mockAnalytics} />);

    const cards = screen.getAllByRole("generic", { hidden: true });
    const metricCards = cards.filter(
      (card) =>
        card.className.includes("bg-gray-800") &&
        card.className.includes("rounded-lg")
    );

    expect(metricCards).toHaveLength(4);

    // Check hover classes are applied
    metricCards.forEach((card) => {
      expect(card.className).toMatch(
        /hover:border-(blue|green|purple|orange)-500/
      );
    });
  });
});
