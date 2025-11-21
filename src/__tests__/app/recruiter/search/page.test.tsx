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
      <button onClick={() => onSearch({ query: "test" })}>Search</button>
      {isLoading && <div>Loading results...</div>}
      {error && <div>Error: {error}</div>}
      {results.map((r: any) => (
        <div key={r.id}>{r.name}</div>
      ))}
    </div>
  ),
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
    expect(mockRouter.replace).toHaveBeenCalledWith("/auth/sign-in");
  });

  it("should render search interface when authenticated", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "123" },
      loading: false,
    });
    render(<RecruiterSearchPage />);
    expect(screen.getByText("Candidate Search")).toBeInTheDocument();
    expect(screen.getByTestId("search-interface")).toBeInTheDocument();
  });

  it("should handle search successfully", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "123" },
      loading: false,
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: "1", name: "Candidate 1" }] }),
    });

    render(<RecruiterSearchPage />);

    fireEvent.click(screen.getByText("Search"));

    expect(screen.getByText("Loading results...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Candidate 1")).toBeInTheDocument();
    });
  });

  it("should handle search error", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "123" },
      loading: false,
    });
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Search failed"));

    render(<RecruiterSearchPage />);

    fireEvent.click(screen.getByText("Search"));

    await waitFor(() => {
      expect(screen.getByText("Error: Search failed")).toBeInTheDocument();
    });
  });
});
