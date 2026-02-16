import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecruiterSearchPage from "@/app/recruiter/search/page";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useTier } from "@/hooks/useTier";
import { useRouter } from "next/navigation";
import { getVerificationRoute } from "@/lib/config";

jest.mock("@/hooks/useAuth");
jest.mock("@/hooks/useUserProfile");
jest.mock("@/hooks/useTier");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock RequestAccessDialog to avoid complexity
jest.mock("@/components/RequestAccessDialog", () => ({
  RequestAccessDialog: () => <div data-testid="request-dialog" />,
}));

describe("RecruiterSearchPage", () => {
  const mockRouter = { replace: jest.fn() };
  const VERIFICATION_ROUTE = getVerificationRoute();

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

  it("should show loading state initially", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: true });
    render(<RecruiterSearchPage />);
    expect(screen.getByText("Preparing search command center…")).toBeInTheDocument();
  });

  it("should redirect if not authenticated", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: false });
    render(<RecruiterSearchPage />);
    expect(screen.getByText("Redirecting to sign in…")).toBeInTheDocument();
    expect(mockRouter.replace).toHaveBeenCalledWith(VERIFICATION_ROUTE);
  });

  it("should render Search by default when authenticated with Premium tier", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "123", getIdToken: jest.fn().mockResolvedValue("token") },
      loading: false,
    });
    render(<RecruiterSearchPage />);
    expect(screen.getByText("Talent Search")).toBeInTheDocument();
    expect(screen.getByText("Describe Your Ideal Candidate")).toBeInTheDocument();
  });

  it("should disable AI search (Agent Search) for Basic tier users", () => {
    (useTier as jest.Mock).mockReturnValue({
      isPremiumOrHigher: false,
      loading: false,
    });
    render(<RecruiterSearchPage />);

    expect(screen.getByText("Talent Search")).toBeInTheDocument();

    // Agent Search tab should still be visible but labeled with "Upgrade Now" if not enabled
    // Looking at SearchModeSelector.tsx, it shows a lock and "Upgrade Now"
    expect(screen.getByText("Upgrade Now")).toBeInTheDocument();
    expect(screen.getAllByText("Agent Search")[0]).toBeInTheDocument();
  });

  it("should switch to basic lookup mode when button clicked", async () => {
    render(<RecruiterSearchPage />);

    // Click Basic Lookup tab
    fireEvent.click(screen.getByText("Basic Lookup"));

    expect(screen.getByText("Resume ID")).toBeInTheDocument();
  });

  it("should handle basic lookup successfully", async () => {
    const mockResults = [
      {
        resumeId: "res-1",
        title: "Software Engineer",
        userName: "Candidate 1",
        userId: "user-1",
        createdAt: new Date().toISOString()
      }
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: mockResults }),
    });

    render(<RecruiterSearchPage />);

    // Switch to basic search mode first
    fireEvent.click(screen.getByText("Basic Lookup"));

    // Enter candidate ID
    fireEvent.change(screen.getByPlaceholderText("e.g., 2"), {
      target: { value: "candidate-123" },
    });

    // Trigger search
    fireEvent.click(screen.getByText("Search"));

    await waitFor(() => {
      expect(screen.getByText("Candidate 1")).toBeInTheDocument();
      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    });
  });

  it("should handle basic search error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Search failed" }),
    });

    render(<RecruiterSearchPage />);

    // Switch to basic search mode first
    fireEvent.click(screen.getByText("Basic Lookup"));

    // Enter candidate ID
    fireEvent.change(screen.getByPlaceholderText("e.g., 2"), {
      target: { value: "candidate-123" },
    });

    fireEvent.click(screen.getByText("Search"));

    await waitFor(() => {
      expect(screen.getByText("Search failed")).toBeInTheDocument();
    });
  });
});
