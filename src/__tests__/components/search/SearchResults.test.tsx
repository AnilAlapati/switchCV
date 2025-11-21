import React from "react";
import { render, screen } from "@testing-library/react";
import { SearchResults } from "@/components/search/SearchResults";
import { ProfileSearchResult } from "@/types/profileSearch";

// Mock ProfileSummaryCard to avoid testing it again
jest.mock("@/components/ProfileSummaryCard", () => ({
  ProfileSummaryCard: ({ profile }: { profile: ProfileSearchResult }) => (
    <div data-testid="profile-card">{profile.displayName}</div>
  ),
}));

describe("SearchResults", () => {
  const mockResults: ProfileSearchResult[] = [
    {
      userId: "1",
      username: "user1",
      displayName: "User One",
      bio: "Bio 1",
      hasApproval: false,
    },
    {
      userId: "2",
      username: "user2",
      displayName: "User Two",
      bio: "Bio 2",
      hasApproval: true,
    },
  ];

  it("renders error message", () => {
    render(
      <SearchResults
        results={[]}
        searching={false}
        error="Something went wrong"
        searchQuery=""
        filterCount={0}
        totalResults={0}
      />
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders results correctly", () => {
    render(
      <SearchResults
        results={mockResults}
        searching={false}
        error={null}
        searchQuery="user"
        filterCount={0}
        totalResults={10}
      />
    );

    expect(screen.getByText("Found 2 profiles of 10 total")).toBeInTheDocument();
    expect(screen.getAllByTestId("profile-card")).toHaveLength(2);
    expect(screen.getByText("User One")).toBeInTheDocument();
    expect(screen.getByText("User Two")).toBeInTheDocument();
  });

  it("renders singular 'profile' for 1 result", () => {
    render(
      <SearchResults
        results={[mockResults[0]]}
        searching={false}
        error={null}
        searchQuery="user"
        filterCount={0}
        totalResults={1}
      />
    );
    expect(screen.getByText("Found 1 profile of 1 total")).toBeInTheDocument();
  });

  it("renders no results message when search yields nothing", () => {
    render(
      <SearchResults
        results={[]}
        searching={false}
        error={null}
        searchQuery="nonexistent"
        filterCount={0}
        totalResults={0}
      />
    );
    expect(
      screen.getByText(
        "No profiles found. Try different search terms or filters."
      )
    ).toBeInTheDocument();
  });

  it("renders no results message when filters yield nothing", () => {
    render(
      <SearchResults
        results={[]}
        searching={false}
        error={null}
        searchQuery=""
        filterCount={1}
        totalResults={0}
      />
    );
    expect(
      screen.getByText(
        "No profiles found. Try different search terms or filters."
      )
    ).toBeInTheDocument();
  });

  it("renders initial state message", () => {
    render(
      <SearchResults
        results={[]}
        searching={false}
        error={null}
        searchQuery=""
        filterCount={0}
        totalResults={0}
      />
    );
    expect(
      screen.getByText("Start typing or use filters to search for professionals")
    ).toBeInTheDocument();
  });

  it("renders nothing when searching and no results yet", () => {
    const { container } = render(
      <SearchResults
        results={[]}
        searching={true}
        error={null}
        searchQuery="searching..."
        filterCount={0}
        totalResults={0}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
