import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecruiterSearchPage from "@/app/recruiter/search/page";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

jest.mock("@/hooks/useAuth");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock SearchInterface component
jest.mock("@/components/recruiter/SearchInterface", () => ({
  SearchInterface: ({ onSearch, results, isLoading, error }: any) => (
    <div data-testid="search-interface">
      <button onClick={() => onSearch({ query: "test" })}>
        Basic Search Button
      </button>
      {isLoading && <div>Loading results...</div>}
      {error && <div>Error: {error}</div>}
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

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    global.fetch = jest.fn();
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
    expect(mockRouter.replace).toHaveBeenCalledWith("/auth?mode=verify-email");
  });

  it("should render AI search by default when authenticated", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "123" },
      loading: false,
    });
    render(<RecruiterSearchPage />);
    expect(screen.getByText("Candidate Search")).toBeInTheDocument();
    expect(screen.getByTestId("smart-search")).toBeInTheDocument();
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
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: "1", name: "Candidate 1" }] }),
    });

    render(<RecruiterSearchPage />);

    // Switch to basic search mode first
    fireEvent.click(screen.getByText("Basic Search"));

    fireEvent.click(screen.getByText("Basic Search Button"));

    expect(screen.getByText("Loading results...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Candidate 1")).toBeInTheDocument();
    });
  });

  it("should handle basic search error", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "123" },
      loading: false,
    });
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Search failed"));

    render(<RecruiterSearchPage />);

    // Switch to basic search mode first
    fireEvent.click(screen.getByText("Basic Search"));

    fireEvent.click(screen.getByText("Basic Search Button"));

    await waitFor(() => {
      expect(screen.getByText("Error: Search failed")).toBeInTheDocument();
    });
  });
});
