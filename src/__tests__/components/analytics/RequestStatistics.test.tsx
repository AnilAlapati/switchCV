import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RequestStatistics } from "@/components/analytics/RequestStatistics";
import type { RequestStatistics as RequestStatsType } from "@/types";

describe("RequestStatistics", () => {
  const mockRequests: RequestStatsType = {
    resumeId: "resume-123",
    totalRequests: 150,
    pendingRequests: 25,
    approvedRequests: 100,
    deniedRequests: 25,
    requestsBySource: { "linkedin.com": 50, "indeed.com": 30 },
    avgResponseTime: 24,
    lastRequestAt: "2024-01-15T10:00:00Z",
    requestTrendLast7Days: [
      { date: "2024-01-08", count: 10 },
      { date: "2024-01-09", count: 15 },
    ],
  };

  it("renders request statistics header with icon", () => {
    render(<RequestStatistics requests={mockRequests} />);

    expect(screen.getByText("Inquiry Funnel")).toBeInTheDocument();
  });

  it("displays all request statistics with correct values", () => {
    render(<RequestStatistics requests={mockRequests} />);

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();

    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();

    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Denied")).toBeInTheDocument();

    // Check that we have the expected number of value elements
    const valueElements = screen.getAllByText(/\d+/).filter(el => el.tagName === 'P');
    expect(valueElements).toHaveLength(4); // 150, 100, 25, 25
  });

  it("applies correct colors to different request types", () => {
    render(<RequestStatistics requests={mockRequests} />);

    // Total Requests should be black (p-black)
    const totalRequestsValue = screen.getByText("150");
    expect(totalRequestsValue).toHaveClass("text-2xl", "font-black");

    // Approved should be green
    const approvedValue = screen.getByText("100");
    expect(approvedValue.parentElement).toHaveClass("text-emerald-600");

    // Pending should be amber
    const pendingCard = screen.getByText("Pending").closest("div");
    const pendingValue = pendingCard?.querySelector("p");
    expect(pendingValue?.parentElement).toHaveClass("text-amber-600");

    // Denied should be red
    const deniedCard = screen.getByText("Denied").closest("div");
    const deniedValue = deniedCard?.querySelector("p");
    expect(deniedValue?.parentElement).toHaveClass("text-red-600");
  });

  it("renders request stats cards with correct styling", () => {
    render(<RequestStatistics requests={mockRequests} />);

    const statCards = screen
      .getAllByText(/\d+/)
      .map((element) => element.closest(".rounded-xl"))
      .filter(Boolean);

    expect(statCards).toHaveLength(4); // 4 stat cards

    statCards.forEach((card) => {
      expect(card).toHaveClass("rounded-xl", "border", "p-4");
    });
  });

  it("displays labels with correct styling", () => {
    render(<RequestStatistics requests={mockRequests} />);

    const labels = ["Total", "Approved", "Pending", "Denied"];

    labels.forEach((label) => {
      const labelElement = screen.getByText(label);
      expect(labelElement).toHaveClass("text-[10px]", "font-black");
    });
  });

  it("applies correct container styling", () => {
    render(<RequestStatistics requests={mockRequests} />);

    const container = screen.getByText("Inquiry Funnel").closest("div")?.parentElement;
    expect(container).toHaveClass(
      "p-8"
    );
  });

  it("renders in responsive grid layout", () => {
    render(<RequestStatistics requests={mockRequests} />);

    const gridContainer = screen.getByText("Total").closest(".grid");
    expect(gridContainer).toHaveClass("grid-cols-2", "gap-4");
  });
});
