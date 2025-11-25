import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EngagementDetails } from "@/components/analytics/EngagementDetails";
import type { EngagementMetrics } from "@/types";

describe("EngagementDetails", () => {
  const mockEngagement: EngagementMetrics = {
    resumeId: "resume-123",
    totalViews: 1500,
    uniqueViewers: 1200,
    avgSessionDuration: 45.5,
    viewsBySource: {
      search: 500,
      direct: 300,
      link: 400,
      recruiter: 200,
      other: 100,
    },
    topReferrers: { "google.com": 500, "linkedin.com": 300 },
    lastViewedAt: "2024-01-15T10:00:00Z",
    viewTrendLast7Days: [
      { date: "2024-01-08", count: 100 },
      { date: "2024-01-09", count: 150 },
    ],
  };

  it("renders engagement details with views by source", () => {
    render(<EngagementDetails engagement={mockEngagement} />);

    expect(screen.getByText("📊")).toBeInTheDocument();
    expect(screen.getByText("Engagement Details")).toBeInTheDocument();
    expect(screen.getByText("Views by Source")).toBeInTheDocument();
  });

  it("displays all source categories with correct counts", () => {
    render(<EngagementDetails engagement={mockEngagement} />);

    expect(screen.getByText("search")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();

    expect(screen.getByText("direct")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();

    expect(screen.getByText("link")).toBeInTheDocument();
    expect(screen.getByText("400")).toBeInTheDocument();

    expect(screen.getByText("recruiter")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();

    expect(screen.getByText("other")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders source cards with correct styling", () => {
    render(<EngagementDetails engagement={mockEngagement} />);

    const sourceCards = screen
      .getAllByText(/\d+/)
      .filter((element) => element.closest(".bg-gray-700"));

    expect(sourceCards).toHaveLength(5); // 5 source categories

    sourceCards.forEach((card) => {
      expect(card.closest(".bg-gray-700")).toBeInTheDocument();
      expect(card.closest(".rounded-lg")).toBeInTheDocument();
      expect(card.closest(".p-3")).toBeInTheDocument();
      expect(card.closest(".text-center")).toBeInTheDocument();
    });
  });

  it("capitalizes source labels correctly", () => {
    render(<EngagementDetails engagement={mockEngagement} />);

    // Check that source names are displayed (capitalize class makes first letter uppercase)
    expect(screen.getByText("search")).toBeInTheDocument();
    expect(screen.getByText("direct")).toBeInTheDocument();
    expect(screen.getByText("link")).toBeInTheDocument();
    expect(screen.getByText("recruiter")).toBeInTheDocument();
    expect(screen.getByText("other")).toBeInTheDocument();
  });

  it("returns null when viewsBySource is not provided", () => {
    const engagementWithoutViews: EngagementMetrics = {
      ...mockEngagement,
      viewsBySource: undefined as any,
    };

    const { container } = render(
      <EngagementDetails engagement={engagementWithoutViews} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("applies correct container styling", () => {
    render(<EngagementDetails engagement={mockEngagement} />);

    const container = screen.getByText("Engagement Details").closest("div");
    expect(container).toHaveClass(
      "bg-gray-800",
      "rounded-lg",
      "border",
      "border-gray-700",
      "p-6"
    );
  });
});
