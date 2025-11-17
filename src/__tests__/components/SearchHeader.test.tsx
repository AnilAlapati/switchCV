import React from "react";
import { render, screen } from "../__support__/testUtils";
import userEvent from "@testing-library/user-event";
import { SearchHeader } from "@/components/search/SearchHeader";

describe("SearchHeader", () => {
  const mockProps = {
    searchQuery: "",
    onSearchChange: jest.fn(),
    showFilters: false,
    onShowFiltersToggle: jest.fn(),
    filterCount: 0,
    searching: false,
  };

  it("renders search input", () => {
    render(<SearchHeader {...mockProps} />);

    expect(
      screen.getByPlaceholderText(/Search by name, username/)
    ).toBeInTheDocument();
  });

  it("calls onSearchChange when input changes", async () => {
    const user = userEvent.setup();
    render(<SearchHeader {...mockProps} />);

    const input = screen.getByPlaceholderText(/Search by name, username/);
    await user.type(input, "react");

    expect(mockProps.onSearchChange).toHaveBeenCalled();
  });

  it("displays filters button", () => {
    render(<SearchHeader {...mockProps} />);

    expect(screen.getByRole("button", { name: /Filters/ })).toBeInTheDocument();
  });

  it("shows filter count when present", () => {
    render(<SearchHeader {...mockProps} filterCount={3} />);

    expect(screen.getByText(/Filters \(3\)/)).toBeInTheDocument();
  });

  it("calls onShowFiltersToggle when filters button clicked", async () => {
    const user = userEvent.setup();
    render(<SearchHeader {...mockProps} />);

    await user.click(screen.getByRole("button", { name: /Filters/ }));
    expect(mockProps.onShowFiltersToggle).toHaveBeenCalled();
  });

  it("shows loading spinner when searching", () => {
    const { container } = render(
      <SearchHeader {...mockProps} searching={true} />
    );

    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});
