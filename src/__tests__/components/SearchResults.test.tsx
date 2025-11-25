import React from "react";
import { render, screen } from "../__support__/testUtils";
import userEvent from "@testing-library/user-event";
import { SearchResults } from "@/components/recruiter/SearchResults";

describe("SearchResults", () => {
  const mockResults = [
    {
      userId: "u1",
      displayName: "John Doe",
      role: "Engineer",
      location: "NYC",
      skills: ["React", "TypeScript"],
      bio: "Experienced developer",
      hasApproval: false,
    },
    {
      userId: "u2",
      displayName: "Jane Smith",
      role: "Designer",
      location: "SF",
      skills: ["Figma"],
      bio: "Product designer",
      hasApproval: true,
    },
  ] as any;

  it("renders candidate cards with names and roles", () => {
    render(
      <SearchResults results={mockResults} isLoading={false} query="engineer" />
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Engineer")).toBeInTheDocument();
  });

  it("displays location information", () => {
    render(
      <SearchResults results={mockResults} isLoading={false} query="engineer" />
    );

    expect(screen.getByText("NYC")).toBeInTheDocument();
    expect(screen.getByText("SF")).toBeInTheDocument();
  });

  it("shows approval badge when approved", () => {
    render(
      <SearchResults results={mockResults} isLoading={false} query="engineer" />
    );

    expect(screen.getByText("Already Approved")).toBeInTheDocument();
  });

  it("displays skills as badges", () => {
    render(
      <SearchResults results={mockResults} isLoading={false} query="engineer" />
    );

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("calls onSelectCandidate when request button clicked", async () => {
    const user = userEvent.setup();
    const handle = jest.fn();

    render(
      <SearchResults
        results={mockResults}
        isLoading={false}
        query="engineer"
        onSelectCandidate={handle}
      />
    );

    const buttons = screen.getAllByRole("button", {
      name: /Request Contact Information/,
    });
    await user.click(buttons[0]);

    expect(handle).toHaveBeenCalledWith("u1", mockResults[0]);
  });

  it("renders empty state when no results", () => {
    render(<SearchResults results={[]} isLoading={false} query="xyz" />);

    expect(screen.getByText(/No candidates found/i)).toBeInTheDocument();
  });
});
