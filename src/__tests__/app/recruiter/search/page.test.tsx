import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecruiterSearchPage from "@/app/recruiter/search/page";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { getVerificationRoute } from "@/lib/config";

jest.mock("@/hooks/useAuth");
jest.mock("@/hooks/useUserProfile");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock useRecruiterSearch hook with configurable values
const mockUseRecruiterSearch = jest.fn();
jest.mock("@/hooks/useRecruiterSearch", () => ({
  useRecruiterSearch: (filters: any) => mockUseRecruiterSearch(filters),
}));

// Mock SearchInterface component
jest.mock("@/components/recruiter/SearchInterface", () => ({
  SearchInterface: ({ onSearch, results, isLoading, error }: any) => (
    <div data-testid="search-interface">
      <button onClick={() => onSearch({ query: "test" })}>
        Basic Search Button
      </button>
      {isLoading && <div>Loading results...</div>}
      {error && (
        <div>Error: {typeof error === "string" ? error : error.message}</div>
      )}
      {results.map((r: any) => (
        <div key={r.id}>{r.name}</div>
      ))}
    </div>
  ),
}));

// Mock SmartSearch component (AI Search)
jest.mock("@/components/search/SmartSearch", () => ({
  SmartSearch: () => <div data-testid="smart-search">AI Search Component</div>,
}));

describe("RecruiterSearchPage", () => {
  const mockRouter = { replace: jest.fn() };
  const VERIFICATION_ROUTE = getVerificationRoute();

  beforeEach(() => {
    (useUserProfile as jest.Mock).mockReturnValue({
      role: "recruiter",
      tier: "premium",
      loading: false,
    });
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    // Default: no active search, return empty results
    mockUseRecruiterSearch.mockReturnValue({
      results: [],
      count: 0,
      loading: false,
      error: null,
    });
  });

  it("should show loading state initially", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: true });
    render(<RecruiterSearchPage />);
    expect(screen.getByText("Preparing recruiter search…")).toBeInTheDocument();
  });

  it("should redirect if not authenticated", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: false });
    render(<RecruiterSearchPage />);
    expect(screen.getByText("Redirecting to sign in…")).toBeInTheDocument();
    expect(mockRouter.replace).toHaveBeenCalledWith(VERIFICATION_ROUTE);
  });

  it("should render AI search by default when authenticated with Premium tier", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "123" },
      loading: false,
    });
    (useUserProfile as jest.Mock).mockReturnValue({
      role: "recruiter",
      tier: "premium",
      loading: false,
    });
    render(<RecruiterSearchPage />);
    expect(screen.getByText("Candidate Search")).toBeInTheDocument();
    expect(screen.getByTestId("smart-search")).toBeInTheDocument();
  });

  it("should disable AI search for Basic tier users", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "123" },
      loading: false,
    });
    (useUserProfile as jest.Mock).mockReturnValue({
      role: "recruiter",
      tier: "basic",
      loading: false,
    });
    render(<RecruiterSearchPage />);

    expect(screen.getByText("Candidate Search")).toBeInTheDocument();
    expect(screen.getByText("Unlock AI-Powered Search")).toBeInTheDocument();
    expect(screen.getByText("Upgrade Now")).toBeInTheDocument();

    // AI Search button should be disabled
    const aiSearchButton = screen.getByText("AI Search").closest("button");
    expect(aiSearchButton).toBeDisabled();
  });

  it("should switch to basic search mode when button clicked", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "123" },
      loading: false,
    });
    render(<RecruiterSearchPage />);

    // Click Basic Search tab
    fireEvent.click(screen.getByText("Basic Search"));

    expect(screen.getByTestId("search-interface")).toBeInTheDocument();
  });

  it("should handle basic search successfully", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "123" },
      loading: false,
    });

    // Track state changes through the mock
    let hasSearched = false;
    mockUseRecruiterSearch.mockImplementation((filters: any) => {
      if (filters?.query) {
        hasSearched = true;
      }
      if (hasSearched) {
        return {
          results: [{ id: "1", name: "Candidate 1" }],
          count: 1,
          loading: false,
          error: null,
        };
      }
      return {
        results: [],
        count: 0,
        loading: filters?.query ? true : false,
        error: null,
      };
    });

    render(<RecruiterSearchPage />);

    // Switch to basic search mode first
    fireEvent.click(screen.getByText("Basic Search"));

    // Trigger search
    fireEvent.click(screen.getByText("Basic Search Button"));

    await waitFor(() => {
      expect(screen.getByText("Candidate 1")).toBeInTheDocument();
    });
  });

  it("should handle basic search error", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "123" },
      loading: false,
    });

    // Mock to return error when a query is made
    mockUseRecruiterSearch.mockImplementation((filters: any) => {
      if (filters?.query) {
        return {
          results: [],
          count: 0,
          loading: false,
          error: "Search failed",
        };
      }
      return {
        results: [],
        count: 0,
        loading: false,
        error: null,
      };
    });

    render(<RecruiterSearchPage />);

    // Switch to basic search mode first
    fireEvent.click(screen.getByText("Basic Search"));

    fireEvent.click(screen.getByText("Basic Search Button"));

    await waitFor(() => {
      expect(screen.getByText("Error: Search failed")).toBeInTheDocument();
    });
  });
});
