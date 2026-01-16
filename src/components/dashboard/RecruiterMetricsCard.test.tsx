import { render, screen, waitFor } from "@testing-library/react";
import { RecruiterMetricsCard } from "./RecruiterMetricsCard";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

// Mock the useAuth hook
jest.mock("@/hooks/useAuth");
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
  },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Create a proper mock user that matches Firebase User type
const createMockUser = (uid: string) => ({
  uid,
  email: "test@example.com",
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: "2024-01-01T00:00:00Z",
    lastSignInTime: "2024-01-01T00:00:00Z",
  },
  providerData: [],
  refreshToken: "mock-token",
  tenantId: null,
  delete: jest.fn(),
  getIdToken: jest.fn(),
  getIdTokenResult: jest.fn(),
  reload: jest.fn(),
  toJSON: jest.fn(),
  displayName: "Test User",
  phoneNumber: null,
  photoURL: null,
  providerId: "firebase",
});

// Create mock auth context
const createMockAuthContext = (user: { uid?: string; email?: string }) => ({
  user,
  loading: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  logout: jest.fn(),
  needsEmailVerification: false,
  verificationEmail: null,
  connectivityIssue: null,
  signInWithGoogle: jest.fn(),
  resetPassword: jest.fn(),
  updatePassword: jest.fn(),
  updateEmail: jest.fn(),
  deleteAccount: jest.fn(),
  resendVerificationEmail: jest.fn(),
  refreshUser: jest.fn(),
  needsUsername: false,
  setUsername: jest.fn(),
  checkNeedsUsername: jest.fn(),
});

describe("RecruiterMetricsCard", () => {
  const mockUser = createMockUser("test-user-id");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return null when user is not a recruiter", () => {
    mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

    const { container } = render(<RecruiterMetricsCard isRecruiter={false} />);

    expect(container.firstChild).toBeNull();
  });

  it("should show loading state initially when user is recruiter", () => {
    mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

    render(<RecruiterMetricsCard isRecruiter={true} />);

    // Should show skeleton loading elements with animate-pulse class
    const skeletonElements = document.querySelectorAll(
      '[class*="animate-pulse"]'
    );
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it("should fetch and display metrics successfully", async () => {
    const mockMetrics = {
      totalSearches: 42,
      totalProfileViews: 156,
      accessRequests: {
        pending: 3,
        approved: 12,
        denied: 2,
      },
      totalCandidatesInteracted: 89,
      lastActivityAt: "2024-11-18T10:30:00Z",
    };

    mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics,
    });

    render(<RecruiterMetricsCard isRecruiter={true} />);

    // Wait for loading to complete and data to be displayed
    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // Check all metrics are displayed
    expect(screen.getByText("42")).toBeInTheDocument(); // totalSearches
    expect(screen.getByText("156")).toBeInTheDocument(); // totalProfileViews
    expect(screen.getByText("3")).toBeInTheDocument(); // pending requests
    expect(screen.getByText("12")).toBeInTheDocument(); // approved requests
    expect(screen.getByText("2")).toBeInTheDocument(); // denied requests
    expect(screen.getByText("89")).toBeInTheDocument(); // candidates interacted

    // Check labels are present
    expect(screen.getByText("Searches Conducted")).toBeInTheDocument();
    expect(screen.getByText("Profile Views Requested")).toBeInTheDocument();
    expect(screen.getByText("Access Requests")).toBeInTheDocument();
    expect(screen.getByText("Candidates Interacted")).toBeInTheDocument();
    expect(screen.getByText("Last Activity")).toBeInTheDocument();

    // Check API was called correctly
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/recruiter/metrics?userId=${mockUser.uid}`,
      expect.objectContaining({
        signal: expect.any(Object),
      })
    );
  });

  it("should display default values when metrics are null", async () => {
    const mockMetrics = {
      totalSearches: null,
      totalProfileViews: null,
      accessRequests: {
        pending: null,
        approved: null,
        denied: null,
      },
      totalCandidatesInteracted: null,
      lastActivityAt: null,
    };

    mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics,
    });

    render(<RecruiterMetricsCard isRecruiter={true} />);

    await waitFor(() => {
      expect(screen.getByText("Searches Conducted")).toBeInTheDocument();
    });

    // Should show 0 for all numeric values - check specific elements
    expect(
      screen.getByText("0", { selector: 'p[class*="text-amber-400"]' })
    ).toBeInTheDocument(); // totalSearches
    expect(
      screen.getByText("0", { selector: 'p[class*="text-cyan-400"]' })
    ).toBeInTheDocument(); // totalProfileViews
    expect(
      screen.getByText("0", { selector: 'p[class*="text-yellow-400"]' })
    ).toBeInTheDocument(); // pending
    expect(
      screen.getByText("0", { selector: 'p[class*="text-green-400"]' })
    ).toBeInTheDocument(); // approved
    expect(
      screen.getByText("0", { selector: 'p[class*="text-red-400"]' })
    ).toBeInTheDocument(); // denied
    expect(
      screen.getByText("0", { selector: 'p[class*="text-purple-400"]' })
    ).toBeInTheDocument(); // candidates
  });

  it("should handle fetch error gracefully", async () => {
    mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<RecruiterMetricsCard isRecruiter={true} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        "Failed to fetch recruiter metrics:"
      );
    });

    // Component should still render with default values
    expect(screen.getByText("Recruiter Activity")).toBeInTheDocument();
  });

  it("should handle non-ok response gracefully", async () => {
    mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<RecruiterMetricsCard isRecruiter={true} />);

    // Wait for loading to complete - should show default values (0s)
    await waitFor(() => {
      expect(screen.getByText("Recruiter Activity")).toBeInTheDocument();
    });

    // Component should still render with default values
    expect(screen.getByText("Searches Conducted")).toBeInTheDocument();
    expect(
      screen.getByText("0", { selector: 'p[class*="text-amber-400"]' })
    ).toBeInTheDocument();
  });

  it("should not fetch metrics when user is not available", () => {
    mockUseAuth.mockReturnValue(createMockAuthContext(null));

    render(<RecruiterMetricsCard isRecruiter={true} />);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should format last activity date correctly", async () => {
    const mockMetrics = {
      totalSearches: 1,
      totalProfileViews: 1,
      accessRequests: {
        pending: 0,
        approved: 0,
        denied: 0,
      },
      totalCandidatesInteracted: 1,
      lastActivityAt: "2024-11-18T14:30:00Z", // 2:30 PM UTC
    };

    mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics,
    });

    render(<RecruiterMetricsCard isRecruiter={true} />);

    await waitFor(() => {
      expect(screen.getByText("Last Activity")).toBeInTheDocument();
    });

    // The date should be formatted - exact format depends on locale
    // but should contain date/time information
    const lastActivityElement = screen.getByText(/Nov 18, 2024/);
    expect(lastActivityElement).toBeInTheDocument();
  });

  it("should not show last activity section when lastActivityAt is null", async () => {
    const mockMetrics = {
      totalSearches: 1,
      totalProfileViews: 1,
      accessRequests: {
        pending: 0,
        approved: 0,
        denied: 0,
      },
      totalCandidatesInteracted: 1,
      lastActivityAt: null,
    };

    mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics,
    });

    render(<RecruiterMetricsCard isRecruiter={true} />);

    await waitFor(() => {
      expect(screen.getByText("Recruiter Activity")).toBeInTheDocument();
    });

    // Should not show "Last Activity" section
    expect(screen.queryByText("Last Activity")).not.toBeInTheDocument();
  });

  it("should re-fetch metrics when user changes", async () => {
    const user1 = createMockUser("user1");
    const user2 = createMockUser("user2");

    mockUseAuth.mockReturnValue(createMockAuthContext(user1));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        totalSearches: 10,
        totalProfileViews: 5,
        accessRequests: {
          pending: 1,
          approved: 2,
          denied: 0,
        },
        totalCandidatesInteracted: 3,
        lastActivityAt: "2024-11-18T10:00:00Z",
      }),
    });

    const { rerender } = render(<RecruiterMetricsCard isRecruiter={true} />);

    await waitFor(() => {
      expect(screen.getByText("10")).toBeInTheDocument();
    });

    // Change user
    mockUseAuth.mockReturnValue(createMockAuthContext(user2));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        totalSearches: 20,
        totalProfileViews: 10,
        accessRequests: {
          pending: 2,
          approved: 4,
          denied: 1,
        },
        totalCandidatesInteracted: 6,
        lastActivityAt: "2024-11-18T11:00:00Z",
      }),
    });

    rerender(<RecruiterMetricsCard isRecruiter={true} />);

    await waitFor(() => {
      expect(screen.getByText("20")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
