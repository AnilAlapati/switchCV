import React from "react";
import { render, screen } from "../__support__/testUtils";
import userEvent from "@testing-library/user-event";
import { RequestTabs } from "@/components/recruiter/RequestTabs";

describe("RequestTabs", () => {
  const mockStats = { pending: 3, approved: 5, denied: 1, expired: 0 };

  it("renders all status tabs", () => {
    const handle = jest.fn();
    render(
      <RequestTabs
        activeTab="pending"
        onTabChange={handle}
        stats={mockStats}
      />
    );

    expect(screen.getByText("Pending Approval")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Denied")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("displays badge with stat count", () => {
    const handle = jest.fn();
    render(
      <RequestTabs
        activeTab="pending"
        onTabChange={handle}
        stats={mockStats}
      />
    );

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("calls onTabChange when tab is clicked", async () => {
    const user = userEvent.setup();
    const handle = jest.fn();
    render(
      <RequestTabs
        activeTab="pending"
        onTabChange={handle}
        stats={mockStats}
      />
    );

    await user.click(screen.getByText("Approved"));
    expect(handle).toHaveBeenCalledWith("approved");
  });

  it("highlights active tab", () => {
    const handle = jest.fn();
    const { container } = render(
      <RequestTabs
        activeTab="pending"
        onTabChange={handle}
        stats={mockStats}
      />
    );

    const activeBtn = container.querySelector(
      "button[class*='border-blue-600']"
    );
    expect(activeBtn?.textContent).toContain("Pending Approval");
  });
});
