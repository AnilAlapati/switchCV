import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecruiterSearchPage from "@/app/recruiter/search/page";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useTier } from "@/hooks/useTier";
import { useRouter } from "next/navigation";

jest.mock("@/hooks/useAuth");
jest.mock("@/hooks/useUserProfile");
jest.mock("@/hooks/useTier");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => ({ get: jest.fn(() => null) })),
}));

// Mock RequestAccessDialog to avoid complexity
jest.mock("@/components/RequestAccessDialog", () => ({
  RequestAccessDialog: () => <div data-testid="request-dialog" />,
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

describe("RecruiterSearchPage", () => {
  const mockRouter = { replace: jest.fn(), push: jest.fn() };

  beforeEach(() => {
    (useUserProfile as jest.Mock).mockReturnValue({
      role: "recruiter",
      loading: false,
    });
    (useTier as jest.Mock).mockReturnValue({
      isPremiumOrHigher: true,
      loading: false,
    });
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "test-user-id", getIdToken: jest.fn().mockResolvedValue("test-token") },
      loading: false,
    });
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  it("should show loading spinner when loading", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: true });
    (useUserProfile as jest.Mock).mockReturnValue({ role: null, loading: true });
    const { container } = render(<RecruiterSearchPage />);
    // Loading state renders an animated spinner
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("should redirect to /login if not authenticated", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: false });
    (useUserProfile as jest.Mock).mockReturnValue({ role: null, loading: false });
    render(<RecruiterSearchPage />);
    expect(mockRouter.replace).toHaveBeenCalledWith("/login");
  });

  it("should render main search UI when authenticated as recruiter", () => {
    render(<RecruiterSearchPage />);
    // The page h1 is always rendered when not loading
    expect(screen.getByRole("heading", { name: /Recruiter Search/i })).toBeInTheDocument();
  });

  it("should show Agent Search option in search UI", () => {
    render(<RecruiterSearchPage />);
    // SearchModeSelector renders Agent Search tab
    expect(screen.getAllByText(/Agent Search/i)[0]).toBeInTheDocument();
  });

  it("should show Upgrade Now when user is on Basic tier", () => {
    (useTier as jest.Mock).mockReturnValue({
      isPremiumOrHigher: false,
      loading: false,
    });
    render(<RecruiterSearchPage />);
    expect(screen.getByText(/Upgrade Now/i)).toBeInTheDocument();
  });

  it("should show Basic Lookup option in search mode selector", () => {
    render(<RecruiterSearchPage />);
    expect(screen.getByText(/Basic Lookup/i)).toBeInTheDocument();
  });

  it("should handle basic search error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Search failed" }),
    });

    render(<RecruiterSearchPage />);

    // Switch to basic lookup mode
    fireEvent.click(screen.getByText("Basic Lookup"));

    // Find the search input in basic lookup mode
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "candidate-123" } });

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(screen.getByText(/Search failed/i)).toBeInTheDocument();
    });
  });
});
