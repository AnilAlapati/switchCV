import React from "react";
import { render, screen, waitFor } from "../__support__/testUtils";
import userEvent from "@testing-library/user-event";
import { SearchInterface } from "@/components/recruiter/SearchInterface";

jest.mock("@/components/recruiter/SearchForm", () => ({
  SearchForm: ({ onSearch }: any) => (
    <button onClick={(e: any) => onSearch(e)}>Search</button>
  ),
}));

jest.mock("@/components/recruiter/SearchResults", () => ({
  SearchResults: ({ results }: any) => (
    <div data-testid="results">{results.length} results</div>
  ),
}));

describe("SearchInterface", () => {
  const mockResults = [
    { userId: "u1", name: "John", email: "john@example.com" },
  ] as any;

  it("renders search form and results", () => {
    render(
      <SearchInterface
        onSearch={jest.fn()}
        results={mockResults}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByRole("button", { name: /Search/ })).toBeInTheDocument();
    expect(screen.getByTestId("results")).toBeInTheDocument();
  });

  it("displays error message when present", () => {
    render(
      <SearchInterface
        onSearch={jest.fn()}
        results={[]}
        isLoading={false}
        error="Search failed"
      />
    );

    expect(screen.getByText("Search failed")).toBeInTheDocument();
  });

  it("calls onSearch when form is submitted", async () => {
    const user = userEvent.setup();
    const handle = jest.fn();

    render(
      <SearchInterface
        onSearch={handle}
        results={[]}
        isLoading={false}
        error={null}
      />
    );

    await user.click(screen.getByRole("button", { name: /Search/ }));

    await waitFor(() => {
      expect(handle).toHaveBeenCalled();
    });
  });

  it("displays result count", () => {
    render(
      <SearchInterface
        onSearch={jest.fn()}
        results={mockResults}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText("1 results")).toBeInTheDocument();
  });
});
