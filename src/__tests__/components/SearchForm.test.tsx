import React from "react";
import { render, screen } from "../__support__/testUtils";
import userEvent from "@testing-library/user-event";
import { SearchForm } from "@/components/recruiter/SearchForm";

describe("SearchForm", () => {
  const mockHandlers = {
    onQueryChange: jest.fn(),
    onLocationChange: jest.fn(),
    onSkillToggle: jest.fn(),
    onTargetRoleChange: jest.fn(),
    onSortChange: jest.fn(),
    onFiltersToggle: jest.fn(),
    onSearch: jest.fn(),
  };

  const defaultProps = {
    query: "",
    location: "",
    selectedSkills: [],
    targetRole: "",
    sortBy: "relevance" as const,
    showFilters: false,
    isLoading: false,
    ...mockHandlers,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders search input and buttons", () => {
    render(<SearchForm {...defaultProps} />);
    expect(
      screen.getByPlaceholderText(/Search by name, username/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Filters/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Search/ })).toBeInTheDocument();
  });

  it("calls onQueryChange when input changes", async () => {
    const user = userEvent.setup();
    render(<SearchForm {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Search by name, username/);
    await user.type(input, "react");
    expect(mockHandlers.onQueryChange).toHaveBeenCalled();
  });

  it("calls onFiltersToggle when filters button is clicked", async () => {
    const user = userEvent.setup();
    render(<SearchForm {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /Filters/ }));
    expect(mockHandlers.onFiltersToggle).toHaveBeenCalled();
  });

  it("calls onSearch when form is submitted", async () => {
    const user = userEvent.setup();
    render(<SearchForm {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /Search/ }));
    expect(mockHandlers.onSearch).toHaveBeenCalled();
  });

  it("disables search button when loading", () => {
    render(<SearchForm {...defaultProps} isLoading={true} />);
    const btn = screen.getByRole("button", { name: /Searching/ });
    expect(btn).toBeDisabled();
  });
});
