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

    // Check Returning Hits
    expect(screen.getByText("Returning Hits")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
    expect(screen.getByText("Repeat interactions")).toBeInTheDocument();

    // Check Avg Session
    expect(screen.getByText("Avg Session")).toBeInTheDocument();
    expect(screen.getByText("46s")).toBeInTheDocument();
    expect(screen.getByText(/time on profile/i)).toBeInTheDocument();

    // Check Total Interactions
    expect(screen.getByText("Interactions")).toBeInTheDocument();
    expect(screen.getByText("1,800")).toBeInTheDocument();
    expect(
      screen.getByText("Total engagement")
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
        card.className.includes("glass-panel") &&
        card.className.includes("rounded-2xl")
    );

    expect(metricCards).toHaveLength(4);

    // Check hover classes are applied
    metricCards.forEach((card) => {
      expect(card.className).toContain("hover:border-blue-300");
    });
  });
});
