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

    expect(screen.getByText("📋")).toBeInTheDocument();
    expect(screen.getByText("Access Requests")).toBeInTheDocument();
  });

  it("displays all request statistics with correct values", () => {
    render(<RequestStatistics requests={mockRequests} />);

    expect(screen.getByText("Total Requests")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();

    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();

    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Denied")).toBeInTheDocument();

    // Check that we have the expected number of value elements
    const valueElements = screen.getAllByText(/\d+/);
    expect(valueElements).toHaveLength(4); // 150, 100, 25, 25
  });

  it("applies correct colors to different request types", () => {
    render(<RequestStatistics requests={mockRequests} />);

    // Total Requests should be white
    const totalRequestsValue = screen.getByText("150");
    expect(totalRequestsValue).toHaveClass("text-white");

    // Approved should be green
    const approvedValue = screen.getByText("100");
    expect(approvedValue).toHaveClass("text-green-400");

    // Pending should be yellow - find by proximity to "Pending" label
    const pendingCard = screen.getByText("Pending").closest("div");
    const pendingValue = pendingCard?.querySelector("p.text-2xl");
    expect(pendingValue).toHaveClass("text-yellow-400");

    // Denied should be red - find by proximity to "Denied" label
    const deniedCard = screen.getByText("Denied").closest("div");
    const deniedValue = deniedCard?.querySelector("p.text-2xl");
    expect(deniedValue).toHaveClass("text-red-400");
  });

  it("renders request stats cards with correct styling", () => {
    render(<RequestStatistics requests={mockRequests} />);

    const statCards = screen
      .getAllByText(/\d+/)
      .map((element) => element.closest(".bg-gray-700"))
      .filter(Boolean);

    expect(statCards).toHaveLength(4); // 4 stat cards

    statCards.forEach((card) => {
      expect(card).toHaveClass("bg-gray-700", "rounded-lg", "p-4");
    });
  });

  it("displays labels with correct styling", () => {
    render(<RequestStatistics requests={mockRequests} />);

    const labels = ["Total Requests", "Approved", "Pending", "Denied"];

    labels.forEach((label) => {
      const labelElement = screen.getByText(label);
      expect(labelElement).toHaveClass("text-gray-400", "text-sm", "mb-1");
    });
  });

  it("applies correct container styling", () => {
    render(<RequestStatistics requests={mockRequests} />);

    const container = screen.getByText("Access Requests").closest("div");
    expect(container).toHaveClass(
      "bg-gray-800",
      "rounded-lg",
      "border",
      "border-gray-700",
      "p-6"
    );
  });

  it("renders in responsive grid layout", () => {
    render(<RequestStatistics requests={mockRequests} />);

    const gridContainer = screen.getByText("Total Requests").closest(".grid");
    expect(gridContainer).toHaveClass("grid-cols-2", "md:grid-cols-4", "gap-4");
  });
});
