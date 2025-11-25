import React from "react";
import { render, screen } from "../__support__/testUtils";
import userEvent from "@testing-library/user-event";
import { RecruiterPortalTabs } from "@/components/recruiter/RecruiterPortalTabs";

describe("RecruiterPortalTabs", () => {
  it("renders both tabs and applies active styling to search tab", () => {
    const handle = jest.fn();
    render(<RecruiterPortalTabs activeTab="search" onTabChange={handle} />);
    const searchBtn = screen.getByRole("button", { name: /Search Candidates/ });
    expect(searchBtn).toHaveClass("border-blue-600", "text-blue-600");
  });

  it("calls onTabChange when requests tab is clicked", async () => {
    const user = userEvent.setup();
    const handle = jest.fn();
    render(<RecruiterPortalTabs activeTab="search" onTabChange={handle} />);
    await user.click(screen.getByRole("button", { name: /My Requests/ }));
    expect(handle).toHaveBeenCalledWith("requests");
  });
});
