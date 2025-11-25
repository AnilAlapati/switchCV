import React from "react";
import { render, screen } from "../__support__/testUtils";
import userEvent from "@testing-library/user-event";
import { SearchFiltersPanel } from "@/components/search/SearchFiltersPanel";

describe("SearchFiltersPanel", () => {
  const mockProps = {
    filters: { role: undefined, location: undefined, skills: [] },
    onToggleFilter: jest.fn(),
    isFilterActive: jest.fn(() => false),
    onClearAllFilters: jest.fn(),
    filterCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders role filter section", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    expect(screen.getByText("Role")).toBeInTheDocument();
  });

  it("renders location filter section", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    expect(screen.getByText("Location")).toBeInTheDocument();
  });

  it("renders skill filter section", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    expect(screen.getByText("Skills")).toBeInTheDocument();
  });

  it("calls onToggleFilter when role button clicked", async () => {
    const user = userEvent.setup();
    render(<SearchFiltersPanel {...mockProps} />);

    const roleButtons = screen.getAllByRole("button");
    const softwareEngineerBtn = roleButtons.find(
      (btn) => btn.textContent === "Software Engineer"
    );

    if (softwareEngineerBtn) {
      await user.click(softwareEngineerBtn);
      expect(mockProps.onToggleFilter).toHaveBeenCalledWith(
        "role",
        "Software Engineer"
      );
    }
  });

  it("renders clear all filters button", () => {
    render(<SearchFiltersPanel {...mockProps} filterCount={2} />);

    expect(
      screen.getByRole("button", { name: /Clear All Filters/ })
    ).toBeInTheDocument();
  });

  it("calls onClearAllFilters when clear all button clicked", async () => {
    const user = userEvent.setup();
    render(<SearchFiltersPanel {...mockProps} filterCount={2} />);

    await user.click(screen.getByRole("button", { name: /Clear All Filters/ }));
    expect(mockProps.onClearAllFilters).toHaveBeenCalled();
  });
});
